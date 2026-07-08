import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siblingEnv = join(root, "..", "ctrlplus.pro", ".env");

function readLicenseJwtSecret() {
  if (!existsSync(siblingEnv)) {
    return null;
  }

  for (const line of readFileSync(siblingEnv, "utf8").split(/\r?\n/)) {
    if (line.startsWith("LICENSE_JWT_SECRET=")) {
      const value = line.slice("LICENSE_JWT_SECRET=".length).trim();
      return value.replace(/^['"]|['"]$/g, "");
    }
  }

  return null;
}

const secret = readLicenseJwtSecret();
const env = { ...process.env };

if (secret) {
  env.LICENSE_JWT_SECRET = secret;
  console.log("Using LICENSE_JWT_SECRET from ../ctrlplus.pro/.env");
} else {
  console.warn(
    "LICENSE_JWT_SECRET not found in ../ctrlplus.pro/.env — release builds may fail Pro activation",
  );
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const args = process.argv.slice(2);
const tauriArgs = args.length > 0 ? args : ["run", "tauri:build"];

const result = spawnSync(npmCmd, tauriArgs, {
  cwd: root,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
