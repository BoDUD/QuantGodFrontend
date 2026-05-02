/**
 * QuantGodFrontend workspace boundary guard.
 *
 * Phase feature workspaces belong in src/workspaces/phase*, while src/components
 * should only contain reusable UI building blocks. This prevents Phase 1/2/3
 * feature code from drifting back into the generic components directory.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PHASES = ['phase1', 'phase2', 'phase3'];
const REQUIRED_PHASE_ENTRIES = {
  phase1: 'Phase1Workspace.vue',
  phase2: 'Phase2OperationsWorkspace.vue',
  phase3: 'Phase3Workspace.vue',
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

function walkFiles(root, acc = []) {
  if (!existsAsDir(root)) return acc;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
      walkFiles(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function rel(root, target) {
  return path.relative(root, target).replaceAll(path.sep, '/') || '.';
}

function checkPhaseWorkspaceDirs(root) {
  const errors = [];
  for (const phase of PHASES) {
    const forbidden = path.join(root, 'src', 'components', phase);
    if (existsAsDir(forbidden)) {
      errors.push(`${rel(root, forbidden)}: phase feature workspace must live under src/workspaces/${phase}`);
    }
    const requiredEntry = path.join(root, 'src', 'workspaces', phase, REQUIRED_PHASE_ENTRIES[phase]);
    if (!existsAsFile(requiredEntry)) {
      errors.push(`${rel(root, requiredEntry)}: missing phase workspace entry`);
    }
  }
  return errors;
}

function checkWorkspaceRegistry(root) {
  const registryPath = path.join(root, 'src', 'app', 'workspaceRegistry.js');
  if (!existsAsFile(registryPath)) return [`${rel(root, registryPath)}: missing workspace registry`];
  const text = readText(registryPath);
  const errors = [];
  for (const phase of PHASES) {
    if (text.includes(`../components/${phase}/`)) {
      errors.push(`${rel(root, registryPath)}: imports ${phase} from src/components instead of src/workspaces`);
    }
    if (!text.includes(`../workspaces/${phase}/`)) {
      errors.push(`${rel(root, registryPath)}: expected import from ../workspaces/${phase}/`);
    }
  }
  return errors;
}

function checkNoOldPhaseImports(root) {
  const errors = [];
  const sourceRoot = path.join(root, 'src');
  const importPattern = /from\s+['\"][^'\"]*components\/(phase1|phase2|phase3)\//;
  const dynamicPattern = /import\(\s*['\"][^'\"]*components\/(phase1|phase2|phase3)\//;
  for (const filePath of walkFiles(sourceRoot)) {
    if (!/\.(vue|js|mjs)$/.test(filePath)) continue;
    const text = readText(filePath);
    if (importPattern.test(text) || dynamicPattern.test(text)) {
      errors.push(`${rel(root, filePath)}: imports phase feature code from src/components`);
    }
  }
  return errors;
}

export function runWorkspaceBoundaryGuard(root = process.cwd()) {
  return [
    ...checkPhaseWorkspaceDirs(root),
    ...checkWorkspaceRegistry(root),
    ...checkNoOldPhaseImports(root),
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = runWorkspaceBoundaryGuard(process.cwd());
  if (errors.length > 0) {
    console.error('QuantGodFrontend workspace boundary guard failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('QuantGodFrontend workspace boundary guard OK');
}
