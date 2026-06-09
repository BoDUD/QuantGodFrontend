import { readFileSync } from 'node:fs';
import process from 'node:process';

const failures = [];

const files = [
  'src/services/gaStabilityApi.js',
  'src/components/GAMultiGenerationStabilityCard.vue',
];

function fail(message) {
  failures.push(message);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

function readSource(file) {
  return readFileSync(file, 'utf8');
}

function assertUsesProductionEvidenceFacade(source) {
  assertCondition(
    /production-evidence-validation\/status/.test(source),
    'GA stability UI must use the production-evidence-validation status facade',
  );
}

function assertDoesNotReadRuntimeFiles(source) {
  assertCondition(
    !/\/QuantGod_.*\.(json|csv)/i.test(source),
    'GA stability UI must not read QuantGod runtime artifacts directly',
  );
}

function assertDoesNotExposeExecutionControls(source) {
  assertCondition(
    !/OrderSend|PositionClose|Telegram command|live preset/i.test(source),
    'GA stability UI must not expose execution controls',
  );
}

function assertFilesAreReadable() {
  for (const file of files) {
    const lineCount = readSource(file).split(/\r?\n/).length;
    const minLines = file.includes('/services/') ? 3 : 10;
    assertCondition(lineCount >= minLines, `${file} should remain readable multi-line source`);
  }
}

function main() {
  assertFilesAreReadable();
  const combined = files.map(readSource).join('\n');

  assertUsesProductionEvidenceFacade(combined);
  assertDoesNotReadRuntimeFiles(combined);
  assertDoesNotExposeExecutionControls(combined);

  if (failures.length > 0) {
    console.error('frontend GA stability guard failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('frontend GA stability guard passed');
}

main();
