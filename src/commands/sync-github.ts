import { z } from "zod";
import { logger } from "../logger.js";
import { requireEnv } from "../lib/env.js";
import { GithubClient } from "../lib/githubClient.js";
import { writeJson } from "../lib/cache.js";
import { existsSync, readFileSync } from "node:fs";

const Args = z.object({
  out: z.string().min(1).optional(),
});

type NormalizedRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string | null;
  updated_at: string | null;
  pushed_at: string | null;
  html_url: string;
  owner_login: string | null;
  archived: boolean;
  fork: boolean;
};

function normalizeRepo(r: any): NormalizedRepo {
  return {
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    private: Boolean(r.private),
    default_branch: r.default_branch ?? null,
    updated_at: r.updated_at ?? null,
    pushed_at: r.pushed_at ?? null,
    html_url: r.html_url,
    owner_login: r.owner?.login ?? null,
    archived: Boolean(r.archived),
    fork: Boolean(r.fork),
  };
}

function readPreviousCache(path: string): { repos: NormalizedRepo[] } | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as { repos?: unknown };
    if (!parsed || !Array.isArray((parsed as any).repos)) return null;
    return { repos: (parsed as any).repos as NormalizedRepo[] };
  } catch {
    return null;
  }
}

function indexById(repos: NormalizedRepo[]) {
  const m = new Map<number, NormalizedRepo>();
  for (const r of repos) m.set(r.id, r);
  return m;
}

function isRepoChanged(prev: NormalizedRepo, next: NormalizedRepo) {
  return prev.updated_at !== next.updated_at || prev.pushed_at !== next.pushed_at;
}

export async function syncGithubReposCommand(opts: unknown): Promise<void> {
  const parsed = Args.safeParse(opts ?? {});
  if (!parsed.success) {
    logger.error({ issues: parsed.error.issues }, "invalid args");
    console.error("Invalid args:", parsed.error.issues);
    process.exitCode = 1;
    return;
  }

  const token = requireEnv("GITHUB_TOKEN");
  const outFile = parsed.data.out ?? ".dit/cache/github-repos.json";

  logger.info({ outFile }, "sync-github repos starting");
  console.log("Syncing GitHub repos...");

  // Load previous cache (if present) BEFORE overwriting it.
  const previous = readPreviousCache(outFile);
  const prevRepos = previous?.repos ?? [];

  const client = new GithubClient({ token });
  const reposRaw = await client.listAllUserRepos();
  const repos = reposRaw.map(normalizeRepo);

  // Diff: added/removed/changed/unchanged
  const prevById = indexById(prevRepos);
  const nextById = indexById(repos);

  const added: NormalizedRepo[] = [];
  const removed: NormalizedRepo[] = [];
  const changed: NormalizedRepo[] = [];
  const unchanged: NormalizedRepo[] = [];

  for (const r of repos) {
    const prev = prevById.get(r.id);
    if (!prev) added.push(r);
    else if (isRepoChanged(prev, r)) changed.push(r);
    else unchanged.push(r);
  }

  for (const r of prevRepos) {
    if (!nextById.has(r.id)) removed.push(r);
  }

  // Write new cache
  writeJson(outFile, {
    generated_at: new Date().toISOString(),
    count: repos.length,
    repos,
  });

  const privateCount = repos.filter((r) => r.private).length;
  const archivedCount = repos.filter((r) => r.archived).length;

  logger.info(
    {
      count: repos.length,
      privateCount,
      archivedCount,
      outFile,
      diff: {
        added: added.length,
        removed: removed.length,
        changed: changed.length,
        unchanged: unchanged.length,
      },
    },
    "sync-github repos done"
  );

  console.log(
    `Done. Repos: ${repos.length} (private: ${privateCount}, archived: ${archivedCount})`
  );
  console.log(
    `Sync summary: +${added.length} added, -${removed.length} removed, ~${changed.length} changed, =${unchanged.length} unchanged`
  );

  if (changed.length > 0) {
    console.log("Changed (top 10):");
    for (const r of changed.slice(0, 10)) {
      console.log(` - ${r.full_name} (updated_at=${r.updated_at})`);
    }
  }

  console.log(`Wrote: ${outFile}`);
}
