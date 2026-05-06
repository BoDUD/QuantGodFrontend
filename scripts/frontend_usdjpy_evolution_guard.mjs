import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const errors = [];
const files = [
  'src/services/usdjpyStrategyLabApi.js',
  'src/components/USDJPYEvolutionPanel.vue',
  'src/workspaces/dashboard/DashboardWorkspace.vue',
];
const forbidden = /\/QuantGod_.*\.(json|csv)|OrderSend|quick-trade|telegramCommandExecutionAllowed\s*[:=]\s*true|fetch\s*\(/i;

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

const service = read('src/services/usdjpyStrategyLabApi.js');
for (const marker of [
  '/evolution/status',
  '/evolution/build',
  '/evolution/replay',
  '/evolution/tune',
  '/evolution/proposal',
  '/evolution/telegram-text',
  '/bar-replay/status',
  '/bar-replay/build',
  '/bar-replay/entry',
  '/bar-replay/exit',
  '/bar-replay/telegram-text',
]) {
  if (!service.includes(marker)) errors.push(`service missing ${marker}`);
}
if (!service.includes('fetchJson') || !service.includes('postJson')) {
  errors.push('service must use existing fetchJson/postJson helpers');
}

const panel = read('src/components/USDJPYEvolutionPanel.vue');
for (const marker of ['USDJPY 自学习闭环', '数据集', '回放', '参数候选', '实盘配置提案', '不会自动改实盘', '回放候选对比', '预期影响', '风险变化', '因果 bar/tick 回放', '未来后验只评分，不触发']) {
  if (!panel.includes(marker)) errors.push(`panel missing Chinese marker: ${marker}`);
}
if (!panel.includes('fetchUSDJPYEvolutionStatus') || !panel.includes('runUSDJPYEvolutionBuild') || !panel.includes('fetchUSDJPYBarReplayStatus') || !panel.includes('runUSDJPYBarReplayBuild')) {
  errors.push('panel must load and build through USDJPY evolution service helpers');
}

const dashboard = read('src/workspaces/dashboard/DashboardWorkspace.vue');
if (!dashboard.includes('USDJPYEvolutionPanel')) errors.push('Dashboard must mount USDJPYEvolutionPanel');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('frontend USDJPY evolution guard OK');
