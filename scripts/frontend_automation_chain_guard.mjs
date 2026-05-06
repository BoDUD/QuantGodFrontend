import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const required = [
  'src/services/automationChainApi.js',
  'src/components/AutomationChainPanel.vue',
];
for (const rel of required) {
  if (!existsSync(join(root, rel))) {
    throw new Error(`missing required automation chain frontend file: ${rel}`);
  }
}
const service = readFileSync(join(root, 'src/services/automationChainApi.js'), 'utf8');
const panel = readFileSync(join(root, 'src/components/AutomationChainPanel.vue'), 'utf8');
if (!service.includes('/api/automation-chain')) {
  throw new Error('automationChainApi must call /api/automation-chain only');
}
if (!service.includes('symbols=USDJPYc')) {
  throw new Error('automationChainApi must scope every request to USDJPYc');
}
if (/USDJPYc,EURUSDc,XAUUSDc/.test(service + panel)) {
  throw new Error('automation chain frontend must not default to multi-symbol scope');
}
if (/QuantGod_.*\.(json|csv)/i.test(service + panel)) {
  throw new Error('frontend automation chain must not read QuantGod runtime files directly');
}
if (/OrderSend|quick-trade|telegram command|privateKey|password|apiKey/i.test(service + panel)) {
  throw new Error('frontend automation chain contains forbidden execution/secret wording');
}
if (!panel.includes('USDJPY 实盘 EA 恢复状态') || !panel.includes('主状态来源') || !panel.includes('实盘候选') || !panel.includes('阻断原因') || !panel.includes('机会入场')) {
  throw new Error('AutomationChainPanel must expose Chinese status sections');
}
if (!panel.includes('USDJPY Live Loop') || !panel.includes('技术链路详情')) {
  throw new Error('AutomationChainPanel must explain USDJPY live loop source of truth');
}
console.log('frontend automation chain guard OK');
