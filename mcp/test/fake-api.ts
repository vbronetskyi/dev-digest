import { DevDigestApi } from "../src/api.js";

type Handler = (body: unknown) => { status?: number; json: unknown };

/** A DevDigestApi over an in-memory route table; records every call. */
export function fakeApi(routes: Record<string, Handler | unknown>) {
  const calls: string[] = [];
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    const path = String(url).replace("http://api.test", "");
    const key = `${init?.method ?? "GET"} ${path}`;
    calls.push(key);
    const route = routes[key];
    if (route === undefined) {
      return new Response(JSON.stringify({ message: `Route ${key.replace(" ", ":")} not found`, statusCode: 404 }), { status: 404 });
    }
    const out = typeof route === "function" ? (route as Handler)(init?.body ? JSON.parse(String(init.body)) : undefined) : { json: route };
    return new Response(JSON.stringify(out.json), { status: out.status ?? 200 });
  }) as typeof fetch;
  return { api: new DevDigestApi("http://api.test", fetchImpl), calls };
}
