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
const pkg = JSON.parse(readSource('package.json'));
const scripts = pkg.scripts || {};
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
  'production-evidence-mini-table--history',
  'production-evidence-mini-table__row--history',
  'refreshCommand',
  'verifyCommand',
  'latestLagHours',
  'Case Memory 覆盖',
  'caseMemoryCoverage',
  'Case Memory 缺失分类',
  'production-evidence-mini-table--case-memory',
  'production-evidence-mini-table__row--case-memory',
  '源状态',
  '证据缺口',
  '前置命令',
  '补证命令',
  'sourceGapStatus',
  'prerequisiteCommand',
  'evidenceGapZh',
  'coverage',
  'collectionCommand',
  'caseMemoryBuildCommand',
  'verifyCommand',
  'collectionEndpoint',
  'targetCount',
  'priority',
]) {
  assertCondition(panel.includes(marker), `production evidence panel must surface ${marker}`);
}

assertCondition(
  /production-evidence-mini-table__head--history,\s*\.production-evidence-mini-table__row--history\s*\{[\s\S]*minmax\(280px,\s*2fr\)/.test(
    panel,
  ),
  'production evidence history recovery table must use a dedicated six-column grid',
);
assertCondition(
  /production-evidence-mini-table__head--case-memory,\s*\.production-evidence-mini-table__row--case-memory\s*\{[\s\S]*minmax\(260px,\s*1\.8fr\)/.test(
    panel,
  ),
  'production evidence Case Memory table must use a dedicated nine-column grid',
);
assertCondition(
  /overflow-wrap:\s*anywhere/.test(panel),
  'production evidence recovery tables must wrap long commands and source gaps',
);

assertCondition(
  scripts['production-evidence'] === 'node scripts/frontend_production_evidence_guard.mjs',
  'package.json must expose npm run production-evidence',
);
assertCondition(
  scripts['test:production-evidence'] === 'node --test tests/frontend_production_evidence_guard.test.mjs',
  'package.json must expose npm run test:production-evidence',
);
assertCondition(
  String(scripts['p0-toolchain'] || '').includes('npm run production-evidence'),
  'package.json p0-toolchain must run production-evidence guard',
);
for (const scriptName of ['format:check', 'stylelint']) {
  assertCondition(
    String(scripts[scriptName] || '').includes('src/components/ProductionEvidenceValidationPanel.vue'),
    `package.json ${scriptName} must include ProductionEvidenceValidationPanel.vue`,
  );
}

if (failures.length > 0) {
  console.error('frontend production evidence guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('frontend production evidence guard OK');
