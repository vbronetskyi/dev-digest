import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitClient, parseLsTree } from '../src/adapters/git/simple-git.js';

// SPEC-01 AC-1, AC-2, AC-16: context documents come from the committed tree of the clone.
describe('SimpleGitClient.listFiles', () => {
  let root: string;
  const repo = { owner: 'acme', name: 'api' };

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'devdigest-ls-'));
    const dir = join(root, 'acme', 'api');
    await mkdir(join(dir, 'specs'), { recursive: true });
    await mkdir(join(dir, 'node_modules', 'x'), { recursive: true });
    await writeFile(join(dir, 'specs', 'public api.md'), '# Public API\n');
    await writeFile(join(dir, 'README.md'), 'hello');
    await writeFile(join(dir, '.gitignore'), 'node_modules/\n');
    await writeFile(join(dir, 'node_modules', 'x', 'docs.md'), 'ignored');
    await writeFile(join(root, 'secret.txt'), 'outside the repo');
    await symlink(join(root, 'secret.txt'), join(dir, 'specs', 'link.md'));
    const git = simpleGit(dir);
    await git.init();
    await git.add('.');
    await git.raw(['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-m', 'init']);
    // Present on disk but never committed: not part of the tree.
    await writeFile(join(dir, 'specs', 'draft.md'), 'not committed');
    // Edited in the working tree after the commit: reads must still see the commit.
    await writeFile(join(dir, 'specs', 'public api.md'), '# Edited, not committed\n');
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('AC-1/AC-2: lists committed files with their sizes — not untracked, ignored or symlinked ones', async () => {
    const files = await new SimpleGitClient(root).listFiles(repo);
    expect(files?.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      { path: '.gitignore', bytes: 14 },
      { path: 'README.md', bytes: 5 },
      { path: 'specs/public api.md', bytes: 13 },
    ]);
  });

  it('answers null when the repo has no clone', async () => {
    expect(await new SimpleGitClient(root).listFiles({ owner: 'acme', name: 'missing' })).toBeNull();
    expect(await new SimpleGitClient(root).readCommitted({ owner: 'acme', name: 'missing' }, 'README.md')).toBeNull();
  });

  it('reads the tree and a file at an explicit commit', async () => {
    const git = new SimpleGitClient(root);
    const head = (await simpleGit(join(root, 'acme', 'api')).revparse(['HEAD'])).trim();
    expect((await git.listFiles(repo, head))?.map((f) => f.path)).toContain('specs/public api.md');
    expect(await git.readCommitted(repo, 'specs/public api.md', head)).toBe('# Public API\n');
    expect(await git.readCommitted(repo, 'specs/public api.md', '0000000000000000000000000000000000000000')).toBeNull();
  });

  it('AC-16: reads the committed content, not the working tree, and never follows a symlink', async () => {
    const git = new SimpleGitClient(root);
    expect(await git.readCommitted(repo, 'specs/public api.md')).toBe('# Public API\n');
    expect(await git.readCommitted(repo, 'specs/draft.md')).toBeNull();
    expect(await git.readCommitted(repo, 'specs/link.md')).not.toContain('outside the repo');
  });

  it('skips submodules, which have no blob size', () => {
    const raw = '100644 blob a1      42\tsrc/a.ts\u0000160000 commit b2       -\tvendor/lib\u0000';
    expect(parseLsTree(raw)).toEqual([{ path: 'src/a.ts', bytes: 42 }]);
  });
});
