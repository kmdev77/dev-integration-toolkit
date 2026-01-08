import { z } from "zod";
import { logger } from "../logger.js";

const Args = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export async function syncGithubCommand(opts: unknown): Promise<void> {
  const parsed = Args.safeParse(opts);
  if (!parsed.success) {
    logger.error({ issues: parsed.error.issues }, "invalid args");
    console.error("Invalid args:", parsed.error.issues);
    process.exitCode = 1;
    return;
  }

  const { owner, repo } = parsed.data;

  // Stub for now — Day 3 will do the real API call + storage.
  logger.info({ owner, repo }, "sync-github (stub)");
  console.log(`sync-github stub ✅ owner=${owner} repo=${repo}`);
}
