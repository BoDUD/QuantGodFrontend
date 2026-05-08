import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const errors = [];
const files = [
  'src/services/usdjpyStrategyLabApi.js',
  'src/components/USDJPYEvolutionPanel.vue',
  'src/workspaces/dashboard/DashboardWorkspace.vue',
];
const forbidden =
  /\/QuantGod_.*\.(json|csv)|OrderSend|quick-trade|telegramCommandExecutionAllowed\s*[:=]\s*true|fetch\s*\(/i;

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
  '/walk-forward/status',
  '/walk-forward/build',
  '/walk-forward/selection',
  '/walk-forward/proposal',
  '/walk-forward/telegram-text',
  '/autonomous-agent/state',
  '/autonomous-agent/run',
  '/autonomous-agent/decision',
  '/autonomous-agent/patch',
  '/autonomous-agent/lifecycle',
  '/autonomous-agent/lanes',
  '/autonomous-agent/mt5-shadow',
  '/autonomous-agent/polymarket-shadow',
  '/autonomous-agent/ea-repro',
  '/autonomous-agent/daily-autopilot-v2',
  '/autonomous-agent/daily-autopilot-v2/run',
  '/autonomous-agent/daily-autopilot-v2/telegram-text',
  '/daily-todo',
  '/daily-todo/run',
  '/daily-todo/telegram-text',
  '/daily-review',
  '/daily-review/run',
  '/daily-review/telegram-text',
  '/autonomous-agent/telegram-text',
  '/ga/status',
  '/ga/run-generation',
  '/ga/generations',
  '/ga/candidates',
  '/ga/candidate/',
  '/ga/evolution-path',
  '/ga/blockers',
  '/ga/telegram-text',
  '/strategy-backtest/status',
  '/strategy-backtest/sample',
  '/strategy-backtest/run',
  '/strategy-backtest/telegram-text',
  '/strategy-backtest/sync-klines',
  '/evidence-os/status',
  '/evidence-os/run',
  '/evidence-os/parity',
  '/evidence-os/execution-feedback',
  '/evidence-os/case-memory',
  '/evidence-os/telegram-text',
  '/telegram-gateway/status',
  '/telegram-gateway/test-event',
  '/telegram-gateway/dispatch',
]) {
  if (!service.includes(marker)) errors.push(`service missing ${marker}`);
}
if (!service.includes('fetchJson') || !service.includes('postJson')) {
  errors.push('service must use existing fetchJson/postJson helpers');
}

const panel = read('src/components/USDJPYEvolutionPanel.vue');
for (const marker of [
  'USDJPY 自学习闭环',
  '数据集',
  '回放',
  '参数候选',
  '自主治理 Agent',
  '不会改源码或 live preset',
  '回放候选对比',
  '预期影响',
  '风险变化',
  '因果 bar/tick 回放',
  '未来后验只评分，不触发',
  'Walk-forward 稳定性筛选',
  '无需人工审批',
  '机器硬风控',
  '自动回滚',
  '三车道自主生命周期',
  '美分账户',
  'MT5 模拟车道',
  'Polymarket 模拟车道',
  'Daily Autopilot 2.0',
  'Agent 今日待办',
  'Agent 每日复盘',
  '下一阶段任务',
  'Strategy JSON',
  'GA Evolution',
  'Telegram Gateway',
  'EA 对账',
  'actionStatus',
  '因果回放已完成',
  '自主治理已完成',
  '自动日报已完成',
  '复盘闭环已完成',
  'GA 全过程审计',
  '运行 GA 一代',
  '第 {{ item.generation }} 代',
  '种子',
  'PF',
  '胜率',
  '最大回撤',
  'Sharpe / Sortino',
  '交易数',
  'Parity / 执行',
  '阻断原因',
  'Seed Detail',
  '完整审计',
  'Equity Curve / 权益曲线',
  'Lineage / 父代路径',
  'Mutation / Crossover 来源',
  '完整证据链',
  'fetchUSDJPYGACandidate',
  'selectGASeed',
  'gaEquityPolyline',
  'gaEvidenceChain',
  'gaLineageSummary',
  'fitnessBreakdown',
  'Strategy JSON 回测证据',
  '收益与回撤',
  '稳定性',
  '晋级证据',
  'gaBacktestMetric',
  'gaEvidenceGateSummary',
  'blockerCode',
  'selectedGASeed',
  'Strategy JSON 高保真回测',
  'Runner 覆盖',
  '全策略族',
  '交易成本',
  '逐 seed',
  '运行策略回测',
  'USDJPY SQLite K线',
  '策略回测已完成',
  '真实 K线入库',
  'Parity 校验',
  '三方 Parity',
  'Strategy JSON',
  'Python Replay',
  'MQL5 EA',
  'Parity 硬差异',
  'Parity 缺字段',
  'deepParity',
  '执行反馈',
  '执行反馈、Case Memory 与下一代 GA',
  '执行晋级门',
  '执行阻断',
  '执行警告',
  '执行反馈阻断',
  'Case → GA',
  '下一代 GA 变异提示',
  'gaSeedHints',
  'caseMemoryToGA',
  'promotionGate',
  'Case Memory',
  'Telegram Gateway',
  '待投递',
  'ledger 已接入',
  '生成证据 OS',
]) {
  if (!panel.includes(marker)) errors.push(`panel missing Chinese marker: ${marker}`);
}
if (panel.includes('patchAllowed') || panel.includes('待人工确认') || panel.includes('人工回灌。')) {
  errors.push('panel must use v2.5 Agent semantics without patchAllowed or human-backfill wording');
}
if (
  !panel.includes('fetchUSDJPYEvolutionStatus') ||
  !panel.includes('runUSDJPYEvolutionBuild') ||
  !panel.includes('fetchUSDJPYBarReplayStatus') ||
  !panel.includes('runUSDJPYBarReplayBuild') ||
  !panel.includes('fetchUSDJPYAutonomousAgent') ||
  !panel.includes('runUSDJPYAutonomousAgent')
) {
  errors.push('panel must load and build through USDJPY evolution service helpers');
}
if (
  !panel.includes('fetchUSDJPYGAStatus') ||
  !panel.includes('runUSDJPYGAGeneration') ||
  !panel.includes('fetchUSDJPYGACandidates') ||
  !panel.includes('fetchUSDJPYGAEvolutionPath')
) {
  errors.push('panel must load and run Strategy JSON GA through service helpers');
}
if (!panel.includes('fetchUSDJPYStrategyBacktestStatus') || !panel.includes('runUSDJPYStrategyBacktest')) {
  errors.push('panel must load and run Strategy JSON backtest through service helpers');
}
if (
  !panel.includes('fetchUSDJPYEvidenceOSStatus') ||
  !panel.includes('runUSDJPYEvidenceOS') ||
  !panel.includes('syncUSDJPYStrategyBacktestKlines') ||
  !panel.includes('fetchUSDJPYTelegramGatewayStatus')
) {
  errors.push('panel must load/run USDJPY evidence OS, Telegram Gateway, and sync real K-lines through service helpers');
}

const dashboard = read('src/workspaces/dashboard/DashboardWorkspace.vue');
if (!dashboard.includes('USDJPYEvolutionPanel')) errors.push('Dashboard must mount USDJPYEvolutionPanel');

const automationPanel = read('src/components/AutomationChainPanel.vue');
for (const marker of ['actionStatus', '运行完成', '刷新完成', 'USDJPY_LIVE_LOOP']) {
  if (!automationPanel.includes(marker))
    errors.push(`automation panel missing action feedback marker: ${marker}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('frontend USDJPY evolution guard OK');
