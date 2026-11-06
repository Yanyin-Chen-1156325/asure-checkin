import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const command = process.argv[2];
if (!command) {
  console.error("A Next.js command is required.");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const localCa = resolve(process.cwd(), ".local-certs", "local-root-ca.pem");
const environment = { ...process.env };

if (!environment.NODE_EXTRA_CA_CERTS && existsSync(localCa)) {
  environment.NODE_EXTRA_CA_CERTS = localCa;
  console.info("Using the project-local CA certificate.");
}

const child = spawn(process.execPath, [nextBin, command, ...process.argv.slice(3)], {
  env: environment,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Next.js could not be started.", error);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
