import { constants as fsConstants } from 'node:fs';
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  discoverResourceReferences,
  sha256,
  snapshotPathForUrl,
} from './lib/upstream-resources.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotDir = path.join(rootDir, 'upstream');
const options = parseArguments(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

let report;
try {
  const snapshot = await collectSnapshot(options);
  const generatedFiles = buildSnapshotFiles(snapshot);
  const diff = await compareSnapshot(snapshotDir, generatedFiles);
  report = {
    schemaVersion: 1,
    entryUrl: snapshot.manifest.entryUrl,
    resourceCount: snapshot.manifest.resources.length,
    drift: diff.added.length + diff.changed.length + diff.removed.length > 0,
    added: diff.added,
    changed: diff.changed,
    removed: diff.removed,
    externalReferences: snapshot.externalReferences,
    warnings: snapshot.warnings,
  };
  if (options.reportPath) await writeReport(options.reportPath, report);
  printDiff(report);

  if (options.write && report.drift) {
    await replaceSnapshot(snapshotDir, generatedFiles);
    console.log(`Upstream snapshot updated: ${path.relative(rootDir, snapshotDir)}`);
  } else if (!options.write && report.drift) {
    process.exitCode = 1;
  }
} catch (error) {
  report = {
    schemaVersion: 1,
    entryUrl: options.entryUrl,
    error: error instanceof Error ? error.message : String(error),
  };
  if (options.reportPath) await writeReport(options.reportPath, report).catch(() => {});
  console.error(`Upstream sync failed: ${report.error}`);
  process.exitCode = 2;
}

async function collectSnapshot(syncOptions) {
  const entryUrl = normalizeHttpUrl(syncOptions.entryUrl);
  const entryResponse = await fetchResource(entryUrl, syncOptions);
  const effectiveEntryUrl = entryResponse.finalUrl;
  const origin = new URL(effectiveEntryUrl).origin;
  const resources = new Map();
  const scheduled = new Set([entryUrl]);
  const fetchedFinalUrls = new Set();
  const queue = [];
  const staticExternalReferences = new Set();
  const browserExternalReferences = new Set();
  const parseWarnings = [];
  const browserWarnings = [];
  let totalBytes = 0;

  const processResource = (requestedUrl, response) => {
    const finalUrl = normalizeHttpUrl(response.finalUrl);
    if (new URL(finalUrl).origin !== origin) {
      staticExternalReferences.add(finalUrl);
      return;
    }
    totalBytes += response.body.byteLength;
    if (totalBytes > syncOptions.maxTotalBytes) {
      throw new Error(`Snapshot exceeds ${formatBytes(syncOptions.maxTotalBytes)} total limit`);
    }
    fetchedFinalUrls.add(finalUrl);
    const discovery = discoverResourceReferences({
      body: response.body.toString('utf8'),
      contentType: response.contentType,
      url: finalUrl,
    });
    resources.set(requestedUrl, {
      body: response.body,
      contentType: response.contentType,
      finalUrl,
      requestedUrl,
    });
    discovery.warnings.forEach((warning) => parseWarnings.push(`${requestedUrl}: ${warning}`));
    discovery.references.forEach((reference) => {
      if (new URL(reference).origin !== origin) {
        staticExternalReferences.add(reference);
        return;
      }
      schedule(reference);
    });
  };

  const schedule = (url) => {
    const normalized = normalizeHttpUrl(url);
    if (scheduled.has(normalized) || fetchedFinalUrls.has(normalized)) return;
    scheduled.add(normalized);
    queue.push(normalized);
  };

  processResource(entryUrl, entryResponse);

  if (syncOptions.browser) {
    const observed = await collectBrowserResources(entryUrl, syncOptions);
    observed.warnings.forEach((warning) => browserWarnings.push(warning));
    observed.urls.forEach((url) => {
      if (new URL(url).origin === origin) schedule(url);
      else browserExternalReferences.add(url);
    });
  }

  for (let index = 0; index < queue.length; index += 1) {
    const requestedUrl = queue[index];
    const response = await fetchResource(requestedUrl, syncOptions);
    processResource(requestedUrl, response);
  }

  return assembleSnapshot({
    effectiveEntryUrl,
    entryUrl,
    browserExternalReferences,
    browserWarnings,
    parseWarnings,
    resources,
    staticExternalReferences,
  });
}

async function fetchResource(url, syncOptions) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        accept: '*/*',
        'user-agent': 'doudou-upstream-sync/1.0',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(syncOptions.timeoutMs),
    });
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > syncOptions.maxResourceBytes) {
    throw new Error(`${url} exceeds ${formatBytes(syncOptions.maxResourceBytes)} resource limit`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength > syncOptions.maxResourceBytes) {
    throw new Error(`${url} exceeds ${formatBytes(syncOptions.maxResourceBytes)} resource limit`);
  }
  return {
    body,
    contentType: normalizeContentType(response.headers.get('content-type')),
    finalUrl: response.url,
  };
}

async function collectBrowserResources(entryUrl, syncOptions) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  const urls = new Set();
  const warnings = [];
  try {
    const page = await browser.newPage();
    page.on('response', (response) => {
      const url = response.url();
      if (/^https?:/i.test(url)) urls.add(normalizeHttpUrl(url));
    });
    page.on('requestfailed', (request) => {
      if (/^https?:/i.test(request.url())) {
        warnings.push(`Browser request failed: ${request.url()} · ${request.failure()?.errorText || 'failed'}`);
      }
    });
    await page.goto(entryUrl, { timeout: syncOptions.timeoutMs, waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  } finally {
    await browser.close();
  }
  return { urls, warnings };
}

function assembleSnapshot({
  browserExternalReferences,
  browserWarnings,
  effectiveEntryUrl,
  entryUrl,
  parseWarnings,
  resources,
  staticExternalReferences,
}) {
  const filesByPath = new Map();
  const metadataByPath = new Map();
  [...resources.values()]
    .sort((a, b) => a.requestedUrl.localeCompare(b.requestedUrl))
    .forEach((resource) => {
      const relativePath = snapshotPathForUrl(resource.requestedUrl, effectiveEntryUrl);
      const digest = sha256(resource.body);
      const existing = metadataByPath.get(relativePath);
      if (existing) {
        if (existing.sha256 !== digest) {
          throw new Error(`Snapshot path collision at ${relativePath}: ${existing.url} and ${resource.requestedUrl}`);
        }
        existing.aliases = [...(existing.aliases || []), resource.requestedUrl].sort();
        return;
      }
      filesByPath.set(relativePath, resource.body);
      metadataByPath.set(relativePath, {
        url: resource.requestedUrl,
        ...(resource.finalUrl !== resource.requestedUrl ? { finalUrl: resource.finalUrl } : {}),
        path: relativePath,
        contentType: resource.contentType,
        bytes: resource.body.byteLength,
        sha256: digest,
      });
    });

  const manifest = {
    schemaVersion: 1,
    entryUrl,
    ...(effectiveEntryUrl !== entryUrl ? { entryFinalUrl: effectiveEntryUrl } : {}),
    resources: [...metadataByPath.values()].sort((a, b) => a.path.localeCompare(b.path)),
    externalReferences: [...staticExternalReferences].sort(),
    warnings: [...new Set(parseWarnings)].sort(),
  };
  return {
    filesByPath,
    manifest,
    externalReferences: [...new Set([...staticExternalReferences, ...browserExternalReferences])].sort(),
    warnings: [...new Set([...parseWarnings, ...browserWarnings])].sort(),
  };
}

function buildSnapshotFiles(snapshot) {
  const files = new Map(snapshot.filesByPath);
  files.set('.snapshot.json', Buffer.from(`${JSON.stringify(snapshot.manifest, null, 2)}\n`, 'utf8'));
  return files;
}

async function compareSnapshot(directory, generatedFiles) {
  const existingFiles = await readDirectoryFiles(directory);
  const added = [];
  const changed = [];
  const removed = [];
  generatedFiles.forEach((content, relativePath) => {
    if (!existingFiles.has(relativePath)) added.push(relativePath);
    else if (!content.equals(existingFiles.get(relativePath))) changed.push(relativePath);
  });
  existingFiles.forEach((content, relativePath) => {
    if (!generatedFiles.has(relativePath)) removed.push(relativePath);
  });
  return {
    added: added.sort(),
    changed: changed.sort(),
    removed: removed.sort(),
  };
}

async function readDirectoryFiles(directory) {
  const files = new Map();
  if (!(await exists(directory))) return files;
  const visit = async (currentDirectory) => {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.DS_Store') continue;
      const absolutePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) await visit(absolutePath);
      else if (entry.isFile()) files.set(toPosix(path.relative(directory, absolutePath)), await readFile(absolutePath));
    }
  };
  await visit(directory);
  return files;
}

async function replaceSnapshot(directory, files) {
  const parent = path.dirname(directory);
  const staging = path.join(parent, `.upstream-staging-${process.pid}`);
  const backup = path.join(parent, `.upstream-backup-${process.pid}`);
  await rm(staging, { recursive: true, force: true });
  await rm(backup, { recursive: true, force: true });
  await writeSnapshotFiles(staging, files);
  const hadSnapshot = await exists(directory);
  if (hadSnapshot) await rename(directory, backup);
  try {
    await rename(staging, directory);
    if (hadSnapshot) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    if (hadSnapshot && await exists(backup)) await rename(backup, directory);
    throw error;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function writeSnapshotFiles(directory, files) {
  await mkdir(directory, { recursive: true });
  for (const [relativePath, content] of files) {
    const absolutePath = path.join(directory, relativePath);
    if (!absolutePath.startsWith(`${directory}${path.sep}`)) throw new Error(`Unsafe snapshot file: ${relativePath}`);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
  }
}

async function writeReport(reportPath, contents) {
  const absolutePath = path.resolve(rootDir, reportPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(contents, null, 2)}\n`, 'utf8');
}

function printDiff(syncReport) {
  console.log(`Upstream resources: ${syncReport.resourceCount}`);
  console.log(`Drift: +${syncReport.added.length} ~${syncReport.changed.length} -${syncReport.removed.length}`);
  ['added', 'changed', 'removed'].forEach((key) => {
    if (syncReport[key].length) console.log(`${key}:\n  ${syncReport[key].join('\n  ')}`);
  });
  if (syncReport.externalReferences.length) {
    console.log(`External references (${syncReport.externalReferences.length}) were reported but not mirrored.`);
  }
  if (syncReport.warnings.length) console.log(`Warnings: ${syncReport.warnings.length}`);
}

function parseArguments(args) {
  const parsed = {
    browser: true,
    entryUrl: 'https://paratranz.cn/doudou/',
    help: false,
    maxResourceBytes: 25 * 1024 * 1024,
    maxTotalBytes: 100 * 1024 * 1024,
    reportPath: null,
    timeoutMs: 30_000,
    write: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--browser') parsed.browser = true;
    else if (argument === '--no-browser') parsed.browser = false;
    else if (argument === '--write') parsed.write = true;
    else if (argument === '--help' || argument === '-h') parsed.help = true;
    else if (argument === '--url') parsed.entryUrl = requireValue(args, ++index, '--url');
    else if (argument === '--report') parsed.reportPath = requireValue(args, ++index, '--report');
    else if (argument === '--timeout') parsed.timeoutMs = parsePositiveNumber(requireValue(args, ++index, '--timeout'), '--timeout');
    else throw new Error(`Unknown option: ${argument}`);
  }
  return parsed;
}

function requireValue(args, index, option) {
  if (!args[index]) throw new Error(`${option} requires a value`);
  return args[index];
}

function parsePositiveNumber(value, option) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${option} must be a positive number`);
  return number;
}

function normalizeHttpUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Only HTTP(S) URLs are supported: ${value}`);
  url.hash = '';
  return url.href;
}

function normalizeContentType(contentType) {
  return String(contentType || 'application/octet-stream').split(';', 1)[0].trim().toLowerCase();
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function formatBytes(bytes) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function printHelp() {
  console.log(`Usage: node scripts/sync-upstream.mjs [options]

Options:
  --url <url>       Entry URL (default: https://paratranz.cn/doudou/)
  --write           Atomically replace upstream/ when drift is found
  --browser         Supplement static discovery with Chromium network responses (default)
  --no-browser      Use only static HTML/CSS/JavaScript discovery
  --report <path>   Write a JSON drift report
  --timeout <ms>    Per-request and browser timeout (default: 30000)
  -h, --help        Show this help`);
}
