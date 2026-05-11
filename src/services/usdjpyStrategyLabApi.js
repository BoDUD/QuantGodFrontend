import { fetchJson, postJson } from './domainApi.js';

const BASE = '/api/usdjpy-strategy-lab';

export function fetchUSDJPYStrategyLabStatus() {
  return fetchJson(`${BASE}/status`);
}

export function fetchUSDJPYStrategyCatalog() {
  return fetchJson(`${BASE}/catalog`);
}

export function fetchUSDJPYStrategySignals({ limit = 20 } = {}) {
  return fetchJson(`${BASE}/signals?limit=${encodeURIComponent(limit)}`);
}

export function runUSDJPYStrategySignals() {
  return postJson(`${BASE}/signals/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYStrategyBacktestPlan() {
  return fetchJson(`${BASE}/backtest-plan`);
}

export function buildUSDJPYStrategyBacktestPlan() {
  return postJson(`${BASE}/backtest-plan/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYImportedBacktests({ limit = 20 } = {}) {
  return fetchJson(`${BASE}/imported-backtests?limit=${encodeURIComponent(limit)}`);
}

export function importUSDJPYBacktest({ source, strategy = '' }) {
  return postJson(`${BASE}/import-backtest`, { source, strategy, focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYStrategyRiskCheck() {
  return fetchJson(`${BASE}/risk-check`);
}

export function fetchUSDJPYCandidatePolicy() {
  return fetchJson(`${BASE}/candidate-policy`);
}

export function buildUSDJPYCandidatePolicy() {
  return postJson(`${BASE}/candidate-policy/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYStrategyLabTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/telegram-text${query}`);
}

export function runUSDJPYStrategyLab() {
  return postJson(`${BASE}/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYStrategyDryRun() {
  return fetchJson(`${BASE}/dry-run`);
}

export function fetchUSDJPYLiveLoop({ write = false } = {}) {
  const query = write ? '?write=1' : '';
  return fetchJson(`${BASE}/live-loop${query}`);
}

export function runUSDJPYLiveLoop() {
  return postJson(`${BASE}/live-loop/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYLiveLoopTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/live-loop/telegram-text${query}`);
}

export function fetchUSDJPYEvolutionStatus() {
  return fetchJson(`${BASE}/evolution/status`);
}

export function runUSDJPYEvolutionBuild() {
  return postJson(`${BASE}/evolution/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYReplayReport({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/evolution/replay${query}`);
}

export function runUSDJPYReplayReport() {
  return postJson(`${BASE}/evolution/replay`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYParamTuning({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/evolution/tune${query}`);
}

export function runUSDJPYParamTuning() {
  return postJson(`${BASE}/evolution/tune`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYConfigProposal({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/evolution/proposal${query}`);
}

export function runUSDJPYConfigProposal() {
  return postJson(`${BASE}/evolution/proposal`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYEvolutionTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/evolution/telegram-text${query}`);
}

export function fetchUSDJPYBarReplayStatus({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/bar-replay/status${query}`);
}

export function runUSDJPYBarReplayBuild() {
  return postJson(`${BASE}/bar-replay/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYBarReplayEntry({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/bar-replay/entry${query}`);
}

export function fetchUSDJPYBarReplayExit({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/bar-replay/exit${query}`);
}

export function fetchUSDJPYBarReplayTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/bar-replay/telegram-text${query}`);
}

export function fetchUSDJPYWalkForwardStatus({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/walk-forward/status${query}`);
}

export function runUSDJPYWalkForwardBuild() {
  return postJson(`${BASE}/walk-forward/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYWalkForwardSelection({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/walk-forward/selection${query}`);
}

export function fetchUSDJPYWalkForwardProposal({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/walk-forward/proposal${query}`);
}

export function fetchUSDJPYWalkForwardTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/walk-forward/telegram-text${query}`);
}

export function fetchUSDJPYAutonomousAgent({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/state${query}`);
}

export function runUSDJPYAutonomousAgent() {
  return postJson(`${BASE}/autonomous-agent/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYAutonomousDecision({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/decision${query}`);
}

export function fetchUSDJPYAutonomousPatch({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/patch${query}`);
}

export function fetchUSDJPYAutonomousLifecycle({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/lifecycle${query}`);
}

export function fetchUSDJPYAutonomousLanes({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/lanes${query}`);
}

export function fetchUSDJPYMt5ShadowLane({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/mt5-shadow${query}`);
}

export function fetchUSDJPYPolymarketShadowLane({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/polymarket-shadow${query}`);
}

export function fetchUSDJPYEaReproducibility({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/ea-repro${query}`);
}

export function fetchUSDJPYDailyAutopilotV2({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/daily-autopilot-v2${query}`);
}

export function runUSDJPYDailyAutopilotV2() {
  return postJson(`${BASE}/autonomous-agent/daily-autopilot-v2/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYDailyAutopilotV2TelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/daily-autopilot-v2/telegram-text${query}`);
}

export function fetchUSDJPYAgentDailyTodo({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/daily-todo${query}`);
}

export function runUSDJPYAgentDailyTodo() {
  return postJson(`${BASE}/daily-todo/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYAgentDailyTodoTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/daily-todo/telegram-text${query}`);
}

export function fetchUSDJPYAgentDailyReview({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/daily-review${query}`);
}

export function runUSDJPYAgentDailyReview() {
  return postJson(`${BASE}/daily-review/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYAgentDailyReviewTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/daily-review/telegram-text${query}`);
}

export function fetchUSDJPYAutonomousTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/telegram-text${query}`);
}

export function fetchUSDJPYGAStatus({ write = false } = {}) {
  const query = write ? '?write=1' : '';
  return fetchJson(`${BASE}/ga/status${query}`);
}

export function runUSDJPYGAGeneration() {
  return postJson(`${BASE}/ga/run-generation`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYGAGenerations() {
  return fetchJson(`${BASE}/ga/generations`);
}

export function fetchUSDJPYGACandidates() {
  return fetchJson(`${BASE}/ga/candidates`);
}

export function fetchUSDJPYGACandidate(seedId) {
  return fetchJson(`${BASE}/ga/candidate/${encodeURIComponent(seedId)}`);
}

export function fetchUSDJPYGAEvolutionPath() {
  return fetchJson(`${BASE}/ga/evolution-path`);
}

export function fetchUSDJPYGABlockers() {
  return fetchJson(`${BASE}/ga/blockers`);
}

export function fetchUSDJPYGATelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/ga/telegram-text${query}`);
}

export function fetchUSDJPYStrategyContractStatus({ write = false } = {}) {
  const query = write ? '?write=1' : '';
  return fetchJson(`${BASE}/strategy-contract/status${query}`);
}

export function buildUSDJPYStrategyContract() {
  return postJson(`${BASE}/strategy-contract/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYStrategyContractTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/strategy-contract/telegram-text${query}`);
}

export function fetchUSDJPYStrategyBacktestStatus() {
  return fetchJson(`${BASE}/strategy-backtest/status`);
}

export function fetchUSDJPYStrategyBacktestProductionStatus() {
  return fetchJson(`${BASE}/strategy-backtest/production-status`);
}

export function seedUSDJPYStrategyBacktest({ overwrite = false } = {}) {
  const query = overwrite ? '?overwrite=1' : '';
  return postJson(`${BASE}/strategy-backtest/sample${query}`, { focusSymbol: 'USDJPYc' });
}

export function runUSDJPYStrategyBacktest() {
  return postJson(`${BASE}/strategy-backtest/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYStrategyBacktestTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/strategy-backtest/telegram-text${query}`);
}

export function syncUSDJPYStrategyBacktestKlines() {
  return postJson(`${BASE}/strategy-backtest/sync-klines`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYEvidenceOSStatus() {
  return fetchJson(`${BASE}/evidence-os/status`);
}

export function runUSDJPYEvidenceOS() {
  return postJson(`${BASE}/evidence-os/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYEvidenceOSParity() {
  return fetchJson(`${BASE}/evidence-os/parity`);
}

export function fetchUSDJPYExecutionFeedback() {
  return fetchJson(`${BASE}/evidence-os/execution-feedback`);
}

export function fetchUSDJPYCaseMemory() {
  return fetchJson(`${BASE}/evidence-os/case-memory`);
}

export function fetchUSDJPYEvidenceOSTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/evidence-os/telegram-text${query}`);
}

export function fetchUSDJPYTelegramGatewayStatus() {
  return fetchJson(`${BASE}/telegram-gateway/status`);
}

export function enqueueUSDJPYTelegramGatewayTest({ text = '' } = {}) {
  return postJson(`${BASE}/telegram-gateway/test-event`, {
    focusSymbol: 'USDJPYc',
    text:
      text ||
      '【QuantGod Telegram Gateway 测试】独立 Gateway 已接入队列、去重、限频和投递账本；不会接收交易命令。',
  });
}

export function dispatchUSDJPYTelegramGateway({ send = false, limit = 8 } = {}) {
  const params = new URLSearchParams();
  if (send) params.set('send', '1');
  if (limit) params.set('limit', String(limit));
  const query = params.toString() ? `?${params.toString()}` : '';
  return postJson(`${BASE}/telegram-gateway/dispatch${query}`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYAgentOpsHealth({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/agent-ops-health/status${query}`);
}
