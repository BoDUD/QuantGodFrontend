#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
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

const legacyPath = 'src/workspaces/legacy/LegacyWorkbench.vue';
const archivePath = 'archive/legacy-workbench/LegacyWorkbenchFull.vue';

if (!exists(legacyPath)) {
  fail(`${legacyPath} is missing`);
} else {
  const legacy = read(legacyPath);
  const lines = lineCount(legacy);

  if (lines > 260) {
    fail(`LegacyWorkbench.vue should be slim after archive migration; got ${lines} lines`);
  }

  assertContains(legacy, 'LegacyDeprecationBanner', legacyPath);
  assertContains(legacy, 'useWorkspaceStore', legacyPath);
  assertContains(legacy, 'legacyMigrationCounts', legacyPath);
  assertContains(legacy, 'archive/legacy-workbench/LegacyWorkbenchFull.vue', legacyPath);

  for (const forbidden of [
    'fetch(',
    '/QuantGod_',
    '.csv',
    'submitOrder',
    'placeOrder',
    'executeTrade',
    'closePosition',
    'cancelOrder',
    'transferFunds',
    'withdrawFunds',
    'mutatePreset',
    'promoteRoute',
    'demoteRoute',
    'manualAuthorize',
    'autoExecute',
  ]) {
    assertNotContains(legacy, forbidden, legacyPath);
  }
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

const manifestPath = 'src/workspaces/legacy/legacyMigrationManifest.js';
if (!exists(manifestPath)) {
  fail(`${manifestPath} is missing`);
} else {
  const manifest = read(manifestPath);
  assertContains(manifest, 'legacyMigrationCounts', manifestPath);
  assertContains(manifest, 'legacyArchive', manifestPath);
  assertContains(manifest, archivePath, manifestPath);
}

const migrationDocPath = 'src/workspaces/legacy/LEGACY_MIGRATION.md';
if (!exists(migrationDocPath)) {
  fail(`${migrationDocPath} is missing`);
} else {
  const doc = read(migrationDocPath);
  assertContains(doc, 'Legacy Slim', migrationDocPath);
  assertContains(doc, archivePath, migrationDocPath);
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
