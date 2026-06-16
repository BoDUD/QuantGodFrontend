import { readFileSync } from 'node:fs';
import process from 'node:process';

const failures = [];

const files = [
  'src/services/productionEvidenceApi.js',
  'src/components/ProductionEvidenceValidationPanel.vue',
];

const forbiddenRuntimeArtifactPattern = /QuantGod_.*\.(json|csv)/;
const forbiddenRuntimeFetchPattern = /fetch\(['"]\/?QuantGod_/;
const forbiddenTradingTokenPattern =
  /OrderSend|PositionClose|TRADE_ACTION_DEAL|telegramCommandExecutionAllowed\s*:\s*true/;

function readSource(file) {
  return readFileSync(file, 'utf8');
}

function fail(message) {
  failures.push(message);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

function assertReadableSource(file, text) {
  const lineCount = text.split(/\r?\n/).length;
  assertCondition(lineCount >= 10, `${file} should be readable multi-line source`);
}

function assertNoRuntimeArtifactReferences(file, text) {
  assertCondition(
    !forbiddenRuntimeArtifactPattern.test(text),
    `${file} must not directly reference runtime files`,
  );
  assertCondition(!forbiddenRuntimeFetchPattern.test(text), `${file} must not directly fetch runtime files`);
}

function assertNoTradingControls(file, text) {
  assertCondition(!forbiddenTradingTokenPattern.test(text), `${file} contains forbidden trading token`);
}

for (const file of files) {
  const text = readSource(file);
  assertReadableSource(file, text);
  assertNoRuntimeArtifactReferences(file, text);
  assertNoTradingControls(file, text);
}

const service = readSource('src/services/productionEvidenceApi.js');
const panel = readSource('src/components/ProductionEvidenceValidationPanel.vue');
assertCondition(
  /\/api\/production-evidence-validation\/status/.test(service),
  'production evidence API must expose the status endpoint',
);
assertCondition(
  /\/api\/production-evidence-validation\/run/.test(service),
  'production evidence API must expose the run endpoint',
);
for (const marker of [
  'History Freshness 恢复队列',
  'freshnessRecoveryQueue',
  'refreshCommand',
  'verifyCommand',
  'latestLagHours',
  'Case Memory 覆盖',
  'caseMemoryCoverage',
  'Case Memory 缺失分类',
  '证据缺口',
  'evidenceGapZh',
  'coverage',
  'collectionEndpoint',
  'targetCount',
  'priority',
]) {
  assertCondition(panel.includes(marker), `production evidence panel must surface ${marker}`);
}

if (failures.length > 0) {
  console.error('frontend production evidence guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('frontend production evidence guard OK');
