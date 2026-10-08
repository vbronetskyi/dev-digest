import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApiError } from "../api.js";
import { ToolError } from "../resolve.js";

/** Compact JSON: every character of a tool result is paid for in context. */
export function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

/** Turn any failure into a message the model can act on instead of a stack trace. */
export function failFrom(err: unknown): CallToolResult {
  if (err instanceof ToolError) return fail(err.message);
  if (err instanceof ApiError) return fail(`DevDigest API error (${err.status} ${err.code}): ${err.message}`);
  return fail(`Unexpected error: ${(err as Error).message ?? String(err)}`);
}

export async function guarded(work: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await work();
  } catch (err) {
    return failFrom(err);
  }
}
