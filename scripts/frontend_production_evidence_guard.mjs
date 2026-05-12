import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

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

function assertNoRuntimeArtifactReferences(file, text) {
  assert.equal(forbiddenRuntimeArtifactPattern.test(text), false, `${file} must not directly reference runtime files`);
  assert.equal(forbiddenRuntimeFetchPattern.test(text), false, `${file} must not directly fetch runtime files`);
}

function assertNoTradingControls(file, text) {
  assert.equal(forbiddenTradingTokenPattern.test(text), false, `${file} contains forbidden trading token`);
}

for (const file of files) {
  const text = readSource(file);
  assertNoRuntimeArtifactReferences(file, text);
  assertNoTradingControls(file, text);
}

const service = readSource('src/services/productionEvidenceApi.js');
assert.match(service, /\/api\/production-evidence-validation\/status/);
assert.match(service, /\/api\/production-evidence-validation\/run/);

console.log('frontend production evidence guard OK');
