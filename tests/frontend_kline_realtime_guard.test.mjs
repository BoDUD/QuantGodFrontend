import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepoFile(filePath) {
  return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

test('Kline workspace uses live quote for realtime market summary', () => {
  const apiSource = readRepoFile('src/services/phase1Api.js');
  const workspaceSource = readRepoFile('src/workspaces/phase1/kline/KlineWorkspace.vue');

  assert.match(apiSource, /cache:\s*'no-store'/);
  assert.match(apiSource, /\/api\/mt5-readonly\/quote/);
  assert.match(workspaceSource, /getQuote/);
  assert.match(workspaceSource, /marketPrice/);
  assert.match(workspaceSource, /quoteRefreshTimer\s*=\s*window\.setInterval\(loadQuote,\s*5000\)/);
  assert.match(workspaceSource, /quotePayload\.value\s*=\s*null/);
});

test('Kline workspace is scoped to USDJPY only', () => {
  const apiSource = readRepoFile('src/services/phase1Api.js');
  const workspaceSource = readRepoFile('src/workspaces/phase1/kline/KlineWorkspace.vue');
  const aiWorkspaceSource = readRepoFile('src/workspaces/phase1/AiAnalysisWorkspace.vue');
  const phase3KlineSource = readRepoFile('src/workspaces/phase3/kline/KlineEnhancementPanel.vue');
  const phase3AiSource = readRepoFile('src/workspaces/phase3/ai/AiV2DebateWorkspace.vue');
  const phase3VibeSource = readRepoFile('src/workspaces/phase3/vibe/VibeCodingWorkspace.vue');
  const phase3NlInputSource = readRepoFile('src/workspaces/phase3/vibe/NlInput.vue');

  assert.match(apiSource, /USDJPY_FOCUS_SYMBOL\s*=\s*'USDJPYc'/);
  assert.match(apiSource, /startsWith\('USDJPY'\)/);
  assert.match(workspaceSource, /normalizeUsdJpySymbols/);
  assert.match(workspaceSource, /USDJPY_FOCUS_SYMBOL/);
  assert.match(aiWorkspaceSource, /USDJPY_FOCUS_SYMBOL/);
  assert.doesNotMatch(workspaceSource, /ref\('EURUSDc'\)/);
  assert.doesNotMatch(phase3KlineSource + phase3AiSource + phase3VibeSource + phase3NlInputSource, /EURUSDc/);
  assert.doesNotMatch(apiSource, /symbol:\s*'EURUSDc'/);
  assert.doesNotMatch(apiSource, /symbol:\s*'XAUUSDc'/);
});

test('Kline workspace does not render missing event times as 01/01 09:00', () => {
  const workspaceSource = readRepoFile('src/workspaces/phase1/kline/KlineWorkspace.vue');

  assert.match(
    workspaceSource,
    /if \(value === undefined \|\| value === null \|\| value === ''\) return '--'/,
  );
  assert.match(workspaceSource, /if \(timestamp <= 0\) return '--'/);
  assert.doesNotMatch(workspaceSource, /new Date\(value \|\| 0\)/);
});
