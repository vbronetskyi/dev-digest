import { request, type RequestOptions } from 'node:https';
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { BlockList, isIP } from 'node:net';
import type { RemoteDocument, RemoteDocumentFetcher } from '@devdigest/shared';

/**
 * SSRF-safe HTTPS fetcher for user-supplied URLs.
 *
 * The address check runs inside `lookup`, i.e. at connect time on the exact IP the
 * socket will use, so a DNS answer cannot change between "check" and "connect".
 * IP-literal hosts never reach `lookup`, so they are checked up front. Every
 * redirect is re-validated, and one deadline covers the whole exchange including
 * reading the body.
 */

const BLOCKED = new BlockList();
const BLOCKED_V4: [string, number][] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
];
const BLOCKED_V6: [string, number][] = [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['2001:db8::', 32],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
];
for (const [net, prefix] of BLOCKED_V4) BLOCKED.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of BLOCKED_V6) BLOCKED.addSubnet(net, prefix, 'ipv6');

const MAX_REDIRECTS = 3;
const MAX_BYTES = 256 * 1024;
const DEADLINE_MS = 10_000;

/** IPv4 embedded as ::ffff:a.b.c.d or ::ffff:hhhh:hhhh, else null. */
function mappedIPv4(address: string): string | null {
  const lower = address.toLowerCase();
  if (!lower.startsWith('::ffff:')) return null;
  const rest = lower.slice('::ffff:'.length);
  if (isIP(rest) === 4) return rest;
  const m = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(rest);
  if (!m) return null;
  const hi = parseInt(m[1]!, 16);
  const lo = parseInt(m[2]!, 16);
  return [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff].join('.');
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !BLOCKED.check(address, 'ipv4');
  if (family === 6) {
    const v4 = mappedIPv4(address);
    return v4 ? isPublicAddress(v4) : !BLOCKED.check(address, 'ipv6');
  }
  return false;
}

/** Parse and vet a user URL: https, default port, no credentials, no private IP literal. */
export function vetUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('not a valid URL');
  }
  if (url.protocol !== 'https:') throw new Error('only https:// URLs are allowed');
  if (url.username || url.password) throw new Error('URLs with credentials are not allowed');
  if (url.port && url.port !== '443') throw new Error('only the default HTTPS port is allowed');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && !isPublicAddress(host)) throw new Error(`refusing non-public address ${host}`);
  return url;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

function safeLookup(hostname: string, options: { all?: boolean }, callback: LookupCallback): void {
  dnsLookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err, '');
    const blocked = addresses.find((a) => !isPublicAddress(a.address));
    if (blocked || addresses.length === 0) {
      const e: NodeJS.ErrnoException = new Error(
        `refusing to connect: ${hostname} resolves to non-public address ${blocked?.address ?? '(none)'}`,
      );
      e.code = 'EBLOCKEDADDRESS';
      return callback(e, '');
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0]!.address, addresses[0]!.family);
  });
}

type Hop = { kind: 'redirect'; location: string } | { kind: 'body'; text: string };

function getOnce(url: URL, deadline: number): Promise<Hop> {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new Error('timed out'));
    const options: RequestOptions = {
      method: 'GET',
      hostname: url.hostname.replace(/^\[|\]$/g, ''),
      path: `${url.pathname}${url.search}`,
      headers: { 'user-agent': 'DevDigest-skill-import', accept: 'text/plain, text/markdown;q=0.9' },
      lookup: safeLookup as RequestOptions['lookup'],
    };
    const req = request(options, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        return resolve({ kind: 'redirect', location: res.headers.location });
      }
      if (status !== 200) {
        res.resume();
        return reject(new Error(`the server answered HTTP ${status}`));
      }
      const type = String(res.headers['content-type'] ?? '');
      if (!type.startsWith('text/')) {
        res.resume();
        return reject(new Error(`expected a text document, got "${type || 'no content type'}"`));
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          req.destroy(new Error(`document is larger than ${MAX_BYTES / 1024} KB`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({ kind: 'body', text: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    const timer = setTimeout(() => req.destroy(new Error('timed out')), remaining);
    req.on('error', reject);
    req.on('close', () => clearTimeout(timer));
    req.end();
  });
}

export class SafeHttpsFetcher implements RemoteDocumentFetcher {
  async fetchText(raw: string): Promise<RemoteDocument> {
    const deadline = Date.now() + DEADLINE_MS;
    let url = vetUrl(raw);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const result = await getOnce(url, deadline);
      if (result.kind === 'body') return { url: url.toString(), text: result.text };
      url = vetUrl(new URL(result.location, url).toString());
    }
    throw new Error('too many redirects');
  }
}
