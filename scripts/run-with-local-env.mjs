import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { loadEnvFile } from "node:process";

const rawArgs = process.argv.slice(2);
const requireServiceRole = rawArgs[0] === "--require-service-role";
const separatorIndex = rawArgs.indexOf("--");
const commandArgs = separatorIndex >= 0 ? rawArgs.slice(separatorIndex + 1) : rawArgs;

if (commandArgs.length === 0) {
  console.error(
    "Usage: node scripts/run-with-local-env.mjs [--require-service-role] -- <command> [args...]",
  );
  process.exit(1);
}

const defaultSecretsDirectory =
  process.platform === "win32"
    ? join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "Accountabul")
    : join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "accountabul");

const envFile = process.env.ACCOUNTABUL_ENV_FILE || join(defaultSecretsDirectory, "dev.env");

if (!existsSync(envFile)) {
  console.error(`Local environment file not found: ${envFile}`);
  console.error(
    "Create it outside the repository with the values from .env.example. Never commit or paste secret values into chat.",
  );
  process.exit(1);
}

loadEnvFile(envFile);

process.env.VITE_SUPABASE_PROJECT_ID ||= process.env.SUPABASE_PROJECT_ID;
process.env.VITE_SUPABASE_URL ||= process.env.SUPABASE_URL;
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= process.env.SUPABASE_PUBLISHABLE_KEY;
process.env.PUBLIC_SITE_URL ||= "http://127.0.0.1:4173";

const requiredVariables = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];
if (requireServiceRole) requiredVariables.push("SUPABASE_SERVICE_ROLE_KEY");

const missingVariables = requiredVariables.filter(
  (name) => !process.env[name] || process.env[name]?.trim() === "",
);

if (missingVariables.length > 0) {
  console.error(`Missing required local environment value(s): ${missingVariables.join(", ")}`);
  process.exit(1);
}

const [requestedCommand, ...requestedArgs] = commandArgs;
let executable = requestedCommand;
let executableArgs = requestedArgs;

if (process.platform === "win32" && requestedCommand === "npm") {
  const bundledNpmExecPath = join(
    dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  const npmExecPath = process.env.npm_execpath || bundledNpmExecPath;
  if (!existsSync(npmExecPath)) {
    console.error(
      "Unable to locate npm's executable path. Run this launcher through an npm script on Windows.",
    );
    process.exit(1);
  }
  executable = process.execPath;
  executableArgs = [npmExecPath, ...requestedArgs];
}

const child = spawn(executable, executableArgs, {
  env: process.env,
  shell: false,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Unable to start ${requestedCommand}: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
