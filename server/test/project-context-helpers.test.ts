import { describe, it, expect } from 'vitest';
import { contextDocsFrom, contextFolderOf, demoteHeadings, packContext } from '../src/modules/_shared/project-context.js';

// SPEC-01 — the pure part of the Project Context Folder.
describe('contextFolderOf', () => {
  it('AC-1: takes the deepest specs/docs/insights directory on a Markdown path', () => {
    expect(contextFolderOf('specs/public-api.md')).toBe('specs');
    expect(contextFolderOf('server/docs/architecture.md')).toBe('docs');
    expect(contextFolderOf('docs/specs/x.md')).toBe('specs');
    expect(contextFolderOf('client/insights/INSIGHTS.md')).toBe('insights');
  });

  it('AC-1: leaves out non-Markdown, files outside those folders and node_modules', () => {
    expect(contextFolderOf('docs/diagram.png')).toBeNull();
    expect(contextFolderOf('README.md')).toBeNull();
    expect(contextFolderOf('server/src/specs.md')).toBeNull();
    expect(contextFolderOf('node_modules/pkg/docs/readme.md')).toBeNull();
  });
});

describe('contextDocsFrom', () => {
  it('AC-1: lists specs, then docs, then insights, with a bytes / 4 token estimate', () => {
    const docs = contextDocsFrom([
      { path: 'server/insights/INSIGHTS.md', bytes: 400 },
      { path: 'README.md', bytes: 100 },
      { path: 'docs/arch.md', bytes: 10 },
      { path: 'specs/a.md', bytes: 4001 },
    ]);
    expect(docs).toEqual([
      { path: 'specs/a.md', folder: 'specs', name: 'a.md', bytes: 4001, tokens: 1001 },
      { path: 'docs/arch.md', folder: 'docs', name: 'arch.md', bytes: 10, tokens: 3 },
      { path: 'server/insights/INSIGHTS.md', folder: 'insights', name: 'INSIGHTS.md', bytes: 400, tokens: 100 },
    ]);
  });
});

describe('packContext', () => {
  const doc = (path: string, chars: number) => ({ path, body: 'x'.repeat(chars) });

  it('AC-8: one block per document, in order, each starting with its path', () => {
    const packed = packContext([doc('specs/a.md', 10), doc('docs/b.md', 10)], 100);
    expect(packed.blocks.map((b) => b.split('\n')[0])).toEqual(['Source: specs/a.md', 'Source: docs/b.md']);
    expect(packed).toMatchObject({ read: ['specs/a.md', 'docs/b.md'], cut: null, skipped: [] });
  });

  it('AC-10/AC-11: cuts the document that crosses the budget with a marker and leaves out the rest', () => {
    // budget 50 tokens = 200 chars; the first block is 20 + 150 chars.
    const packed = packContext([doc('specs/a.md', 150), doc('specs/b.md', 150), doc('specs/c.md', 5)], 50);
    expect(packed.read).toEqual(['specs/a.md', 'specs/b.md']);
    expect(packed.cut).toBe('specs/b.md');
    expect(packed.skipped).toEqual(['specs/c.md']);
    expect(packed.blocks[1]).toMatch(/cut at the project-context budget\]$/);
    expect(packed.blocks.join('').length).toBeLessThan(200 + 60);
  });

  it('AC-10: a single document larger than the whole budget is cut on its own', () => {
    const packed = packContext([doc('docs/huge.md', 100_000)], 8000);
    expect(packed.cut).toBe('docs/huge.md');
    expect(packed.blocks[0]!.length).toBeLessThan(8000 * 4 + 60);
  });
});

describe('demoteHeadings', () => {
  it('AC-8: keeps document headings below the prompt\'s own ## sections, leaving code fences alone', () => {
    const doc = ['# Architecture', '## Modules', '###### Deep', 'text # not a heading', '```sh', '# a shell comment', '```', '## Data'].join('\n');
    expect(demoteHeadings(doc).split('\n')).toEqual([
      '### Architecture',
      '#### Modules',
      '###### Deep',
      'text # not a heading',
      '```sh',
      '# a shell comment',
      '```',
      '#### Data',
    ]);
  });

  it('AC-8: the packed block carries the demoted headings', () => {
    const packed = packContext([{ path: 'server/docs/architecture.md', body: '## Modules\nNo cross-module imports.' }]);
    expect(packed.blocks[0]).toBe('Source: server/docs/architecture.md\n\n#### Modules\nNo cross-module imports.');
  });
});
