#!/usr/bin/env node
/**
 * Verify that each OpenAPI specification contains the required metadata.
 *
 * Checks:
 *   1. `info.contact` is provided.
 *   2. Every operation defines both `operationId` and `description`.
 *
 * Exits with code 1 when any violations are found.
 */
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const __dirname = resolve(fileURLToPath(new URL(".", import.meta.url)));
const repoRoot = resolve(__dirname, "..", "..");
const apiRoot = resolve(repoRoot, "docs", "api");

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

async function loadSpecs() {
  const entries = await readdir(apiRoot, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => resolve(apiRoot, entry.name));
  files.sort();
  return files;
}

async function check() {
  const missingContact = [];
  const missingMeta = new Map();

  const files = await loadSpecs();

  for (const file of files) {
    const text = await readFile(file, "utf8");
    const data = YAML.parse(text) ?? {};

    const info = data.info ?? {};
    if (!info.contact) {
      missingContact.push(file);
    }

    const paths = data.paths ?? {};
    for (const [pathKey, operations] of Object.entries(paths)) {
      if (typeof operations !== "object" || operations === null) continue;
      for (const [method, operation] of Object.entries(operations)) {
        if (method.startsWith("x-")) continue;
        if (!HTTP_METHODS.has(method.toLowerCase())) continue;
        if (typeof operation !== "object" || operation === null) continue;
        const missingFields = ["operationId", "description"].filter(
          (field) => !(field in operation)
        );
        if (missingFields.length > 0) {
          const list = missingMeta.get(file) ?? [];
          list.push({ method: method.toUpperCase(), path: pathKey, fields: missingFields });
          missingMeta.set(file, list);
        }
      }
    }
  }

  if (missingContact.length === 0 && missingMeta.size === 0) {
    console.log("All API specs include contact metadata and required operation fields.");
    return 0;
  }

  if (missingContact.length > 0) {
    console.log("Missing `info.contact` in:");
    for (const file of missingContact) {
      console.log(`  - ${resolve(file)}`);
    }
    console.log();
  }

  if (missingMeta.size > 0) {
    console.log("Operations missing metadata:");
    for (const [file, issues] of missingMeta.entries()) {
      console.log(`  ${resolve(file)}`);
      for (const issue of issues) {
        console.log(`    - ${issue.method} ${issue.path}: ${issue.fields.join(", ")}`);
      }
    }
  }

  return 1;
}

const exitCode = await check();
process.exit(exitCode);
