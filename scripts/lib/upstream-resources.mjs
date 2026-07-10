import { createHash } from 'node:crypto';
import path from 'node:path';

import { parse as parseJavaScript } from 'acorn';
import { parse as parseHtml } from 'parse5';

const LINK_RESOURCE_RELS = new Set([
  'apple-touch-icon',
  'icon',
  'manifest',
  'modulepreload',
  'preload',
  'stylesheet',
]);
const SOURCE_TAGS = new Set(['audio', 'embed', 'iframe', 'img', 'input', 'script', 'source', 'track', 'video']);
const RESOURCE_ASSIGNMENTS = new Set(['href', 'poster', 'src']);

export function discoverResourceReferences({ body, contentType = '', url }) {
  const kind = resourceKind(url, contentType);
  let result = { references: [], warnings: [] };
  if (kind === 'html') result = extractHtmlReferences(body, url);
  else if (kind === 'css') result.references = extractCssReferences(body);
  else if (kind === 'javascript') result = extractJavaScriptReferences(body);
  else if (kind === 'manifest') result = extractManifestReferences(body);

  const references = result.references
    .map((reference) => resolveResourceReference(reference, result.baseUrl || url))
    .filter(Boolean);
  return {
    kind,
    references: [...new Set(references)],
    warnings: result.warnings || [],
  };
}

export function extractHtmlReferences(source, documentUrl) {
  const document = parseHtml(source);
  const warnings = [];
  let baseUrl = documentUrl;
  let baseSeen = false;
  walkHtml(document, (node) => {
    if (node.tagName !== 'base') return;
    const href = attributes(node).get('href');
    if (!href || baseSeen) return;
    baseSeen = true;
    try {
      baseUrl = new URL(href, documentUrl).href;
    } catch {
      warnings.push(`Invalid HTML base URL: ${href}`);
    }
  });

  const references = [];
  walkHtml(document, (node) => {
    if (!node.tagName) return;
    const attrs = attributes(node);
    const tag = node.tagName;
    if (SOURCE_TAGS.has(tag) && attrs.get('src')) references.push(attrs.get('src'));
    if (tag === 'video' && attrs.get('poster')) references.push(attrs.get('poster'));
    if (tag === 'object' && attrs.get('data')) references.push(attrs.get('data'));
    if ((tag === 'image' || tag === 'use') && (attrs.get('href') || attrs.get('xlink:href'))) {
      references.push(attrs.get('href') || attrs.get('xlink:href'));
    }
    if (tag === 'html' && attrs.get('manifest')) references.push(attrs.get('manifest'));
    if (attrs.get('srcset')) references.push(...parseSrcset(attrs.get('srcset')));
    if (attrs.get('imagesrcset')) references.push(...parseSrcset(attrs.get('imagesrcset')));
    if (attrs.get('style')) references.push(...extractCssReferences(attrs.get('style')));

    if (tag === 'link' && attrs.get('href')) {
      const rels = new Set((attrs.get('rel') || '').toLowerCase().split(/\s+/).filter(Boolean));
      if ([...rels].some((rel) => LINK_RESOURCE_RELS.has(rel))) references.push(attrs.get('href'));
    }

    if (tag === 'style') references.push(...extractCssReferences(textContent(node)));
    if (tag === 'script' && !attrs.get('src')) {
      const type = (attrs.get('type') || '').trim().toLowerCase();
      const script = textContent(node);
      if (type === 'importmap') {
        const importMap = extractImportMapReferences(script);
        references.push(...importMap.references);
        warnings.push(...importMap.warnings);
      } else if (!type || type === 'module' || /(?:java|ecma)script/.test(type)) {
        const inline = extractJavaScriptReferences(script);
        references.push(...inline.references);
        warnings.push(...inline.warnings.map((warning) => `Inline script: ${warning}`));
      }
    }
  });
  return { baseUrl, references, warnings };
}

export function extractCssReferences(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const references = [];
  const importPattern = /@import\s+(?:url\(\s*)?["']([^"']+)["']/gi;
  const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi;
  for (const match of css.matchAll(importPattern)) references.push(match[1]);
  for (const match of css.matchAll(urlPattern)) references.push(match[1] || match[2] || match[3]);
  return [...new Set(references)];
}

export function extractJavaScriptReferences(source) {
  if (!source.trim()) return { references: [], warnings: [] };
  let ast;
  let moduleError;
  try {
    ast = parseJavaScript(source, javascriptParseOptions('module'));
  } catch (error) {
    moduleError = error;
    try {
      ast = parseJavaScript(source, javascriptParseOptions('script'));
    } catch (scriptError) {
      return {
        references: [],
        warnings: [`JavaScript parse failed: ${scriptError.message}; module parse: ${moduleError.message}`],
      };
    }
  }

  const references = [];
  walkAst(ast, (node) => {
    if (['ImportDeclaration', 'ExportAllDeclaration', 'ExportNamedDeclaration'].includes(node.type)) {
      addLiteral(references, node.source);
    } else if (node.type === 'ImportExpression') {
      addLiteral(references, node.source);
    } else if (node.type === 'CallExpression') {
      const callee = memberPath(node.callee);
      if (['fetch', 'importScripts', 'window.fetch', 'globalThis.fetch'].includes(callee)) {
        addLiteral(references, node.arguments[0]);
      } else if (callee === 'navigator.sendBeacon' || callee === 'navigator.serviceWorker.register') {
        addLiteral(references, node.arguments[0]);
      } else if (callee?.endsWith('.setAttribute')) {
        const attributeName = literalValue(node.arguments[0]);
        if (RESOURCE_ASSIGNMENTS.has(attributeName)) addLiteral(references, node.arguments[1]);
      }
    } else if (node.type === 'NewExpression') {
      const constructorName = memberPath(node.callee);
      if (['Audio', 'Request', 'SharedWorker', 'URL', 'Worker', 'window.Audio', 'window.Worker'].includes(constructorName)) {
        addLiteral(references, node.arguments[0]);
      }
    } else if (node.type === 'AssignmentExpression' && node.left?.type === 'MemberExpression') {
      const propertyName = memberPropertyName(node.left);
      if (RESOURCE_ASSIGNMENTS.has(propertyName)) addLiteral(references, node.right);
    }
  });
  return { references: [...new Set(references)], warnings: [] };
}

export function extractManifestReferences(source) {
  try {
    const manifest = JSON.parse(source);
    const references = [];
    walkJson(manifest, (key, value) => {
      if (typeof value === 'string' && ['src', 'start_url', 'url'].includes(key)) references.push(value);
    });
    return { references: [...new Set(references)], warnings: [] };
  } catch (error) {
    return { references: [], warnings: [`Manifest parse failed: ${error.message}`] };
  }
}

export function resolveResourceReference(reference, baseUrl) {
  const value = String(reference || '').trim();
  if (!value || value.startsWith('#') || /^(?:blob|data|javascript|mailto|tel):/i.test(value)) return null;
  try {
    const url = new URL(value, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function snapshotPathForUrl(resourceUrl, entryUrl) {
  const resource = new URL(resourceUrl);
  const entry = new URL(entryUrl);
  const entryDir = entry.pathname.endsWith('/') ? entry.pathname : `${path.posix.dirname(entry.pathname)}/`;
  let relativePath;
  if (resource.pathname.startsWith(entryDir)) {
    relativePath = resource.pathname.slice(entryDir.length);
  } else {
    relativePath = path.posix.join('_origin', resource.pathname.replace(/^\/+/, ''));
  }
  if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';
  relativePath = path.posix.normalize(relativePath).replace(/^\.\//, '');
  if (relativePath === '..' || relativePath.startsWith('../') || path.posix.isAbsolute(relativePath)) {
    throw new Error(`Unsafe snapshot path for ${resourceUrl}`);
  }
  if (resource.search) relativePath = addQuerySuffix(relativePath, resource.search);
  return relativePath;
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function resourceKind(url, contentType) {
  const type = contentType.split(';', 1)[0].trim().toLowerCase();
  const extension = path.posix.extname(new URL(url).pathname).toLowerCase();
  if (type === 'text/html' || type === 'application/xhtml+xml' || ['.html', '.htm'].includes(extension)) return 'html';
  if (type === 'text/css' || extension === '.css') return 'css';
  if (/javascript|ecmascript/.test(type) || ['.js', '.mjs', '.cjs'].includes(extension)) return 'javascript';
  if (type === 'application/manifest+json' || extension === '.webmanifest') return 'manifest';
  return 'asset';
}

function javascriptParseOptions(sourceType) {
  return {
    allowAwaitOutsideFunction: true,
    allowHashBang: true,
    allowReturnOutsideFunction: sourceType === 'script',
    ecmaVersion: 'latest',
    sourceType,
  };
}

function parseSrcset(source) {
  const references = [];
  let index = 0;
  while (index < source.length) {
    while (index < source.length && /[\s,]/.test(source[index])) index += 1;
    const start = index;
    const isDataUrl = source.slice(index, index + 5).toLowerCase() === 'data:';
    while (index < source.length && !/\s/.test(source[index]) && (isDataUrl || source[index] !== ',')) index += 1;
    if (index > start) references.push(source.slice(start, index));
    while (index < source.length && source[index] !== ',') index += 1;
    index += 1;
  }
  return references;
}

function extractImportMapReferences(source) {
  try {
    const importMap = JSON.parse(source);
    const references = [];
    Object.values(importMap.imports || {}).forEach((value) => references.push(value));
    Object.values(importMap.scopes || {}).forEach((scope) => {
      Object.values(scope || {}).forEach((value) => references.push(value));
    });
    return { references, warnings: [] };
  } catch (error) {
    return { references: [], warnings: [`Import map parse failed: ${error.message}`] };
  }
}

function attributes(node) {
  return new Map((node.attrs || []).map((attribute) => [attribute.name, attribute.value]));
}

function textContent(node) {
  return (node.childNodes || []).map((child) => child.value || textContent(child)).join('');
}

function walkHtml(node, visitor) {
  visitor(node);
  (node.childNodes || []).forEach((child) => walkHtml(child, visitor));
  if (node.content) walkHtml(node.content, visitor);
}

function walkAst(root, visitor) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (typeof node.type === 'string') visitor(node);
    Object.entries(node).forEach(([key, value]) => {
      if (['end', 'loc', 'raw', 'start', 'type'].includes(key)) return;
      if (Array.isArray(value)) stack.push(...value);
      else if (value && typeof value === 'object') stack.push(value);
    });
  }
}

function addLiteral(references, node) {
  const value = literalValue(node);
  if (typeof value === 'string') references.push(value);
}

function literalValue(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0]?.value?.cooked ?? null;
  return null;
}

function memberPath(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type !== 'MemberExpression') return null;
  const object = memberPath(node.object);
  const property = memberPropertyName(node);
  return object && property ? `${object}.${property}` : null;
}

function memberPropertyName(node) {
  if (!node?.computed && node?.property?.type === 'Identifier') return node.property.name;
  return literalValue(node?.property);
}

function walkJson(value, visitor) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visitor));
    return;
  }
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, child]) => {
    visitor(key, child);
    walkJson(child, visitor);
  });
}

function addQuerySuffix(relativePath, search) {
  const extension = path.posix.extname(relativePath);
  const stem = extension ? relativePath.slice(0, -extension.length) : relativePath;
  return `${stem}.query-${sha256(search).slice(0, 12)}${extension}`;
}
