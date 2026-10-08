/** Thin HTTP client for the DevDigest API. The MCP server never touches the DB. */

export const DEFAULT_API = "http://localhost:3001";
const REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class DevDigestApi {
  constructor(
    readonly base: string = process.env.DEVDIGEST_API ?? DEFAULT_API,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(this.base + path, {
        method,
        headers: body === undefined ? {} : { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ApiError(0, "unreachable", `DevDigest API is not reachable at ${this.base}. Start it with ./scripts/dev.sh.`);
    }
    const text = await res.text();
    const json = text ? safeJson(text) : null;
    if (res.ok) return json as T;
    // Domain errors use { error: { code, message } }; an unknown route is Fastify's
    // own { message: "Route GET:/x not found" }.
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
    if (err && typeof err === "object") {
      throw new ApiError(res.status, err.code ?? "error", err.message ?? res.statusText);
    }
    const message = (json as { message?: string } | null)?.message ?? res.statusText;
    throw new ApiError(res.status, /^Route \w+:/.test(message) ? "route_not_found" : "error", message);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 300) };
  }
}
