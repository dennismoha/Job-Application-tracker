#!/usr/bin/env node
/**
 * Safe roadmap synchronizer.
 *
 * Default behavior:
 *   1. Validate roadmap definitions.
 *   2. Push only missing/changed definitions.
 *   3. Pull live GitHub operational state.
 *
 * It NEVER uses roadmap.json status to reset a card already managed in GitHub.
 */

// import { spawnSync } from "node:child_process";
// import { fileURLToPath } from "node:url";

// const scripts = new URL(".", import.meta.url);
// const dryRun = process.argv.includes("--dry-run");

// function run(file, extra = []) {
//   const scriptPath = fileURLToPath(new URL(file, scripts));

//   const result = spawnSync(process.execPath, [scriptPath, ...extra], {
//     stdio: "inherit",
//     env: process.env
//   });

//   if (result.status !== 0) process.exit(result.status ?? 1);
// }

// run("./push-project.mjs", dryRun ? ["--dry-run"] : []);
// if (!dryRun) run("./pull-project.mjs");

import { spawnSync } from "node:child_process";
import { fileURLToPath } from 'node:url';

const scripts = new URL(".", import.meta.url);
const dryRun = process.argv.includes("--dry-run");

function run(file, extra = []) {
  const scriptPath = fileURLToPath(new URL(file, scripts));
  const result = spawnSync(process.execPath, [scriptPath, ...extra], {
    stdio: "inherit",
    env: process.env
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("./push-project.mjs", dryRun ? ["--dry-run"] : []);
if (!dryRun) run("./pull-project.mjs");
