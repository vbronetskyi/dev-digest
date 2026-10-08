import { ExternalServiceError } from '../../platform/errors.js';

/**
 * Resolve or reject within `ms`. The SDK's own timeout stops at the response
 * headers, so a stalled model call would otherwise hold its caller for the OS
 * socket timeout (~15 min). This does not abort the underlying request — it may
 * still finish (and bill) in the background.
 */
export async function withDeadline<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ExternalServiceError(`${what} took longer than ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
