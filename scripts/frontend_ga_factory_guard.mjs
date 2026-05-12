import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const errors = [];
const files = [
  'src/services/gaFactoryApi.js',
  'src/services/strategyGaFactoryApi.js',
  'src/components/USDJPYGAFactoryPanel.vue',
  'src/components/USDJPYEvolutionPanel.vue',
  'package.json',
];
const forbidden =
  /\/QuantGod_.*\.(json|csv|jsonl)|runtime\/ga_factory|OrderSend|telegramCommandExecutionAllowed\s*[:=]\s*true|fetch\s*\(/i;

function read(rel) {
  const full = path.join(repoRoot, rel);
  if (!fs.existsSync(full)) {
    errors.push(`${rel} is missing`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

for (const file of files) {
  const text = read(file);
  if (forbidden.test(text)) errors.push(`${file} contains forbidden runtime or execution pattern`);
}

const aliasService = read('src/services/gaFactoryApi.js');
for (const marker of [
  '/api/ga-factory',
  '/status',
  '/build',
  '/telegram-text',
  'fetchGAFactoryStatus',
  'buildGAFactory',
  'fetchGAFactoryTelegramText',
]) {
  if (!aliasService.includes(marker)) errors.push(`GA factory alias service missing ${marker}`);
}

const packageJson = JSON.parse(read('package.json') || '{}');
if (packageJson.scripts?.['ga-factory'] !== 'node scripts/frontend_ga_factory_guard.mjs') {
  errors.push('package.json must define scripts.ga-factory');
}
if (packageJson.scripts?.['test:ga-factory'] !== 'node --test tests/frontend_ga_factory_guard.test.mjs') {
  errors.push('package.json must define scripts.test:ga-factory');
}

if (!read('src/components/USDJPYGAFactoryPanel.vue').includes('GA Factory 生产化')) {
  errors.push('GA Factory panel must be wired');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('frontend GA Factory guard OK');
