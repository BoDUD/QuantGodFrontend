import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.env.QG_FRONTEND_ROOT
  ? path.resolve(process.env.QG_FRONTEND_ROOT)
  : process.cwd();

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

const apiClient = read('src/services/apiClient.js');
const domainApi = read('src/services/domainApi.js');
const pkg = readJson('package.json');
const workflow = read('.github/workflows/ci.yml');

const requiredExports = [
  'assertApiPath',
  'makeApiUrl',
  'queryString',
  'rowsFromPayload',
  'fetchApiJson',
  'postApiJson',
  'fetchJson',
  'postJson',
  'fetchRows',
];

for (const name of requiredExports) {
  if (!apiClient.includes(`export function ${name}`) && !apiClient.includes(`export async function ${name}`)) {
    fail(`apiClient.js must export ${name}`);
  }
}

if (!apiClient.includes("startsWith('/api/')") && !apiClient.includes('startsWith("/api/")')) {
  fail('apiClient.js must enforce /api/* paths');
}

if (!apiClient.includes('RUNTIME_FILE_PATTERN') || !apiClient.includes('QuantGod_')) {
  fail('apiClient.js must reject raw QuantGod runtime JSON/CSV paths');
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
