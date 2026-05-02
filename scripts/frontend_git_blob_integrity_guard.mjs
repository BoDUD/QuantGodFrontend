import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];

function rel(...parts) {
  return path.join(root, ...parts);
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function exists(relPath) {
  return existsSync(rel(relPath));
}

function readWorking(relPath) {
  return readFileSync(rel(relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function lineCount(text) {
  if (!text) return 0;
  return text.split('\n').length;
}

function shellQuoteForGitPath(relPath) {
  return relPath.replace(/'/g, "'\\''");
}

function readGitBlob(relPath) {
  try {
    return execSync(`git show HEAD:'${shellQuoteForGitPath(relPath)}'`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function walk(dir, predicate = () => true) {
  const abs = rel(dir);
  if (!existsSync(abs)) return [];
  const out = [];
  const stack = [abs];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (!['node_modules', 'dist', '.git', 'coverage', 'archive'].includes(name)) {
          stack.push(full);
        }
      } else if (predicate(full)) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

const criticalFiles = [
  { path: '.github/workflows/ci.yml', minLines: 70, label: 'workflow' },
  { path: 'package.json', minLines: 30, label: 'package' },
  { path: 'src/app/navigation.js', minLines: 40, label: 'navigation' },
  { path: 'src/app/workspaceRegistry.js', minLines: 30, label: 'registry' },
  { path: 'src/app/AppShell.vue', minLines: 50, label: 'app shell' },
  { path: 'src/workspaces/legacy/LegacyWorkbench.vue', minLines: 80, label: 'legacy slim' },
  { path: 'scripts/frontend_remote_ci_integrity_guard.mjs', minLines: 40, label: 'remote CI guard' },
  { path: 'scripts/frontend_lf_integrity_guard.mjs', minLines: 40, label: 'LF guard' },
  { path: 'scripts/frontend_legacy_slim_guard.mjs', minLines: 40, label: 'legacy slim guard' },
];

function checkTextShape(relPath, minLines, label, content, sourceLabel) {
  assert(content !== null && content !== undefined, `${relPath} is missing from ${sourceLabel}`);
  if (content === null || content === undefined) return;
  assert(!content.includes('\r'), `${relPath} ${sourceLabel} must not contain CR characters`);
  const count = lineCount(content);
  assert(count >= minLines, `${relPath} ${sourceLabel} has only ${count} LF lines; expected at least ${minLines} (${label})`);
}

function checkCriticalWorkingTree() {
  for (const item of criticalFiles) {
    assert(exists(item.path), `${item.path} is missing`);
    if (exists(item.path)) {
      checkTextShape(item.path, item.minLines, item.label, readWorking(item.path), 'working tree');
    }
  }
}

function checkCriticalGitBlobWhenInCi() {
  if (process.env.CI !== 'true' && process.env.QG_CHECK_GIT_BLOB !== '1') {
    return;
  }
  for (const item of criticalFiles) {
    checkTextShape(item.path, item.minLines, item.label, readGitBlob(item.path), 'git blob');
  }
}

function checkWorkflowSemantics() {
  if (!exists('.github/workflows/ci.yml')) return;
  const workflow = readWorking('.github/workflows/ci.yml');
  assert(/^name:\s*QuantGod Frontend CI/m.test(workflow), 'workflow must have a standalone name header');
  assert(/^on:/m.test(workflow), 'workflow must have standalone on: section');
  assert(/^jobs:/m.test(workflow), 'workflow must have standalone jobs: section');
  assert(workflow.includes('npm run git-blob-integrity'), 'workflow must run npm run git-blob-integrity');
  assert(workflow.includes('npm run remote-ci-integrity'), 'workflow must run npm run remote-ci-integrity');
  assert(workflow.includes('npm run legacy-slim'), 'workflow must run npm run legacy-slim');
  assert(workflow.includes('npm run build'), 'workflow must run npm run build');
  assert(!workflow.includes('name: QuantGod Frontend CI on:'), 'workflow appears compressed into single-line YAML');
}

function checkPackageScript() {
  if (!exists('package.json')) return;
  const pkg = JSON.parse(readWorking('package.json'));
  assert(pkg.scripts?.['git-blob-integrity'] === 'node scripts/frontend_git_blob_integrity_guard.mjs', 'package.json must define npm run git-blob-integrity');
  for (const scriptName of [
    'remote-ci-integrity',
    'lf-integrity',
    'contract',
    'structure',
    'workspace-boundary',
    'domain-workspace',
    'dashboard-workspace',
    'mt5-workspace',
    'governance-workspace',
    'paramlab-workspace',
    'research-workspace',
    'polymarket-workspace',
    'legacy-deprecation',
    'legacy-slim',
  ]) {
    assert(pkg.scripts?.[scriptName], `package.json is missing npm run ${scriptName}`);
  }
}

function checkAllGuardsAreMultiline() {
  const guardFiles = walk('scripts', (file) => /frontend_.*_guard\.mjs$/.test(file));
  assert(guardFiles.length >= 15, 'expected at least 15 frontend guard scripts');
  for (const full of guardFiles) {
    const relPath = toPosix(path.relative(root, full));
    const content = readFileSync(full, 'utf8');
    assert(!content.startsWith('#!'), `${relPath} must not use a hashbang`);
    assert(!content.includes('\r'), `${relPath} must not contain CR characters`);
    assert(lineCount(content) >= 40, `${relPath} has too few LF lines and may be compressed`);
    assert(content.includes('process.exit(') || content.includes('process.exitCode'), `${relPath} must fail hard on guard errors`);
  }
}

function checkTestsAreMultiline() {
  const testFiles = walk('tests', (file) => /\.mjs$/.test(file));
  assert(testFiles.length >= 10, 'expected frontend node tests under tests/');
  for (const full of testFiles) {
    const relPath = toPosix(path.relative(root, full));
    const content = readFileSync(full, 'utf8');
    assert(!content.includes('\r'), `${relPath} must not contain CR characters`);
    assert(lineCount(content) >= 10, `${relPath} has too few LF lines and may be compressed`);
    assert(content.includes("node:test") || content.includes('test('), `${relPath} must contain node:test assertions`);
  }
}

checkCriticalWorkingTree();
checkCriticalGitBlobWhenInCi();
checkWorkflowSemantics();
checkPackageScript();
checkAllGuardsAreMultiline();
checkTestsAreMultiline();

if (failures.length > 0) {
  console.error('Frontend git blob integrity guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Frontend git blob integrity guard OK');
