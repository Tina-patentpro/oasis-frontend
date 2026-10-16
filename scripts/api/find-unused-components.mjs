#!/usr/bin/env node
/**
 * Report unused schema components across OpenAPI specs.
 * Focuses on `components.schemas` references to highlight cleanup targets.
 */
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const __dirname = resolve(fileURLToPath(new URL(".", import.meta.url)));
const repoRoot = resolve(__dirname, "..", "..");
const apiRoot = resolve(repoRoot, "docs", "api");

const files = (await readdir(apiRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
  .map((entry) => resolve(apiRoot, entry.name))
  .sort();

function collectRefs(node, acc) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRefs(item, acc));
  } else if (node && typeof node === "object") {
    if (typeof node.$ref === "string") {
      acc.add(node.$ref);
    }
    Object.values(node).forEach((value) => collectRefs(value, acc));
  }
}

let hasUnused = false;
for (const file of files) {
  const data = YAML.parse(await readFile(file, "utf8")) ?? {};
  const components = data.components ?? {};
  const schemas = components.schemas ?? {};
  const defined = Object.keys(schemas);
  if (defined.length === 0) continue;

  const refs = new Set();
  collectRefs(data, refs);

  const unusedSchemas = defined.filter(
    (name) => !refs.has(`#/components/schemas/${name}`)
  );

  if (unusedSchemas.length > 0) {
    hasUnused = true;
    console.log(`${file.replace(repoRoot + "/", "")}`);
    unusedSchemas.forEach((name) => console.log(`  schema: ${name}`));
  }
}

if (!hasUnused) {
  console.log("All schema components are referenced.");
}
