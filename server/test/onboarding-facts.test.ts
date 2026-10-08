import { describe, it, expect } from 'vitest';
import {
  capFacts,
  indexNoteFor,
  infraFrom,
  isReadingPathCandidate,
  languagesFrom,
  managerFor,
  manifestPaths,
  packageManagerFrom,
  parseManifest,
  serializeFacts,
  topDirsFrom,
  type RepoFacts,
} from '../src/modules/onboarding/facts.js';

const f = (path: string, bytes = 100) => ({ path, bytes });

// SPEC-02 — facts are collected by code; nothing here comes from a model.
describe('languagesFrom / topDirsFrom', () => {
  it('AC-1: counts committed files per language by extension and per top-level directory', () => {
    const tree = [f('server/src/a.ts'), f('server/src/b.ts'), f('client/app/page.tsx'), f('scripts/dev.sh'), f('README.md'), f('LICENSE')];
    expect(languagesFrom(tree)).toEqual([
      { language: 'TypeScript', files: 3 },
      { language: 'Markdown', files: 1 },
      { language: 'Shell', files: 1 },
    ]);
    expect(topDirsFrom(tree)).toEqual([
      { dir: '(root)', files: 2 },
      { dir: 'server/', files: 2 },
      { dir: 'client/', files: 1 },
      { dir: 'scripts/', files: 1 },
    ]);
  });
});

describe('manifestPaths / parseManifest', () => {
  it('AC-5: picks package.json files shallowest first, at most ten, none over 64 KB or in node_modules', () => {
    const tree = [
      f('server/package.json'),
      f('package.json'),
      f('node_modules/x/package.json'),
      f('apps/big/package.json', 70 * 1024),
      ...Array.from({ length: 12 }, (_, i) => f(`packages/p${String(i).padStart(2, '0')}/package.json`)),
    ];
    const picked = manifestPaths(tree);
    expect(picked).toHaveLength(10);
    expect(picked.slice(0, 3)).toEqual(['package.json', 'server/package.json', 'packages/p00/package.json']);
    expect(picked).not.toContain('node_modules/x/package.json');
    expect(picked).not.toContain('apps/big/package.json');
  });

  it('AC-2: takes the name, scripts and the dependencies it recognises as frameworks', () => {
    const m = parseManifest('server/package.json', JSON.stringify({
      name: '@devdigest/api',
      scripts: { dev: 'tsx watch src/main.ts', test: 'vitest' },
      dependencies: { fastify: '^5', 'drizzle-orm': '^0.38', 'left-pad': '1' },
      devDependencies: { vitest: '^2' },
    }));
    expect(m).toEqual({
      path: 'server/package.json',
      name: '@devdigest/api',
      manager: null,
      scripts: { dev: 'tsx watch src/main.ts', test: 'vitest' },
      frameworks: ['fastify', 'drizzle-orm', 'vitest'],
    });
  });

  it('AC-5: ignores a manifest that is not valid JSON or not an object', () => {
    expect(parseManifest('a/package.json', '{ not json')).toBeNull();
    expect(parseManifest('a/package.json', '[1, 2]')).toBeNull();
  });
});

describe('package manager and infra', () => {
  it('AC-2: names the package managers from the lockfiles, and per manifest from the one beside it', () => {
    const tree = [f('server/pnpm-lock.yaml'), f('reviewer-core/package-lock.json'), f('node_modules/x/yarn.lock')];
    expect(packageManagerFrom(tree)).toBe('npm, pnpm');
    expect(managerFor('server/package.json', tree)).toBe('pnpm');
    expect(managerFor('reviewer-core/package.json', tree)).toBe('npm');
    expect(managerFor('client/package.json', tree)).toBeNull();
  });

  it('AC-3: notes Docker, Compose, env example and CI files by path only', () => {
    const tree = [f('docker-compose.yml'), f('server/.env.example'), f('.github/workflows/ci.yml'), f('deploy/Dockerfile'), f('src/.github/workflows/x.yml')];
    expect(infraFrom(tree)).toEqual({
      dockerfile: 'deploy/Dockerfile',
      compose: 'docker-compose.yml',
      env_example: 'server/.env.example',
      ci: ['.github/workflows/ci.yml'],
    });
  });
});

describe('capFacts', () => {
  const facts = (endpoints: number): RepoFacts => ({
    repo: 'acme/api',
    indexed_sha: 'abc',
    files_total: 10,
    languages: [{ language: 'TypeScript', files: 10 }],
    top_dirs: [{ dir: 'src/', files: 10 }],
    package_manager: 'pnpm',
    manifests: [],
    infra: { dockerfile: null, compose: null, env_example: null, ci: [] },
    endpoints: Array.from({ length: endpoints }, (_, i) => ({ file: `src/routes/r${i}.ts`, endpoints: [`GET /items/${i}/details/with/a/long/path`] })),
    crons: [],
    top_files: ['src/app.ts'],
    chains: [],
    context_docs: [],
    index_note: null,
  });

  it('AC-6: trims the longest lists until the text sent fits, keeping order and the reading path', () => {
    const capped = capFacts(facts(2000), 24_000);
    // Measured on the exact serialization the prompt uses, not on compact JSON.
    expect(serializeFacts(capped).length).toBeLessThanOrEqual(24_000);
    expect(capped.endpoints[0]!.file).toBe('src/routes/r0.ts');
    expect(capped.top_files).toEqual(['src/app.ts']);
    expect(capFacts(facts(3), 24_000)).toEqual(facts(3));
  });
});

describe('indexNoteFor', () => {
  it('AC-4: names each part the index had nothing for, and is null when it had all of them', () => {
    expect(indexNoteFor({ endpoints: 3, crons: 0, topFiles: 8, chains: 2 })).toBeNull();
    expect(indexNoteFor({ endpoints: 0, crons: 1, topFiles: 8, chains: 2 })).toBeNull();
    expect(indexNoteFor({ endpoints: 0, crons: 0, topFiles: 8, chains: 0 })).toBe(
      'The index has no import chains, no endpoints or cron jobs for this repository (it parses JS/TS only).',
    );
    expect(indexNoteFor({ endpoints: 0, crons: 0, topFiles: 0, chains: 0 })).toMatch(/^The index has no ranked files, no import chains, no endpoints or cron jobs/);
  });
});

describe('isReadingPathCandidate', () => {
  it('AC-9: leaves out style, constant and type modules by file name, at any depth', () => {
    for (const path of ['styles.ts', 'client/x/_components/Card/styles.ts', 'server/src/modules/blast/constants.ts', 'src/types.ts', 'types.tsx', 'src/global.d.ts', 'style.ts']) {
      expect(isReadingPathCandidate(path)).toBe(false);
    }
    for (const path of ['server/src/app.ts', 'src/stylesheet.ts', 'src/type-guards.ts', 'src/constants-loader.ts']) {
      expect(isReadingPathCandidate(path)).toBe(true);
    }
  });
});
