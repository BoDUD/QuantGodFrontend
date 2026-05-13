import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  'src/components/ExecutionFeedbackCoverageCard.vue',
  'src/components/USDJPYEvolutionPanel.vue',
  'src/services/productionEvidenceApi.js',
];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  assert.ok(lines.length >= 10, `${file} should be readable multi-line source`);
  assert.equal(/QuantGod_.*\.(json|csv|jsonl)/.test(text), false, `${file} must not read runtime files directly`);
  assert.equal(/OrderSend|PositionClose|TRADE_ACTION_DEAL/.test(text), false, `${file} contains trading token`);
}

const card = readFileSync('src/components/ExecutionFeedbackCoverageCard.vue', 'utf8');
for (const marker of ['执行反馈样本覆盖率', 'coverageGrade', 'fieldCoverage', 'coreCoverage', 'numericSummary']) {
  assert.ok(card.includes(marker), `missing execution feedback coverage marker ${marker}`);
}

const panel = readFileSync('src/components/USDJPYEvolutionPanel.vue', 'utf8');
assert.ok(panel.includes('ExecutionFeedbackCoverageCard'), 'Evolution panel should show execution feedback coverage');

console.log('frontend execution feedback coverage guard OK');
