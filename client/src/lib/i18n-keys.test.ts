import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// A missing key does not fail typecheck or a component test (next-intl only logs
// it), so it reaches the browser as a raw key. This scans every literal
// t("…") call against the English messages.

const ROOT = process.cwd();
const messages: Record<string, unknown> = Object.fromEntries(
  readdirSync(join(ROOT, "messages/en"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(ROOT, "messages/en", f), "utf8"))]),
);

function hasKey(namespace: string, key: string): boolean {
  let node: unknown = messages[namespace];
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return true;
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return e.name === "vendor" ? [] : sources(path);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path] : [];
  });
}

describe("i18n keys", () => {
  it("every literal t(\"…\") key exists in messages/en", () => {
    const missing: string[] = [];
    for (const file of sources(join(ROOT, "src"))) {
      const src = readFileSync(file, "utf8");
      const scopes = new Map(
        [...src.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\("(\w+)"\)/g)].map((m) => [m[1]!, m[2]!]),
      );
      for (const [, fn, key] of src.matchAll(/\b(\w+)\(\s*"([\w.]+)"/g)) {
        const ns = scopes.get(fn!);
        if (ns && !hasKey(ns, key!)) missing.push(`${file.slice(ROOT.length + 1)}: ${ns}.${key}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
