#!/usr/bin/env node
import { Command } from "commander";
import { statusCommand } from "./commands/status.js";
import { syncGithubCommand } from "./commands/sync-github.js";

const program = new Command();

program
  .name("devtool")
  .description("Internal developer tooling CLI for integrations + debugging")
  .version("0.1.0");

/**
 * STATUS COMMAND
 */
program
  .command("status")
  .description("Show tool status and environment info")
  .action(async () => {
    await statusCommand();
  });

/**
 * SYNC-GITHUB COMMAND (stub for now)
 */
program
  .command("sync-github")
  .description("Sync GitHub data (stub for now)")
  .requiredOption("--owner <owner>", "GitHub owner or organization")
  .requiredOption("--repo <repo>", "GitHub repository name")
  .action(async (opts) => {
    await syncGithubCommand(opts);
  });

await program.parseAsync(process.argv);
