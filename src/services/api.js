import { fetchJson, fetchRows as fetchRowsJson, postJson } from './apiClient.js';

export async function loadDashboardState(query = '') {
  void query;

  const [
    latest,
    mt5Snapshot,
    governance,
    backtest,
    paramStatus,
    paramResults,
    paramAutoScheduler,
    paramReportWatcher,
    runRecovery,
    autoTesterWindow,
    dailyReview,
    dailyAutopilot,
    mt5ResearchStats,
    strategyRegistry,
    hfmCrypto,
    profitTarget,
    shadowSignalRows,
    shadowOutcomeRows,
    shadowCandidateRows,
    shadowCandidateOutcomeRows,
    closeHistoryRows,
    tradeJournalRows,
    paramLabResultRows,
    paramLabAutoSchedulerRows,
    paramLabReportWatcherRows,
    paramLabRunRecoveryRows,
    autoTesterWindowRows,
    mt5ResearchStatsRows,
    strategyEvaluationRows,
    regimeEvaluationRows,
    tradingAuditRows,
    manualAlphaRows,
  ] = await Promise.all([
    fetchJson('/api/latest'),
    fetchJson('/api/mt5-readonly/snapshot'),
    fetchJson('/api/governance/advisor'),
    fetchJson('/api/dashboard/backtest-summary'),
    fetchJson('/api/paramlab/status'),
    fetchJson('/api/paramlab/results'),
    fetchJson('/api/paramlab/scheduler'),
    fetchJson('/api/paramlab/report-watcher'),
    fetchJson('/api/paramlab/recovery'),
    fetchJson('/api/paramlab/tester-window'),
    fetchJson('/api/daily-review'),
    fetchJson('/api/daily-autopilot'),
    fetchJson('/api/research/stats'),
    fetchJson('/api/governance/version-registry'),
    fetchJson('/api/hfm-crypto/status?view=summary&scope=secondary'),
    fetchJson('/api/profit-target/status?scope=secondary'),
    fetchRowsJson('/api/shadow/signals?limit=500'),
    fetchRowsJson('/api/shadow/outcomes?limit=500'),
    fetchRowsJson('/api/shadow/candidates?limit=500'),
    fetchRowsJson('/api/shadow/candidate-outcomes?limit=500'),
    fetchRowsJson('/api/trades/close-history?limit=500'),
    fetchRowsJson('/api/trades/journal?limit=500'),
    fetchRowsJson('/api/paramlab/results-ledger?limit=500'),
    fetchRowsJson('/api/paramlab/scheduler-ledger?limit=500'),
    fetchRowsJson('/api/paramlab/report-watcher-ledger?limit=500'),
    fetchRowsJson('/api/paramlab/recovery-ledger?limit=500'),
    fetchRowsJson('/api/paramlab/tester-window-ledger?limit=500'),
    fetchRowsJson('/api/research/stats-ledger?limit=500'),
    fetchRowsJson('/api/research/strategy-evaluation?limit=500'),
    fetchRowsJson('/api/research/regime-evaluation?limit=500'),
    fetchRowsJson('/api/trades/trading-audit?limit=500'),
    fetchRowsJson('/api/research/manual-alpha?limit=500'),
  ]);

  return {
    mt5: {
      latest,
      snapshot: mt5Snapshot,
      governance,
      backtest,
      paramStatus,
      paramResults,
      paramAutoScheduler,
      paramReportWatcher,
      runRecovery,
      autoTesterWindow,
      dailyReview,
      dailyAutopilot,
      mt5ResearchStats,
      strategyRegistry,
      ledgers: {
        shadowSignals: shadowSignalRows,
        shadowOutcomes: shadowOutcomeRows,
        shadowCandidates: shadowCandidateRows,
        shadowCandidateOutcomes: shadowCandidateOutcomeRows,
        closeHistory: closeHistoryRows,
        tradeJournal: tradeJournalRows,
        paramLabResults: paramLabResultRows,
        paramLabAutoScheduler: paramLabAutoSchedulerRows,
        paramLabReportWatcher: paramLabReportWatcherRows,
        paramLabRunRecovery: paramLabRunRecoveryRows,
        autoTesterWindow: autoTesterWindowRows,
        mt5ResearchStats: mt5ResearchStatsRows,
        strategyEvaluation: strategyEvaluationRows,
        regimeEvaluation: regimeEvaluationRows,
        tradingAudit: tradingAuditRows,
        manualAlpha: manualAlphaRows,
      },
    },
    hfmCrypto,
    profitTarget,
  };
}

export async function evaluateAutoTesterWindow(payload = {}) {
  return postJson('/api/paramlab/auto-tester/evaluate', payload, {
    ok: false,
    error: 'auto_tester_evaluate_failed',
  });
}

export async function createAutoTesterLock(payload = {}) {
  return postJson('/api/paramlab/auto-tester/lock', payload, {
    ok: false,
    error: 'auto_tester_lock_failed',
  });
}

export async function startAutoTesterWindow(payload = {}) {
  return postJson('/api/paramlab/auto-tester/run', payload, {
    ok: false,
    error: 'auto_tester_run_failed',
  });
}
