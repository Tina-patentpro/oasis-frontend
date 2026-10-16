#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const __dirname = resolve(fileURLToPath(new URL(".", import.meta.url)));

console.log("Running unused component check...");
const scriptPath = resolve(__dirname, "find_unused_components.py");

const executables = [
  { cmd: "python3", args: [] },
  { cmd: "python", args: [] },
];

let ran = false;

for (const { cmd, args } of executables) {
  console.log(`Trying ${cmd} ${[...args, scriptPath].join(" ")}`);
  const result = spawnSync(cmd, [...args, scriptPath], {
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  if (result.stdout?.length) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr?.length) {
    process.stderr.write(result.stderr);
  }

  console.log(`${cmd} exit status:`, result.status, "error:", result.error?.code ?? "none");

  if (result.status === 0) {
    process.exit(0);
  }

  const combinedOutput = Buffer.concat([
    result.stdout ?? Buffer.alloc(0),
    result.stderr ?? Buffer.alloc(0),
  ]).toString();
  const notFound =
    (result.error && result.error.code === "ENOENT") ||
    result.status === 9009 ||
    result.status === 3221225477 ||
    /\bnot recognized\b/i.test(combinedOutput) ||
    /command not found/i.test(combinedOutput) ||
    /No such file/i.test(combinedOutput);
  if (notFound) {
    console.log(`${cmd} not available, trying next candidate...`);
    continue;
  }

  ran = true;
  process.exit(result.status ?? 1);
}

if (!ran) {
  console.log("Python interpreter not available, running Node-based unused component scan.");
  // Fallback to a Node-based implementation when Python is unavailable.
  const { readdirSync, readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const YAML = (await import("yaml")).default;

  const apiRoot = resolve(__dirname, "..", "..", "docs", "api");
  const watchSections = new Set(["schemas", "responses", "parameters", "requestBodies"]);

  const collectRefs = (node, refs) => {
    if (Array.isArray(node)) {
      node.forEach((item) => collectRefs(item, refs));
      return;
    }
    if (node && typeof node === "object") {
      if (typeof node.$ref === "string") {
        refs.add(node.$ref);
      }
      Object.values(node).forEach((value) => collectRefs(value, refs));
    }
  };

  let hasUnused = false;
  for (const file of readdirSync(apiRoot)) {
    if (!file.endsWith(".yaml")) continue;
    const fullPath = resolve(apiRoot, file);
    const data = YAML.parse(readFileSync(fullPath, "utf8")) ?? {};
    const components = data.components ?? {};

    const refs = new Set();
    collectRefs(data, refs);

    const unused = [];
    for (const [section, definitions] of Object.entries(components)) {
      if (!watchSections.has(section) || typeof definitions !== "object" || !definitions) continue;
      for (const name of Object.keys(definitions)) {
        const ref = `#/components/${section}/${name}`;
        if (!refs.has(ref)) {
          unused.push({ section, name });
        }
      }
    }

  if (unused.length > 0) {
      hasUnused = true;
      console.log(file);
      unused
        .sort((a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name))
        .forEach(({ section, name }) => console.log(`  ${section}: ${name}`));
    }
  }

  if (!hasUnused) {
    console.log("All monitored components are referenced.");
  }
  process.exit(hasUnused ? 1 : 0);
}
