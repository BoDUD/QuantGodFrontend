#!/usr/bin/env node
/**
 * QuantGodFrontend domain workspace guard.
 *
 * The modular shell should expose business domains as first-class entries under
 * src/workspaces/* instead of forcing maintainers to edit the legacy 4k+ line
 * workbench for every small module change.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const DOMAIN_WORKSPACES = {
  dashboard: 'DashboardWorkspace.vue',
  mt5: 'Mt5Workspace.vue',
  governance: 'GovernanceWorkspace.vue',
  paramlab: 'ParamLabWorkspace.vue',
  research: 'ResearchWorkspace.vue',
  polymarket: 'PolymarketWorkspace.vue',
};

function existsAsFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function existsAsDir(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function rel(root, target) {
  return path.relative(root, target).replaceAll(path.sep, '/') || '.';
}

function walkFiles(root, acc = []) {
  if (!existsAsDir(root)) return acc;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) walkFiles(current, acc);
    else acc.push(current);
  }
  return acc;
}

function checkDomainEntries(root) {
  const errors = [];
  for (const [key, entry] of Object.entries(DOMAIN_WORKSPACES)) {
    const filePath = path.join(root, 'src', 'workspaces', key, entry);
    if (!existsAsFile(filePath)) {
      errors.push(`${rel(root, filePath)}: missing domain workspace entry`);
    }
  }
  return errors;
}

function checkRegistry(root) {
  const errors = [];
  const registryPath = path.join(root, 'src', 'app', 'workspaceRegistry.js');
  if (!existsAsFile(registryPath)) return [`${rel(root, registryPath)}: missing workspace registry`];
  const registry = readText(registryPath);
  for (const [key, entry] of Object.entries(DOMAIN_WORKSPACES)) {
    if (!registry.includes(`../workspaces/${key}/${entry}`)) {
      errors.push(`${rel(root, registryPath)}: missing ${key} import from src/workspaces/${key}`);
    }
    if (!registry.includes(`${key}:`)) {
      errors.push(`${rel(root, registryPath)}: WORKSPACE_COMPONENTS missing ${key}`);
    }
  }
  if (!registry.includes("../workspaces/legacy/LegacyWorkbench.vue")) {
    errors.push(`${rel(root, registryPath)}: legacy fallback must remain available during migration`);
  }
  return errors;
}

function checkNavigation(root) {
  const errors = [];
  const navigationPath = path.join(root, 'src', 'app', 'navigation.js');
  if (!existsAsFile(navigationPath)) return [`${rel(root, navigationPath)}: missing navigation config`];
  const navigation = readText(navigationPath);
  for (const key of Object.keys(DOMAIN_WORKSPACES)) {
    if (!navigation.includes(`key: '${key}'`) && !navigation.includes(`key: \"${key}\"`)) {
      errors.push(`${rel(root, navigationPath)}: navigation missing ${key}`);
    }
  }
  if (!navigation.includes("DEFAULT_WORKSPACE = 'dashboard'") && !navigation.includes('DEFAULT_WORKSPACE = "dashboard"')) {
    errors.push(`${rel(root, navigationPath)}: DEFAULT_WORKSPACE should be dashboard after domain split`);
  }
  return errors;
}

function checkDomainApi(root) {
  const errors = [];
  const servicePath = path.join(root, 'src', 'services', 'domainApi.js');
  if (!existsAsFile(servicePath)) return [`${rel(root, servicePath)}: missing domain API service`];
  const service = readText(servicePath);
  for (const name of [
    'loadDashboardWorkspace',
    'loadMt5Workspace',
    'loadGovernanceWorkspace',
    'loadParamLabWorkspace',
    'loadResearchWorkspace',
    'loadPolymarketWorkspace',
  ]) {
    if (!service.includes(`function ${name}`)) {
      errors.push(`${rel(root, servicePath)}: missing ${name}`);
    }
  }
  const forbiddenLocalRuntimeReads = service.match(/['"]\/QuantGod_[^'"]+\.(json|csv)['"]/gi) || [];
  for (const match of forbiddenLocalRuntimeReads) {
    errors.push(`${rel(root, servicePath)}: forbidden local runtime file read ${match}; use /api/*`);
  }
  return errors;
}

function checkNoDomainInComponents(root) {
  const errors = [];
  const componentRoot = path.join(root, 'src', 'components');
  for (const key of Object.keys(DOMAIN_WORKSPACES)) {
    const forbidden = path.join(componentRoot, key);
    if (existsAsDir(forbidden)) {
      errors.push(`${rel(root, forbidden)}: domain workspace code must live under src/workspaces/${key}`);
    }
  }
  return errors;
}

function checkNoDirectRuntimeFetches(root) {
  const errors = [];
  const srcRoot = path.join(root, 'src');
  const files = walkFiles(srcRoot).filter((file) => /\.(vue|js|mjs)$/.test(file));
  for (const file of files) {
    const relPath = rel(root, file);
    const text = readText(file);
    if (/fetch\s*\(\s*['"]\/(?!api\/)/.test(text)) {
      errors.push(`${relPath}: non-/api fetch detected`);
    }
    if (/['"]\/QuantGod_[^'"]+\.(json|csv)['"]/i.test(text)) {
      errors.push(`${relPath}: direct QuantGod runtime file path detected`);
    }
  }
  return errors;
}

export function checkProject(root = process.cwd()) {
  const resolved = path.resolve(root);
  return [
    ...checkDomainEntries(resolved),
    ...checkRegistry(resolved),
    ...checkNavigation(resolved),
    ...checkDomainApi(resolved),
    ...checkNoDomainInComponents(resolved),
    ...checkNoDirectRuntimeFetches(resolved),
  ];
}

export function main(argv = process.argv.slice(2)) {
  const root = argv[0] ? path.resolve(argv[0]) : process.cwd();
  const errors = checkProject(root);
  if (errors.length) {
    console.error('QuantGod frontend domain workspace guard failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('QuantGod frontend domain workspace guard OK');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
