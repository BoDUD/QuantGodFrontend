import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  'src/services/gaStabilityApi.js',
  'src/components/GAMultiGenerationStabilityCard.vue',
];

function readSource(file) {
  return readFileSync(file, 'utf8');
}

function assertUsesProductionEvidenceFacade(source) {
  assert.match(source, /production-evidence-validation\/status/);
}

function assertDoesNotReadRuntimeFiles(source) {
  assert.doesNotMatch(source, /\/QuantGod_.*\.(json|csv)/i);
}

function assertDoesNotExposeExecutionControls(source) {
  assert.doesNotMatch(
    source,
    /OrderSend|PositionClose|Telegram command|live preset/i,
  );
}

function main() {
  const combined = files.map(readSource).join('\n');

  assertUsesProductionEvidenceFacade(combined);
  assertDoesNotReadRuntimeFiles(combined);
  assertDoesNotExposeExecutionControls(combined);

  console.log('frontend GA stability guard passed');
}

main();
