#!/usr/bin/env node
import { Command } from "commander";
import { statusCommand } from "./commands/status.js";
import { syncGithubReposCommand } from "./commands/sync-github.js";
import { doctorGithubCommand } from "./commands/doctor-github.js";


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
  .description("Sync GitHub repos to local cache")
  .option("--org <org>", "GitHub organization name")
  .option("--out <path>", "Output cache file path")
  .action(async (opts) => {
    await syncGithubReposCommand(opts);
  });


  /**
 * DOCTOR COMMANDS
 */
const doctor = program
  .command("doctor")
  .description("Self-diagnostics for integrations and environment");

doctor
  .command("github")
  .description("Diagnose GitHub token, identity, and org access")
  .option("--org <org>", "GitHub organization to diagnose")
  .action(async (opts) => {
    await doctorGithubCommand(opts);
  });


await program.parseAsync(process.argv);
