import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];

function rel(...parts) {
  return path.join(root, ...parts);
}

function read(relPath) {
  return readFileSync(rel(relPath), 'utf8');
}

function exists(relPath) {
  return existsSync(rel(relPath));
}

function fail(message) {
  failures.push(message);
}

function lineCount(text) {
  return text.split('\n').length;
}

function assertContains(text, needle, label) {
  if (!text.includes(needle)) {
    fail(`${label} must contain ${needle}`);
  }
}

function assertNotContains(text, needle, label) {
  if (text.includes(needle)) {
    fail(`${label} must not contain ${needle}`);
  }
}

const legacyDir = 'src/workspaces/legacy';
const archivePath = 'archive/legacy-workbench/LegacyWorkbenchFull.vue';

if (exists(legacyDir) && statSync(rel(legacyDir)).isDirectory()) {
  fail(`${legacyDir} must not exist; legacy UI belongs only in archive/ and must not be routable source`);
}

if (!exists(archivePath)) {
  fail(`${archivePath} should keep the full archived legacy source outside src/`);
} else {
  const archived = read(archivePath);
  if (lineCount(archived) < 1000) {
    fail(`${archivePath} should contain the full legacy source, not the slim routed component`);
  }
}

if (exists('src/workspaces/legacy/archive/LegacyWorkbenchFull.vue')) {
  fail('Full archived legacy source must not live under src/, otherwise build/contract guards may scan old code');
}

const navigation = read('src/app/navigation.js');
assertContains(navigation, "export const DEFAULT_WORKSPACE = 'dashboard'", 'src/app/navigation.js');

const packageJson = JSON.parse(read('package.json'));
if (!packageJson.scripts || packageJson.scripts['legacy-slim'] !== 'node scripts/frontend_legacy_slim_guard.mjs') {
  fail('package.json must define npm run legacy-slim');
}

const workflow = read('.github/workflows/ci.yml');
assertContains(workflow, 'npm run legacy-slim', '.github/workflows/ci.yml');

if (failures.length) {
  console.error('Frontend legacy slim guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Frontend legacy slim guard OK');
