import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.env.QG_FRONTEND_ROOT ? path.resolve(process.env.QG_FRONTEND_ROOT) : process.cwd();

const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relPath) {
  const target = path.join(root, relPath);
  if (!fs.existsSync(target)) {
    fail(`${relPath} is missing`);
    return '';
  }
  return fs.readFileSync(target, 'utf8');
}

function readJson(relPath) {
  try {
    return JSON.parse(read(relPath));
  } catch (error) {
    fail(`${relPath} is not valid JSON: ${error.message}`);
    return {};
  }
}

function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else if (entry.isFile() && ['.js', '.mjs', '.ts'].includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const apiClient = read('src/services/apiClient.js');
const domainApi = read('src/services/domainApi.js');
const pkg = readJson('package.json');
const workflow = read('.github/workflows/ci.yml');

const requiredExports = [
  'assertApiPath',
  'makeApiUrl',
  'queryString',
  'rowsFromPayload',
  'attachApiMeta',
  'fetchApiJson',
  'postApiJson',
  'fetchJson',
  'postJson',
  'fetchRows',
  'apiFallback',
  'apiThrowMessage',
  'fetchJsonOrFallback',
  'postJsonOrFallback',
  'fetchJsonOrThrow',
  'postJsonOrThrow',
];

for (const name of requiredExports) {
  if (
    !apiClient.includes(`export function ${name}`) &&
    !apiClient.includes(`export async function ${name}`)
  ) {
    fail(`apiClient.js must export ${name}`);
  }
}

if (!apiClient.includes("startsWith('/api/')") && !apiClient.includes('startsWith("/api/")')) {
  fail('apiClient.js must enforce /api/* paths');
}

if (!apiClient.includes('RUNTIME_FILE_PATTERN') || !apiClient.includes('QuantGod_')) {
  fail('apiClient.js must reject raw QuantGod runtime JSON/CSV paths');
}

if (
  !apiClient.includes('_api') ||
  !apiClient.includes('method') ||
  !apiClient.includes('fetchedAt') ||
  !apiClient.includes('durationMs')
) {
  fail('apiClient.js must attach uniform _api observability metadata');
}

if (/^https?:\/\//i.test(apiClient)) {
  fail('apiClient.js source must not hard-code external URLs');
}

if (!domainApi.includes("from './apiClient.js'")) {
  fail('domainApi.js must import helpers from apiClient.js');
}

const forbiddenDomainHelpers = [
  'const JSON_HEADERS',
  'async function fetchJson',
  'async function postJson',
  'function rowsFromPayload',
  'async function fetchRows',
  'function params',
];

for (const token of forbiddenDomainHelpers) {
  if (domainApi.includes(token)) {
    fail(`domainApi.js still defines duplicated helper: ${token}`);
  }
}

if (/\bfetch\s*\(/.test(domainApi)) {
  fail('domainApi.js must not call fetch() directly after apiClient migration');
}

if (/\/QuantGod_[^\s'"?#]+\.(json|csv)\b/i.test(domainApi)) {
  fail('domainApi.js must not reference raw QuantGod runtime JSON/CSV files');
}

const serviceDir = path.join(root, 'src/services');
for (const filePath of walkFiles(serviceDir)) {
  const relativePath = path.relative(root, filePath).replaceAll(path.sep, '/');
  if (relativePath === 'src/services/apiClient.js') continue;
  const source = fs.readFileSync(filePath, 'utf8');
  if (/\bfetch\s*\(/.test(source)) {
    fail(`${relativePath} must not call fetch() directly; use apiClient.js helpers`);
  }
  if (relativePath !== 'src/services/domainApi.js' && /from\s+['"]\.\/domainApi\.js['"]/.test(source)) {
    fail(`${relativePath} must import API helpers from apiClient.js instead of domainApi.js`);
  }
  for (const token of [
    'const JSON_HEADERS',
    'const CSRF_HEADERS',
    'async function fetchJson',
    'async function postJson',
    'function requestJson',
  ]) {
    if (source.includes(token)) {
      fail(`${relativePath} still defines duplicated API helper/header: ${token}`);
    }
  }
}

if (!domainApi.includes('queryString as params')) {
  fail('domainApi.js should alias queryString as params to preserve loader readability');
}

if (!pkg.scripts || pkg.scripts['api-client'] !== 'node scripts/frontend_api_client_guard.mjs') {
  fail('package.json must define npm run api-client');
}

if (!workflow.includes('npm run api-client')) {
  fail('Frontend CI workflow must run npm run api-client');
}

if (errors.length) {
  console.error('Frontend API client guard failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Frontend API client guard OK');
}
