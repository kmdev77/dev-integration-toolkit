#!/usr/bin/env node
import { Command } from "commander";
import { statusCommand } from "./commands/status.js";
import { syncGithubReposCommand } from "./commands/sync-github.js";

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
 * SYNC-GITHUB (real) — subcommands
 */
const syncGithub = program
  .command("sync-github")
  .description("Sync GitHub data into local cache");

syncGithub
  .command("repos")
  .description("Sync your GitHub repos to .dit/cache/github-repos.json")
  .option("--out <path>", "Output cache file path", ".dit/cache/github-repos.json")
  .action(async (opts) => {
    await syncGithubReposCommand(opts);
  });

await program.parseAsync(process.argv);
