/**
 * QuantGodFrontend structure guard.
 *
 * Keeps the split frontend maintainable after moving the legacy monolithic
 * App.vue into src/workspaces/legacy/LegacyWorkbench.vue.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REQUIRED_FILES = [
  'src/App.vue',
  'src/app/AppShell.vue',
  'src/app/navigation.js',
  'src/app/workspaceRegistry.js',
  'src/stores/workspaceStore.js',
  'src/workspaces/legacy/LegacyWorkbench.vue',
];

const FORBIDDEN_ROOT_DIRS = ['Dashboard', 'MQL5', 'tools', 'cloudflare'];

function rel(root, target) {
  return path.relative(root, target).replaceAll(path.sep, '/') || '.';
}

function fileText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function existsAsDir(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function existsAsFile(target) {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
}

function checkRequiredFiles(root) {
  return REQUIRED_FILES
    .filter((relativePath) => !existsAsFile(path.join(root, relativePath)))
    .map((relativePath) => `${relativePath}: required modular shell file is missing`);
}

function checkSplitBoundary(root) {
  return FORBIDDEN_ROOT_DIRS
    .filter((dirName) => existsAsDir(path.join(root, dirName)))
    .map((dirName) => `${dirName}/: frontend split-boundary violation`);
}

function checkAppShell(root) {
  const errors = [];
  const appPath = path.join(root, 'src/App.vue');
  if (!existsAsFile(appPath)) {
    return errors;
  }
  const text = fileText(appPath);
  const lineCount = text.split(/\r?\n/).length;
  if (lineCount > 80) {
    errors.push(`src/App.vue: expected lightweight shell wrapper, got ${lineCount} lines`);
  }
  if (!text.includes("./app/AppShell.vue")) {
    errors.push('src/App.vue: must import ./app/AppShell.vue');
  }
  if (text.includes('loadDashboardState(') || text.includes('fetch(')) {
    errors.push('src/App.vue: must not contain dashboard loading logic or raw fetch');
  }
  return errors;
}

function checkLegacyImportPaths(root) {
  const errors = [];
  const legacyPath = path.join(root, 'src/workspaces/legacy/LegacyWorkbench.vue');
  if (!existsAsFile(legacyPath)) {
    return errors;
  }
  const text = fileText(legacyPath);
  const invalidImports = [
    /from\s+['"]\.\/components\//,
    /from\s+['"]\.\/services\//,
    /from\s+['"]\.\/utils\//,
    /import\s+['"]\.\/styles\.css['"]/,
  ];
  for (const pattern of invalidImports) {
    if (pattern.test(text)) {
      errors.push(`${rel(root, legacyPath)}: legacy import paths were not rewritten after moving App.vue`);
      break;
    }
  }
  return errors;
}

export function runFrontendStructureGuard(repoRoot = process.cwd()) {
  const root = path.resolve(repoRoot);
  return [
    ...checkRequiredFiles(root),
    ...checkSplitBoundary(root),
    ...checkAppShell(root),
    ...checkLegacyImportPaths(root),
  ];
}

export function formatErrors(errors) {
  if (!errors.length) return 'QuantGodFrontend structure guard OK';
  return ['QuantGodFrontend structure guard failed:', ...errors.map((error) => `- ${error}`)].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = runFrontendStructureGuard(process.argv[2] || process.cwd());
  console.log(formatErrors(errors));
  process.exit(errors.length ? 1 : 0);
}
