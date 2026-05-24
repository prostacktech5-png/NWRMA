#!/usr/bin/env node
/**
 * Render build for nwrma-web (and manual services — set Build Command to this file).
 * Uses npm only; does not rely on yarn or Corepack.
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });

run("npm ci");
run("npm run build -w @nwrma/shared");
run("npm run prepare:public -w web");
run("npm run build -w web");
