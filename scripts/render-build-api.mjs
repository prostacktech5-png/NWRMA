#!/usr/bin/env node
/**
 * Render build for nwrma-api. Set Build Command to: node scripts/render-build-api.mjs
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });

run("npm ci");
run("npm run build -w @nwrma/shared");
run("npm run prisma:generate -w server");
run("npm run build -w server");
