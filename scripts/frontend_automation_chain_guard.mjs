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
if (/QuantGod_.*\.(json|csv)/i.test(service + panel)) {
  throw new Error('frontend automation chain must not read QuantGod runtime files directly');
}
if (/OrderSend|quick-trade|telegram command|privateKey|password|apiKey/i.test(service + panel)) {
  throw new Error('frontend automation chain contains forbidden execution/secret wording');
}
if (!panel.includes('自动化链路') || !panel.includes('阻断原因') || !panel.includes('机会入场')) {
  throw new Error('AutomationChainPanel must expose Chinese status sections');
}
console.log('frontend automation chain guard OK');
