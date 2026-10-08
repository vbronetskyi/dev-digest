/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment:
        'Cycles break the inward-only rule. WARN today: most cycles run through the DI ' +
        'composition root (container ↔ service) — a tradeoff of the "service takes Container" ' +
        'style; plus one genuine same-module cycle agents/helpers ↔ agents/repository to fix.',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-is-pure',
      comment:
        'reviewer-core is the domain core: NO I/O. Only the injected LLMProvider. ' +
        'The same code runs in the server and in CI.',
      severity: 'error',
      from: { path: 'reviewer-core/src' },
      to: {
        path: [
          '^fastify', 'drizzle-orm', '^postgres', 'octokit', 'simple-git',
          '@ast-grep/napi', '/src/adapters/', '/src/db/', '^node:fs',
        ],
      },
    },
    {
      name: 'services-depend-on-ports',
      comment:
        'A feature service orchestrates through ports (via container.*), never a concrete ' +
        'adapter SDK wrapper. Exception: repo-intel IS the indexer subsystem (infrastructure).',
      severity: 'error',
      from: {
        path: 'src/modules/[^/]+/(service|run-executor)[^/]*\\.ts$',
        pathNot: 'src/modules/repo-intel/',
      },
      to: { path: 'src/adapters/' },
    },
    {
      name: 'routes-are-thin',
      comment: 'Transport (routes) calls the service; it never reaches into adapters.',
      severity: 'error',
      from: { path: 'src/modules/[^/]+/routes\\.ts$' },
      to: { path: 'src/adapters/' },
    },
    {
      name: 'db-confined-to-repositories',
      comment:
        'Drizzle/db schema queries belong in modules/*/repository*. DRIFT (warn): 8 files ' +
        'query db/schema outside a repository (routes of polling/pulls/workspace/settings, ' +
        'plus reviews/run-executor, reviews/diff-loader, repos/helpers, settings/feature-models).',
      severity: 'warn',
      from: { path: 'src/modules/', pathNot: 'src/modules/[^/]+/repository' },
      to: { path: ['src/db/schema', '^drizzle-orm'] },
    },
    {
      name: 'no-cross-module-internals',
      comment:
        'One feature reaches another only through container.* (the composition root), never ' +
        'by importing its sibling module folder. _shared is the allowed common ground. WARN ' +
        'today: pulls/routes → reviews/helpers, and repos/service → repo-intel/constants.',
      severity: 'warn',
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/([^/]+)/', pathNot: ['^src/modules/$1/', '^src/modules/_shared/'] },
    },
    {
      name: 'adapters-dont-know-modules',
      comment:
        'Infrastructure must not depend on a feature. ' +
        'Exception: adapters/depgraph reads repo-intel/constants — move those constants out to remove it.',
      severity: 'error',
      from: { path: '^src/adapters/' },
      to: { path: '^src/modules/', pathNot: '^src/modules/repo-intel/constants' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['node_modules', '/dist/', '\\.test\\.ts$', '\\.it\\.test\\.ts$'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
