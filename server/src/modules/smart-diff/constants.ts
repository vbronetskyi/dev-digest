import type { SmartDiffReason, SmartDiffRole } from '@devdigest/shared';

/** The role each classification reason puts a file in. */
export const ROLE_OF: Record<SmartDiffReason, SmartDiffRole> = {
  source: 'core',
  entrypoint: 'wiring',
  imports_only: 'wiring',
  config: 'wiring',
  migration: 'wiring',
  infra: 'wiring',
  lockfile: 'boilerplate',
  generated: 'boilerplate',
  test: 'boilerplate',
  docs: 'boilerplate',
  i18n: 'boilerplate',
  assets: 'boilerplate',
  styles: 'boilerplate',
  tooling: 'boilerplate',
  rename: 'boilerplate',
};

/** Review order of the groups: the substance first, the mechanical last. */
export const ROLE_ORDER: readonly SmartDiffRole[] = ['core', 'wiring', 'boilerplate'];

export const LOCKFILES = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'skills-lock.json',
  'Cargo.lock',
  'Gemfile.lock',
  'composer.lock',
  'poetry.lock',
  'uv.lock',
  'go.sum',
]);

/**
 * Path rules, checked in this order after lockfiles; the first match wins.
 * Tests come before docs and config so `test/fixtures/x.json` stays a test.
 */
export const PATH_RULES: ReadonlyArray<readonly [SmartDiffReason, RegExp]> = [
  ['generated', /(^|\/)(dist|build|out|coverage|\.next)\/|(^|\/)__snapshots__\/|\.snap$|\.min\.(js|css)$|\.generated\.|(^|\/)migrations\/meta\//],
  ['test', /(^|\/)(test|tests|__tests__|e2e)\/|\.(test|spec)\.[cm]?[jt]sx?$|_test\.go$|(^|\/)test_[^/]+\.py$/],
  ['assets', /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm|pdf)$/i],
  ['i18n', /(^|\/)(messages|locales|i18n|translations)\/.+\.(json|ya?ml|po)$/],
  ['docs', /\.(md|mdx|rst|txt)$|(^|\/)(LICENSE|CHANGELOG)[^/]*$|^docs\//i],
  ['migration', /(^|\/)migrations?\/.+\.sql$/],
  ['infra', /(^|\/)\.github\/|(^|\/)Dockerfile[^/]*$|(^|\/)docker-compose[^/]*\.ya?ml$|(^|\/)\.mcp\.json$|(^|\/)\.claude\/settings[^/]*\.json$/],
  ['tooling', /(^|\/)(package\.json|tsconfig[^/]*\.json|\.gitignore|\.npmrc|\.nvmrc|\.editorconfig|\.prettierrc[^/]*|\.eslintrc[^/]*|eslint\.config\.[cm]?[jt]s|[^/]+\.config\.[cm]?[jt]s|\.[^/]+\.[cm]?js)$/],
  ['styles', /\.(css|scss|sass|less)$|(^|\/)styles?\.[cm]?[jt]sx?$/],
  ['entrypoint', /(^|\/)(index|main|app|server|container|bootstrap)\.[cm]?[jt]sx?$/],
  ['config', /(^|\/)(config|env|settings)\.[cm]?[jt]s$|\.(json|ya?ml|toml|ini)$/],
];

/** A banner in the first added lines that marks the file as machine-written. */
export const GENERATED_MARKER = /@generated|do not edit|auto-?generated/i;
export const GENERATED_SCAN_LINES = 5;

/**
 * Changed lines that only connect code: imports, re-exports, `require`,
 * plugin/middleware registration, a bare identifier in a registry object.
 */
export const WIRING_LINE =
  /^\s*(import\s|export\s+(\*|\{[^}]*\}\s+from|type\s+\{)|\}\s*from\s+['"]|(const|let|var)\s+[\w{},\s]+=\s*require\(|[\w.]+\.(register|use)\(|[A-Za-z_$][\w$]*,?\s*$)/;
/** A source file is wiring when at least this share of its changed lines are. */
export const WIRING_SHARE = 0.6;

/**
 * Past ~400 changed lines reviewers find markedly fewer defects per line
 * (SmartBear / Cisco code-review study), so that is where a split is offered.
 * Only core and wiring lines count: a regenerated lockfile is not review work.
 */
export const SPLIT_REVIEWABLE_LINES = 400;
/** A proposed split smaller than this share of the reviewable lines is folded into the largest. */
export const SPLIT_MIN_SHARE = 0.1;
export const MAX_SPLITS = 4;

/** Directory names that say nothing about the feature a file belongs to. */
export const GENERIC_DIRS = new Set(['src', 'lib', 'app', 'test', 'tests', '__tests__', 'specs', 'docs']);
/** The directory right after one of these names is the feature. */
export const FEATURE_MARKERS = new Set(['modules', '_components', 'components', 'features', 'packages', 'apps', 'services']);
