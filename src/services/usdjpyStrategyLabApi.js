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

export function fetchUSDJPYAutonomousTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/autonomous-agent/telegram-text${query}`);
}
