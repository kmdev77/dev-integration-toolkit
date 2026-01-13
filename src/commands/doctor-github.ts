import { z } from "zod";
import { logger } from "../logger.js";
import { requireEnv } from "../lib/env.js";
import { GithubClient } from "../lib/githubClient.js";

const Args = z.object({
  org: z.string().min(1).optional(),
});

function formatHttpHint(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);

  // Your request() throws strings like: "GitHub API 403 Forbidden..." etc.
  if (msg.includes("GitHub API 401")) return "Auth failed (401). Token invalid/expired or missing access.";
  if (msg.includes("GitHub API 403") && msg.toLowerCase().includes("rate")) return "Rate limited (403). Try later.";
  if (msg.includes("GitHub API 403")) return "Forbidden (403). Token may lack org/repo visibility or SSO authorization.";
  if (msg.includes("GitHub API 404")) return "Not found (404). Org may not exist or membership not visible to this token.";
  return "Request failed. See error details.";
}

async function safeCall<T>(label: string, fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: Error }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    logger.warn({ err: error, label }, "doctor github check failed");
    return { ok: false, error };
  }
}

export async function doctorGithubCommand(opts: unknown): Promise<void> {
  const parsed = Args.safeParse(opts ?? {});
  if (!parsed.success) {
    logger.error({ issues: parsed.error.issues }, "invalid args");
    console.error("Invalid args:", parsed.error.issues);
    process.exitCode = 1;
    return;
  }

  const org = parsed.data.org?.trim();
  const token = requireEnv("GITHUB_TOKEN");
  const client = new GithubClient({ token });

  console.log("GitHub Doctor");
  console.log("------------");

  // 1) Token presence (we already have it if requireEnv didn't throw)
  console.log("✔ GITHUB_TOKEN is set");

  // 2) Viewer (who the token is)
  const viewerRes = await safeCall("viewer", () => client.getViewer());
  if (!viewerRes.ok) {
    console.log("✖ Could not authenticate with GitHub");
    console.log(`  → ${formatHttpHint(viewerRes.error)}`);
    console.log("  Fix: regenerate token or ensure it has access, then re-export GITHUB_TOKEN.");
    process.exitCode = 1;
    return;
  }

  const viewer = viewerRes.data;
  console.log(`✔ Authenticated as: ${viewer.login}`);

  // If no org requested, we’re done.
  if (!org) {
    console.log("✔ No org provided (user scope)");
    console.log("Next: try `sync-github repos` (user scope) or add `--org <org>` to diagnose org access.");
    return;
  }

  console.log(`✔ Org check requested: ${org}`);

  // 3) Does org exist / is it visible?
  const orgRes = await safeCall("org", () => client.getOrg(org));
  if (!orgRes.ok) {
    console.log(`✖ Org "${org}" not accessible`);
    console.log(`  → ${formatHttpHint(orgRes.error)}`);
    console.log("  Fix: confirm org name is correct, and that your account can view it.");
    // Don’t early return yet — membership check may provide better info, but often also fails.
  } else {
    console.log(`✔ Org exists/visible: ${orgRes.data.login ?? org}`);
  }

  // 4) Membership check (best signal for “why 0 repos”)
  const memRes = await safeCall("org-membership", () => client.getOrgMembership(org));
  if (!memRes.ok) {
    console.log(`✖ Cannot confirm membership for org "${org}"`);
    console.log(`  → ${formatHttpHint(memRes.error)}`);
    console.log("  Common causes:");
    console.log("  - You are not a member of the org (or membership is private)");
    console.log("  - Token is not authorized for org access (SSO/org policy)");
    console.log("  - Token permissions too limited");
  } else {
    const state = memRes.data?.state ?? "unknown";
    const role = memRes.data?.role ?? "unknown";
    console.log(`✔ Org membership: state=${state}, role=${role}`);
  }

  // 5) Attempt to list org repos (even if membership can’t be confirmed)
  const reposRes = await safeCall("org-repos", () => client.listAllOrgRepos(org));
  if (!reposRes.ok) {
    console.log(`✖ Cannot list org repos for "${org}"`);
    console.log(`  → ${formatHttpHint(reposRes.error)}`);
    console.log("  Fix:");
    console.log("  - Ensure your fine-grained token includes repo read access for that org");
    console.log("  - If org requires SSO, authorize the token for SSO");
    process.exitCode = 1;
    return;
  }

  const repoCount = reposRes.data.length;
  console.log(`✔ Org repos visible to token: ${repoCount}`);

  if (repoCount === 0) {
    console.log("ℹ Seeing 0 repos usually means:");
    console.log("  - You don’t have access to any repos in that org, or");
    console.log("  - The org has no repos, or");
    console.log("  - Visibility is restricted by org policies.");
    console.log("Suggestion:");
    console.log("  - Verify you’re a member of the org and have access to at least one repo");
    console.log("  - Recreate the token and explicitly grant access to that org’s repos");
  } else {
    console.log("Sample repos (top 5):");
    for (const r of reposRes.data.slice(0, 5)) {
      console.log(`  - ${r.full_name}`);
    }
  }

  console.log("Doctor complete ✅");
}
