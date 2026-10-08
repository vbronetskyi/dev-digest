import { describe, it, expect } from 'vitest';
import { normalizeEndpoint, summarize, touchedBaseLines, touchedSymbols } from '../src/modules/blast/helpers.js';

describe('touchedBaseLines', () => {
  it('maps removals to their old line and insertions to the line they follow', () => {
    const patch = [
      '@@ -10,4 +10,5 @@ export function a() {',
      '   const x = 1;', // old 10
      '-  const y = 2;', // old 11 removed
      '+  const y = 3;', // inserted after old 11 → 11
      '+  const z = 4;',
      '   return x;', // old 12
      ' }', // old 13
      '@@ -40,2 +41,3 @@',
      ' a', // old 40
      '+b', // after 40
      ' c', // old 41
      '\\ No newline at end of file',
    ].join('\n');
    expect(touchedBaseLines(patch)).toEqual([11, 40]);
  });

  it('handles a hunk at the top of the file and single-line hunk headers', () => {
    expect(touchedBaseLines('@@ -1 +1,2 @@\n+// header\n line')).toEqual([1]);
    expect(touchedBaseLines('')).toEqual([]);
  });
});

describe('touchedSymbols', () => {
  const symbols = [
    { file: 'a.ts', name: 'early', kind: 'function', line: 1, endLine: 9 },
    { file: 'a.ts', name: 'hit', kind: 'function', line: 10, endLine: 20 },
    { file: 'a.ts', name: 'noRange', kind: 'const', line: null, endLine: null },
    { file: 'b.ts', name: 'elsewhere', kind: 'function', line: 1, endLine: 50 },
  ];

  it('keeps symbols whose range contains a touched line, and range-less symbols of touched files', () => {
    const picked = touchedSymbols(symbols, new Map([['a.ts', [11]]]));
    expect(picked.map((s) => s.name)).toEqual(['hit', 'noRange']);
  });

  it('a one-line symbol is touched only on its own line', () => {
    const one = [{ file: 'a.ts', name: 'k', kind: 'const', line: 5, endLine: null }];
    expect(touchedSymbols(one, new Map([['a.ts', [5]]]))).toHaveLength(1);
    expect(touchedSymbols(one, new Map([['a.ts', [6]]]))).toHaveLength(0);
  });
});

describe('summarize', () => {
  it('counts distinct endpoints and crons, and says when nothing indexed is touched', () => {
    expect(
      summarize(2, [
        { symbol: 'a', callers: [{ name: 'x', file: 'f', line: 1 }], endpoints_affected: ['GET /a', 'GET /b'], crons_affected: [] },
        { symbol: 'b', callers: [], endpoints_affected: ['GET /a'], crons_affected: ['nightly'] },
      ]),
    ).toBe('2 symbols changed → 1 caller, 2 endpoints, 1 cron');
    expect(summarize(0, [])).toMatch(/No indexed symbol/);
  });
});

describe('normalizeEndpoint', () => {
  it('turns template placeholders into path parameters', () => {
    expect(normalizeEndpoint('POST /findings/:id/${action}')).toBe('POST /findings/:id/:action');
    expect(normalizeEndpoint('GET /a/${ id }/b')).toBe('GET /a/:id/b');
    expect(normalizeEndpoint('GET /plain')).toBe('GET /plain');
  });
});
