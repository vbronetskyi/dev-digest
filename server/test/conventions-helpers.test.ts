import { describe, it, expect } from 'vitest';
import {
  buildSkillBody,
  dedent,
  groundConventions,
  locateSnippet,
  pickOffered,
  ruleToSkillName,
  sumCosts,
  uniqueName,
} from '../src/modules/conventions/helpers.js';

const ROUTES = [
  "import { getContext } from '../_shared/context.js';",
  '',
  "app.get('/skills', async (req) => {",
  '  const { workspaceId } = await getContext(app.container, req);',
  '',
  '  return service.list(workspaceId);',
  '});',
].join('\n');

describe('locateSnippet', () => {
  it('finds a re-indented snippet across a skipped blank line', () => {
    const snippet = 'const { workspaceId } = await getContext(app.container, req);\nreturn service.list(workspaceId);';
    expect(locateSnippet(ROUTES, snippet)).toEqual({ start: 4, end: 6 });
  });

  it('rejects paraphrases, missing text and trivially short quotes', () => {
    expect(locateSnippet(ROUTES, 'const workspace = await getContext(req);')).toBeNull();
    expect(locateSnippet(ROUTES, '});')).toBeNull();
    expect(locateSnippet(ROUTES, '')).toBeNull();
  });
});

describe('groundConventions', () => {
  const files = new Map([['src/modules/skills/routes.ts', ROUTES]]);
  const quote = 'const { workspaceId } = await getContext(app.container, req);';

  it('keeps grounded rules with the file’s own lines and a line range', () => {
    const { kept, dropped } = groundConventions(
      [{ rule: 'Scope every handler with getContext', evidence_path: 'src/modules/skills/routes.ts', evidence_snippet: `    ${quote}`, confidence: 1.4 }],
      files,
    );
    expect(dropped).toBe(0);
    // Seen in one file only, so the model's 1.4 is cut to the single-file ceiling.
    expect(kept).toEqual([
      { rule: 'Scope every handler with getContext', evidencePath: 'src/modules/skills/routes.ts:4', evidenceSnippet: quote, confidence: 0.6 },
    ]);
  });

  it('caps confidence by how many sampled files show the rule', () => {
    const three = new Map([...files, ['src/a.ts', ''], ['src/b.ts', '']]);
    const cap = (also: string[]) =>
      groundConventions([{ rule: 'R', evidence_path: 'src/modules/skills/routes.ts', evidence_snippet: quote, also_seen_in: also, confidence: 0.95 }], three).kept[0]!.confidence;
    expect(cap([])).toBe(0.6);
    expect(cap(['src/a.ts', 'src/not-sampled.ts'])).toBe(0.8);
    expect(cap(['src/a.ts', 'src/b.ts'])).toBe(0.95);
  });

  it('drops unknown files, invented quotes and duplicate rules', () => {
    const { kept, dropped } = groundConventions(
      [
        { rule: 'Rule A', evidence_path: 'src/elsewhere.ts', evidence_snippet: quote, confidence: 0.9 },
        { rule: 'Rule B', evidence_path: 'src/modules/skills/routes.ts', evidence_snippet: 'await authorize(req, "admin");', confidence: 0.9 },
        { rule: 'Rule C', evidence_path: 'src/modules/skills/routes.ts:4', evidence_snippet: quote, confidence: 0.5 },
        { rule: 'rule c', evidence_path: 'src/modules/skills/routes.ts', evidence_snippet: quote, confidence: 0.4 },
      ],
      files,
    );
    expect(kept.map((k) => k.rule)).toEqual(['Rule C']);
    expect(dropped).toBe(3);
  });
});

describe('names, selection and bodies', () => {
  it('derives a skill name from the rule and suffixes it until free', () => {
    expect(ruleToSkillName('Always scope every DB query by workspace_id via getContext()')).toBe('scope-db-query-workspace-id');
    expect(ruleToSkillName('!!!')).toBe('convention');
    expect(uniqueName('scope-db', new Set(['scope-db', 'scope-db-2']))).toBe('scope-db-3');
  });

  it('keeps only offered paths, once, in the model’s order, two per folder', () => {
    expect(pickOffered(['b.ts', ' a.ts', 'evil/../x.ts', 'b.ts'], ['a.ts', 'b.ts'], 10, 2)).toEqual(['b.ts', 'a.ts']);
    const offered = ['db/a.ts', 'db/b.ts', 'db/c.ts', 'api/d.ts'];
    expect(pickOffered(offered, offered, 10, 2)).toEqual(['db/a.ts', 'db/b.ts', 'api/d.ts']);
    expect(pickOffered(offered, offered, 2, 2)).toEqual(['db/a.ts', 'db/b.ts']);
  });

  it('dedents and fences the example without breaking on backticks inside it', () => {
    expect(dedent(['    a', '      b', ''])).toBe('a\n  b\n');
    const body = buildSkillBody('Use getContext', 'src/x.ts:1-2', 'const t = ```x```;');
    expect(body).toContain('~~~\nconst t = ```x```;\n~~~');
    expect(body.startsWith('# Use getContext')).toBe(true);
  });

  it('reports cost only when every call reported one', () => {
    expect(sumCosts([0.001, 0.002])).toBeCloseTo(0.003);
    expect(sumCosts([0.001, null])).toBeNull();
  });
});
