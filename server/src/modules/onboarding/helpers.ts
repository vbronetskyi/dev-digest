import { z } from 'zod';
import type { ChatMessage, Onboarding, OnboardingLink, OnboardingMeta, OnboardingSection } from '@devdigest/shared';
import { wrapUntrusted } from '../../platform/prompt.js';
import { READING_PATH_LEN, SECTIONS, type SectionKind } from './constants.js';
import { serializeFacts, type RepoFacts } from './facts.js';

/** What the model returns: prose per section and notes keyed by paths it was given (AC-7, AC-8). */
const Note = z.object({ path: z.string(), note: z.string() });
export const OnboardingOutput = z.object({
  architecture: z.object({ body: z.string(), diagram: z.string().nullable() }),
  critical_paths: z.object({ body: z.string(), notes: z.array(Note) }),
  how_to_run: z.object({ body: z.string() }),
  reading_path: z.object({ body: z.string(), notes: z.array(Note) }),
  first_tasks: z.object({ body: z.string() }),
});
export type OnboardingOutput = z.infer<typeof OnboardingOutput>;

/** AC-7: fixed instructions, then the facts as JSON in one untrusted block. */
export function buildOnboardingMessages(system: string, facts: RepoFacts): ChatMessage[] {
  return [
    { role: 'system', content: system },
    {
      role: 'user',
      // Fixed text outside the block; the repository name lives inside the facts.
      content: `Write the onboarding tour for the repository these facts describe.\n\n## Facts\n${wrapUntrusted('facts', serializeFacts(facts))}`,
    },
  ];
}

// A link target may hold one level of parentheses: (javascript:alert(1)).
const MD_IMAGE = /!\[[^\]]*\]\((?:[^()]|\([^()]*\))*\)/g;
const MD_REF_IMAGE = /!\[[^\]]*\]\[[^\]]*\]/g;
const MD_LINK = /\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g;
const MD_REF_LINK = /\[([^\]]+)\]\[[^\]]*\]/g;
const MD_REF_DEFINITION = /^ {0,3}\[[^\]]+\]:\s*\S+.*$/gm;
const AUTOLINK = /<((?:https?|mailto|javascript|data):[^>\s]*)>/gi;
const HTML_TAG = /<\/?[a-z][^>]*>/gi;
/** Script and style blocks go whole — their content is not prose. */
const HTML_BLOCK = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
/** A bare URL or www. host outside a code span — GFM would turn it into a link. */
const BARE_URL = /(`[^`]*`)|((?:https?:\/\/|www\.)[^\s<>`)\]]+)/gi;

/**
 * AC-12: model prose keeps its text, never its links, images or HTML. Bare
 * URLs stay readable as code spans, which Markdown never turns into links.
 */
export function stripLinks(markdown: string): string {
  return markdown
    .replace(HTML_BLOCK, '')
    .replace(MD_IMAGE, '')
    .replace(MD_REF_IMAGE, '')
    .replace(MD_REF_DEFINITION, '')
    .replace(MD_LINK, '$1')
    .replace(MD_REF_LINK, '$1')
    .replace(AUTOLINK, '$1')
    .replace(HTML_TAG, '')
    .replace(BARE_URL, (match, code: string | undefined) => (code ? match : `\`${match}\``))
    .trim();
}

/** A diagram the client may try to render: fences removed, must start like a flowchart (AC-23 checks it parses). */
export function cleanDiagram(diagram: string | null | undefined): string | null {
  const body = (diagram ?? '').replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/, '').trim();
  return /^(flowchart|graph)\s/.test(body) ? body : null;
}

const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const titleOf = (kind: SectionKind) => SECTIONS.find((s) => s.kind === kind)!.title;
const section = (kind: SectionKind, body: string, links: OnboardingLink[] = [], diagram: string | null = null): OnboardingSection => ({
  kind,
  title: titleOf(kind),
  body,
  diagram,
  links,
});

/** Notes the model wrote, only for the paths it was offered (AC-9, AC-10). */
function notesFor(notes: readonly { path: string; note: string }[], allowed: readonly string[]): Map<string, string> {
  const ok = new Set(allowed);
  const out = new Map<string, string>();
  for (const n of notes) if (ok.has(n.path) && !out.has(n.path) && n.note.trim()) out.set(n.path, stripLinks(n.note).slice(0, 240));
  return out;
}

/** AC-10: chains as a list of code spans, each with the model's note when there is one. */
function chainList(chains: readonly string[][], notes: ReadonlyMap<string, string>): string {
  return chains.map((c, i) => `${i + 1}. ${c.map((p) => `\`${p}\``).join(' → ')}${notes.has(c[0]!) ? ` — ${notes.get(c[0]!)}` : ''}`).join('\n');
}

const keep = (path: string, tracked: ReadonlySet<string>) => tracked.has(path);

/**
 * AC-8–AC-12: the tour as the server vouches for it. Sections and order are
 * fixed; the reading path and the chains come from the facts with the model's
 * notes attached; every link is built here from a committed path; model prose
 * loses its links, images and HTML.
 */
export function groundTour(output: OnboardingOutput, facts: RepoFacts, tracked: ReadonlySet<string>, meta: OnboardingMeta): Onboarding {
  const chains = facts.chains.filter((c) => c.every((p) => keep(p, tracked)));
  const chainNotes = notesFor(output.critical_paths.notes, chains.map((c) => c[0]!));
  const steps = facts.top_files.filter((p) => keep(p, tracked)).slice(0, READING_PATH_LEN);
  const stepNotes = notesFor(output.reading_path.notes, steps);
  const manifestLinks = facts.manifests.filter((m) => keep(m.path, tracked)).map((m) => ({ label: m.name ?? m.path, path: m.path }));

  const criticalBody = [stripLinks(output.critical_paths.body), chains.length > 0 ? chainList(chains, chainNotes) : '']
    .filter(Boolean)
    .join('\n\n');
  // AC-4: when the index had nothing for a part, the tour says so, whatever the model wrote.
  const architectureBody = [stripLinks(output.architecture.body), facts.index_note ? `_${facts.index_note}_` : ''].filter(Boolean).join('\n\n');
  return {
    sections: [
      section('architecture', architectureBody, manifestLinks, cleanDiagram(output.architecture.diagram)),
      section('critical_paths', criticalBody, chains.map((c) => ({ label: chainNotes.get(c[0]!) ?? c.map(baseName).join(' → '), path: c[0]! }))),
      section('how_to_run', stripLinks(output.how_to_run.body)),
      section(
        'reading_path',
        stripLinks(output.reading_path.body) || readingFallback(steps),
        steps.map((p, i) => ({ label: stepNotes.get(p) ?? rankLabel(i), path: p })),
      ),
      section('first_tasks', stripLinks(output.first_tasks.body)),
    ],
    meta,
  };
}

const rankLabel = (i: number) => `Ranked #${i + 1} in the import graph`;
const readingFallback = (steps: readonly string[]) =>
  steps.length > 0 ? 'Read these files in order — the most depended-on first.' : 'The index has no ranked files for this repository yet.';

/** How-to-run steps from the facts alone: install, env, services, the scripts that start and test. */
function runSteps(facts: RepoFacts): string[] {
  const steps: string[] = [];
  const pm = facts.package_manager?.split(', ')[0] ?? (facts.manifests.length > 0 ? 'npm' : null);
  if (facts.infra.env_example) steps.push(`cp ${facts.infra.env_example} ${facts.infra.env_example.replace(/\.(example|sample|template)$/, '')}`);
  if (facts.infra.compose) steps.push(`docker compose -f ${facts.infra.compose} up -d`);
  for (const m of facts.manifests) {
    const dir = m.path.includes('/') ? m.path.slice(0, m.path.lastIndexOf('/')) : '';
    const run = (cmd: string) => (dir ? `cd ${dir} && ${cmd}` : cmd);
    const manager = m.manager ?? pm;
    if (!manager) continue;
    steps.push(run(`${manager} install`));
    for (const script of ['dev', 'start', 'test']) {
      // npm needs `run` for anything but start/test; pnpm, yarn and bun do not.
      if (m.scripts[script]) steps.push(run(`${manager} ${manager === 'npm' && script === 'dev' ? 'run ' : ''}${script}`));
    }
  }
  return [...new Set(steps)].slice(0, 12);
}

/** AC-14: a tour from the facts alone, marked as a skeleton with the reason. */
export function skeletonTour(facts: RepoFacts, tracked: ReadonlySet<string>, meta: Omit<OnboardingMeta, 'source'> & { reason: string }): Onboarding {
  const langs = facts.languages.map((l) => `${l.language} (${l.files})`).join(', ') || 'no recognised languages';
  const packages = facts.manifests.map((m) => `- \`${m.path}\`${m.name ? ` — ${m.name}` : ''}${m.frameworks.length ? `: ${m.frameworks.join(', ')}` : ''}`);
  const dirs = facts.top_dirs.map((d) => `- \`${d.dir}\` — ${d.files} files`);
  const endpointCount = facts.endpoints.reduce((n, e) => n + e.endpoints.length, 0);
  const cronCount = facts.crons.reduce((n, c) => n + c.crons.length, 0);
  const architecture = [
    `**${facts.repo}** — ${facts.files_total} committed files. Languages: ${langs}.`,
    packages.length ? `**Packages**\n${packages.join('\n')}` : '',
    dirs.length ? `**Top-level layout**\n${dirs.join('\n')}` : '',
    endpointCount || cronCount ? `The index found ${endpointCount} endpoints and ${cronCount} cron jobs.` : '',
    facts.index_note ? `_${facts.index_note}_` : '',
  ].filter(Boolean);
  const steps = runSteps(facts);
  const chains = facts.chains.filter((c) => c.every((p) => keep(p, tracked)));
  const reading = facts.top_files.filter((p) => keep(p, tracked)).slice(0, READING_PATH_LEN);
  const tasks = [
    ...facts.context_docs.slice(0, 2).map((d) => `- Read \`${d}\` and check the code still matches it.`),
    reading[0] ? `- Add a test around \`${reading[0]}\` — it is the most depended-on file.` : '',
    facts.manifests.some((m) => m.scripts.test) ? '- Run the test script and make it pass on your machine.' : '',
  ].filter(Boolean);
  return {
    sections: [
      section('architecture', architecture.join('\n\n'), facts.manifests.filter((m) => keep(m.path, tracked)).map((m) => ({ label: m.name ?? m.path, path: m.path }))),
      section('critical_paths', chains.length ? chainList(chains, new Map()) : 'The index has no import chains for this repository.', chains.map((c) => ({ label: c.map(baseName).join(' → '), path: c[0]! }))),
      section('how_to_run', steps.length ? steps.map((s) => `- \`${s}\``).join('\n') : 'No package scripts, Compose file or Dockerfile found.'),
      section('reading_path', readingFallback(reading), reading.map((p, i) => ({ label: rankLabel(i), path: p }))),
      section('first_tasks', tasks.length ? tasks.join('\n') : 'No obvious first tasks from the facts alone.'),
    ],
    meta: { ...meta, source: 'skeleton', model: null, cost_usd: null },
  };
}
