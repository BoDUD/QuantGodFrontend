#!/usr/bin/env node
/**
 * QuantGodFrontend MT5 workspace guard.
 *
 * MT5 monitor must stay read-only, structured, and API-backed. This guard
 * prevents regressions into direct runtime file reads, direct fetch calls in the
 * workspace component, or accidental exposure of execution affordances.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function exists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function rel(root, target) {
  return path.relative(root, target).replaceAll(path.sep, '/') || '.';
}

function checkMt5Workspace(root) {
  const errors = [];
  const workspace = path.join(root, 'src', 'workspaces', 'mt5', 'Mt5Workspace.vue');
  const model = path.join(root, 'src', 'workspaces', 'mt5', 'mt5Model.js');
  if (!exists(workspace)) return [`${rel(root, workspace)}: missing MT5 workspace`];
  if (!exists(model)) errors.push(`${rel(root, model)}: missing MT5 model`);

  const text = read(workspace);
  for (const required of [
    './mt5Model.js',
    'loadMt5Workspace',
    'EndpointHealthGrid',
    'KeyValueList',
    'LedgerTable',
    'StatusPill',
    'Safety Envelope',
    'Raw MT5 evidence',
  ]) {
    if (!text.includes(required)) errors.push(`${rel(root, workspace)}: missing ${required}`);
  }

  if (/fetch\s*\(/.test(text)) errors.push(`${rel(root, workspace)}: must not call fetch directly`);
  if (/['"]\/QuantGod_[^'"]+\.(json|csv)['"]/i.test(text)) {
    errors.push(`${rel(root, workspace)}: must not read runtime JSON/CSV directly`);
  }
  if (/LegacyWorkbench/.test(text)) errors.push(`${rel(root, workspace)}: must not import legacy workbench`);

  const forbiddenAffordances = [
    /\bOrderSend\s*\(/i,
    /\bclosePosition\s*\(/i,
    /\bcancelOrder\s*\(/i,
    /\bplaceOrder\s*\(/i,
    /\bmutatePreset\s*\(/i,
    /\btrade\s*:\s*true/i,
  ];
  for (const pattern of forbiddenAffordances) {
    if (pattern.test(text)) errors.push(`${rel(root, workspace)}: forbidden MT5 execution affordance ${pattern}`);
  }
  return errors;
}

function checkMt5Model(root) {
  const errors = [];
  const model = path.join(root, 'src', 'workspaces', 'mt5', 'mt5Model.js');
  if (!exists(model)) return errors;
  const text = read(model);
  for (const exportedName of [
    'normalizeMt5Snapshot',
    'buildMt5Metrics',
    'buildSafetyItems',
    'buildAccountItems',
    'buildPositionRows',
    'buildOrderRows',
    'buildSymbolRows',
    'buildEndpointHealth',
    'rowsFromPayload',
  ]) {
    if (!text.includes(`export function ${exportedName}`)) {
      errors.push(`${rel(root, model)}: missing export ${exportedName}`);
    }
  }

  for (const requiredSafety of [
    'orderSendAllowed',
    'closeAllowed',
    'cancelAllowed',
    'credentialStorageAllowed',
    'livePresetMutationAllowed',
  ]) {
    if (!text.includes(requiredSafety)) errors.push(`${rel(root, model)}: missing safety field ${requiredSafety}`);
  }

  if (/['"]\/QuantGod_[^'"]+\.(json|csv)['"]/i.test(text)) {
    errors.push(`${rel(root, model)}: must not reference runtime JSON/CSV paths`);
  }
  return errors;
}

function checkPackageScript(root) {
  const errors = [];
  const packagePath = path.join(root, 'package.json');
  if (!exists(packagePath)) return [`${rel(root, packagePath)}: missing package.json`];
  const packageJson = JSON.parse(read(packagePath));
  if (packageJson.scripts?.['mt5-workspace'] !== 'node scripts/frontend_mt5_workspace_guard.mjs') {
    errors.push('package.json: missing mt5-workspace script');
  }
  return errors;
}

export function checkProject(root = process.cwd()) {
  const resolved = path.resolve(root);
  return [
    ...checkMt5Workspace(resolved),
    ...checkMt5Model(resolved),
    ...checkPackageScript(resolved),
  ];
}

export function main(argv = process.argv.slice(2)) {
  const root = argv[0] ? path.resolve(argv[0]) : process.cwd();
  const errors = checkProject(root);
  if (errors.length) {
    console.error('QuantGod frontend MT5 workspace guard failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('QuantGod frontend MT5 workspace guard OK');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
