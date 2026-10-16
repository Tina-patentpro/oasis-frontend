#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const SOURCE_DIR = path.join(PROJECT_ROOT, 'src');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.less']);
const SCRIPT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.html']);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const VARIABLE_TOKENS = ['${baseURL}', '${API_BASE_URL}', '${apiBaseUrl}'];
const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const outputPath =
  outputIndex !== -1 && args[outputIndex + 1]
    ? path.resolve(PROJECT_ROOT, args[outputIndex + 1])
    : null;

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

async function ensureDirectoryExists(filePath) {
  if (!filePath) {
    return;
  }
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
}

async function directoryExists(dir) {
  try {
    const stats = await fs.stat(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function collectFiles(baseDir, allowedExtensions, options = {}) {
  const results = [];
  const skipDirs = options.skipDirs ?? new Set();

  if (!(await directoryExists(baseDir))) {
    return results;
  }

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) {
          continue;
        }
        await walk(entryPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      if (allowedExtensions.has(extension)) {
        results.push(entryPath);
      }
    }
  }

  await walk(baseDir);
  return results;
}

async function countLines(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  if (!content) {
    return 0;
  }
  return content.split(/\r?\n/).length;
}

async function computeLineStats(baseDir, extensions, options = {}) {
  const files = await collectFiles(baseDir, extensions, options);
  let totalLines = 0;
  const perExtension = new Map();

  const fileSummaries = [];

  for (const absolutePath of files) {
    const lines = await countLines(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    totalLines += lines;

    const data = perExtension.get(extension) ?? { lines: 0, files: 0 };
    data.lines += lines;
    data.files += 1;
    perExtension.set(extension, data);

    fileSummaries.push({
      path: toPosixPath(path.relative(PROJECT_ROOT, absolutePath)),
      lines,
    });
  }

  const extensionBreakdown = Array.from(perExtension.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([extension, data]) => ({
      extension,
      lines: data.lines,
      files: data.files,
    }));

  return {
    totalLines,
    extensionBreakdown,
    files: fileSummaries,
  };
}

function isWithinComment(source, index) {
  const upToIndex = source.slice(0, index);
  const lastNewline = Math.max(upToIndex.lastIndexOf('\n'), upToIndex.lastIndexOf('\r'));
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineContent = source.slice(lineStart, index).trim();
  if (lineContent.startsWith('//')) {
    return true;
  }

  const blockStart = upToIndex.lastIndexOf('/*');
  if (blockStart !== -1) {
    const blockEnd = upToIndex.lastIndexOf('*/');
    if (blockEnd < blockStart) {
      return true;
    }
  }

  return false;
}

function normalizeEndpoint(raw) {
  let clean = raw.trim();
  if (!clean) {
    return '';
  }

  for (const token of VARIABLE_TOKENS) {
    clean = clean.split(token).join('');
  }

  clean = clean.replace(/\$\{([^}]+)\}/g, '{$1}');
  clean = clean.replace(/\s+/g, ' ').trim();
  clean = clean.replace(' {', '{').replace('} ', '}');

  return clean;
}

function insertFileReference(map, url, method, filePath) {
  const byMethod = map.get(url) ?? new Map();
  const fileSet = byMethod.get(method) ?? new Set();
  fileSet.add(filePath);
  byMethod.set(method, fileSet);
  map.set(url, byMethod);
}

async function extractApiEndpoints(files) {
  const apiClientPatterns = [
    { regex: /apiClient\.(get|post|put|delete|patch)\s*(?:<[^>]*>)?\s*\(\s*(['"])(.+?)\2/gi, valueIndex: 3 },
    { regex: /apiClient\.(get|post|put|delete|patch)\s*(?:<[^>]*>)?\s*\(\s*`([^`]+?)`/gi, valueIndex: 2 },
  ];
  const fetchPatterns = [
    { regex: /fetch\(\s*(['"])(https?:\/\/[^'"`]+|\/[^'"`]+)\1/gi, valueIndex: 2 },
    { regex: /fetch\(\s*`([^`]+?)`/gi, valueIndex: 1 },
  ];

  const apiClientEndpoints = new Map();
  const fetchEndpoints = new Map();

  for (const absolutePath of files) {
    const content = await fs.readFile(absolutePath, 'utf8');
    const relativePath = toPosixPath(path.relative(PROJECT_ROOT, absolutePath));

    for (const { regex, valueIndex } of apiClientPatterns) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (isWithinComment(content, match.index)) {
          continue;
        }
        const method = match[1].toUpperCase();
        const raw = match[valueIndex];
        const endpoint = normalizeEndpoint(raw);
        if (!endpoint) {
          continue;
        }
        insertFileReference(apiClientEndpoints, endpoint, method, relativePath);
      }
    }

    for (const { regex, valueIndex } of fetchPatterns) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (isWithinComment(content, match.index)) {
          continue;
        }
        const raw = match[valueIndex];
        const endpoint = normalizeEndpoint(raw);
        if (!endpoint) {
          continue;
        }
        const fileSet = fetchEndpoints.get(endpoint) ?? new Set();
        fileSet.add(relativePath);
        fetchEndpoints.set(endpoint, fileSet);
      }
    }
  }

  return { apiClientEndpoints, fetchEndpoints };
}

function sortMethods(methods) {
  return Array.from(methods).sort((a, b) => {
    const indexA = METHOD_ORDER.indexOf(a);
    const indexB = METHOD_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) {
      return a.localeCompare(b);
    }
    if (indexA === -1) {
      return 1;
    }
    if (indexB === -1) {
      return -1;
    }
    return indexA - indexB;
  });
}

function summarizeEndpoints(apiClientMap) {
  const methodCounter = new Map();
  const endpointSummaries = [];

  const sortedUrls = Array.from(apiClientMap.keys()).sort();
  for (const url of sortedUrls) {
    const methodMap = apiClientMap.get(url);
    if (!methodMap) {
      continue;
    }

    const methods = sortMethods(methodMap.keys());
    const fileSet = new Set();
    for (const method of methods) {
      methodCounter.set(method, (methodCounter.get(method) ?? 0) + 1);
      const files = methodMap.get(method);
      if (!files) {
        continue;
      }
      for (const file of files) {
        fileSet.add(file);
      }
    }

    endpointSummaries.push({
      url,
      methods,
      files: Array.from(fileSet).sort(),
    });
  }

  const orderedMethodBreakdown = {};
  for (const method of METHOD_ORDER) {
    if (methodCounter.has(method)) {
      orderedMethodBreakdown[method] = methodCounter.get(method);
    }
  }
  for (const [method, count] of methodCounter.entries()) {
    if (METHOD_ORDER.includes(method)) {
      continue;
    }
    orderedMethodBreakdown[method] = count;
  }

  return {
    total: apiClientMap.size,
    methodBreakdown: orderedMethodBreakdown,
    endpoints: endpointSummaries,
  };
}

function formatFetchEndpoints(fetchMap) {
  const entries = [];
  for (const [endpoint, files] of Array.from(fetchMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    entries.push({
      url: endpoint,
      files: Array.from(files).sort(),
    });
  }
  return {
    total: fetchMap.size,
    endpoints: entries,
  };
}

function printSummary(sourceStats, scriptStats, apiSummary, fetchSummary, outputFile) {
  console.log('Code metrics summary');
  console.log(`- Source total lines: ${sourceStats.totalLines}`);
  for (const item of sourceStats.extensionBreakdown) {
    console.log(`  ${item.extension}: ${item.lines} lines across ${item.files} files`);
  }

  console.log(`- Script total lines: ${scriptStats.totalLines}`);
  for (const item of scriptStats.extensionBreakdown) {
    console.log(`  ${item.extension}: ${item.lines} lines across ${item.files} files`);
  }

  console.log('API endpoints');
  const methodParts = Object.entries(apiSummary.methodBreakdown).map(
    ([method, count]) => `${method} ${count}`
  );
  console.log(
    `- apiClient endpoints: ${apiSummary.total}${methodParts.length ? ` (${methodParts.join(' | ')})` : ''}`
  );
  console.log(`- fetch endpoints: ${fetchSummary.total}`);

  if (outputFile) {
    console.log(`Report written to: ${toPosixPath(path.relative(PROJECT_ROOT, outputFile))}`);
  }
}

async function main() {
  try {
    const sourceStats = await computeLineStats(SOURCE_DIR, SOURCE_EXTENSIONS);
    const scriptStats = await computeLineStats(SCRIPTS_DIR, SCRIPT_EXTENSIONS);
    const codeFiles = await collectFiles(SOURCE_DIR, CODE_EXTENSIONS);
    const { apiClientEndpoints, fetchEndpoints } = await extractApiEndpoints(codeFiles);

    const apiSummary = summarizeEndpoints(apiClientEndpoints);
    const fetchSummary = formatFetchEndpoints(fetchEndpoints);

    const report = {
      generatedAt: new Date().toISOString(),
      source: sourceStats,
      scripts: scriptStats,
      api: {
        apiClient: apiSummary,
        fetch: fetchSummary,
      },
    };

    if (outputPath) {
      await ensureDirectoryExists(outputPath);
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
    }

    printSummary(sourceStats, scriptStats, apiSummary, fetchSummary, outputPath);
  } catch (error) {
    console.error('Failed to generate code metrics:', error);
    process.exit(1);
  }
}

await main();
