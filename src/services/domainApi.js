import { fetchJson, fetchRows, postJson, queryString as params, rowsFromPayload } from './apiClient.js';

async function loadNamedEntries(entries, options = {}, concurrency = 6) {
  const results = {};
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length && !options.signal?.aborted) {
      const [key, loadEntry] = entries[cursor];
      cursor += 1;
      results[key] = await loadEntry(options);
    }
  }

  const workerCount = Math.min(concurrency, entries.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

export async function loadDashboardWorkspace(options = {}) {
  return loadNamedEntries(
    [
      ['latest', (requestOptions) => fetchJson('/api/latest', null, requestOptions)],
      ['state', (requestOptions) => fetchJson('/api/dashboard/state', null, requestOptions)],
      ['backtest', (requestOptions) => fetchJson('/api/dashboard/backtest-summary', null, requestOptions)],
      ['dailyReview', (requestOptions) => fetchJson('/api/daily-review', null, requestOptions)],
      ['dailyAutopilot', (requestOptions) => fetchJson('/api/daily-autopilot', null, requestOptions)],
      [
        'dailyAutopilotV2',
        (requestOptions) =>
          fetchJson('/api/usdjpy-strategy-lab/autonomous-agent/daily-autopilot-v2', null, requestOptions),
      ],
      [
        'agentOpsHealth',
        (requestOptions) =>
          fetchJson('/api/usdjpy-strategy-lab/agent-ops-health/status', null, requestOptions),
      ],
      [
        'telegramGateway',
        (requestOptions) =>
          fetchJson('/api/usdjpy-strategy-lab/telegram-gateway/status', null, requestOptions),
      ],
      ['mt5Snapshot', (requestOptions) => fetchJson('/api/mt5-readonly/snapshot', null, requestOptions)],
      ['polyRadar', (requestOptions) => fetchJson('/api/polymarket/radar?limit=8', null, requestOptions)],
      [
        'polyMarkets',
        (requestOptions) => fetchJson('/api/polymarket/markets?limit=8&sort=volume', null, requestOptions),
      ],
    ],
    options,
    4,
  );
}

export async function loadMt5Workspace(options = {}) {
  const focusSymbol = 'USDJPYc';
  const shadowLimit = 180;
  const tradeLimit = 200;
  const symbolQuery = params({ symbol: focusSymbol });
  const result = await loadNamedEntries(
    [
      ['status', (requestOptions) => fetchJson('/api/mt5-readonly/status', null, requestOptions)],
      ['account', (requestOptions) => fetchJson('/api/mt5-readonly/account', null, requestOptions)],
      [
        'positions',
        (requestOptions) => fetchJson(`/api/mt5-readonly/positions${symbolQuery}`, null, requestOptions),
      ],
      [
        'orders',
        (requestOptions) => fetchJson(`/api/mt5-readonly/orders${symbolQuery}`, null, requestOptions),
      ],
      ['symbols', (requestOptions) => fetchJson('/api/mt5-symbol-registry/symbols', null, requestOptions)],
      [
        'snapshot',
        (requestOptions) => fetchJson(`/api/mt5-readonly/snapshot${symbolQuery}`, null, requestOptions),
      ],
      ['latest', (requestOptions) => fetchJson('/api/latest', null, requestOptions)],
      [
        'closeHistory',
        (requestOptions) =>
          fetchRows(`/api/trades/close-history${params({ limit: tradeLimit })}`, requestOptions),
      ],
      [
        'tradeJournal',
        (requestOptions) => fetchRows(`/api/trades/journal${params({ limit: tradeLimit })}`, requestOptions),
      ],
      ['dailyReview', (requestOptions) => fetchJson('/api/daily-review', null, requestOptions)],
      ['dailyAutopilot', (requestOptions) => fetchJson('/api/daily-autopilot', null, requestOptions)],
      ['researchStats', (requestOptions) => fetchJson('/api/research/stats', null, requestOptions)],
      ['governanceAdvisor', (requestOptions) => fetchJson('/api/governance/advisor', null, requestOptions)],
      [
        'shadowSignals',
        (requestOptions) =>
          fetchJson(
            `/api/shadow/signals${params({ symbol: focusSymbol, limit: shadowLimit, days: 30 })}`,
            null,
            requestOptions,
          ),
      ],
      [
        'shadowOutcomes',
        (requestOptions) =>
          fetchJson(
            `/api/shadow/outcomes${params({ symbol: focusSymbol, limit: shadowLimit, days: 30 })}`,
            null,
            requestOptions,
          ),
      ],
      [
        'shadowCandidates',
        (requestOptions) =>
          fetchJson(
            `/api/shadow/candidates${params({ symbol: focusSymbol, limit: shadowLimit, days: 30 })}`,
            null,
            requestOptions,
          ),
      ],
      [
        'shadowCandidateOutcomes',
        (requestOptions) =>
          fetchJson(
            `/api/shadow/candidate-outcomes${params({ symbol: focusSymbol, limit: shadowLimit, days: 30 })}`,
            null,
            requestOptions,
          ),
      ],
      [
        'usdJpyLiveLoop',
        (requestOptions) => fetchJson('/api/usdjpy-strategy-lab/live-loop', null, requestOptions),
      ],
      [
        'evidenceOS',
        (requestOptions) => fetchJson('/api/usdjpy-strategy-lab/evidence-os/status', null, requestOptions),
      ],
      [
        'evidenceParity',
        (requestOptions) => fetchJson('/api/usdjpy-strategy-lab/evidence-os/parity', null, requestOptions),
      ],
      [
        'evidenceExecutionFeedback',
        (requestOptions) =>
          fetchJson('/api/usdjpy-strategy-lab/evidence-os/execution-feedback', null, requestOptions),
      ],
    ],
    options,
    5,
  );
  const mergedEvidenceOS = {
    ...(result.evidenceOS || {}),
    parity: result.evidenceParity || result.evidenceOS?.parity,
    executionFeedback: result.evidenceExecutionFeedback || result.evidenceOS?.executionFeedback,
  };
  return {
    ...result,
    evidenceOS: mergedEvidenceOS,
  };
}

export async function loadGovernanceWorkspace() {
  const [advisor, versionRegistry, promotionGate, optimizerV2] = await Promise.all([
    fetchJson('/api/governance/advisor'),
    fetchJson('/api/governance/version-registry'),
    fetchJson('/api/governance/promotion-gate'),
    fetchJson('/api/governance/optimizer-v2'),
  ]);
  return { advisor, versionRegistry, promotionGate, optimizerV2 };
}

export async function loadParamLabWorkspace(query = {}) {
  const limit = query.limit || 200;
  const [status, results, scheduler, recovery, reportWatcher, testerWindow, resultRows, schedulerRows] =
    await Promise.all([
      fetchJson('/api/paramlab/status'),
      fetchJson('/api/paramlab/results'),
      fetchJson('/api/paramlab/scheduler'),
      fetchJson('/api/paramlab/recovery'),
      fetchJson('/api/paramlab/report-watcher'),
      fetchJson('/api/paramlab/tester-window'),
      fetchRows(`/api/paramlab/results-ledger${params({ limit })}`),
      fetchRows(`/api/paramlab/scheduler-ledger${params({ limit })}`),
    ]);
  return { status, results, scheduler, recovery, reportWatcher, testerWindow, resultRows, schedulerRows };
}

export async function loadResearchWorkspace(query = {}) {
  const limit = query.limit || 300;
  const days = query.days || 30;
  const [
    stats,
    statsLedger,
    shadowSignals,
    shadowOutcomes,
    shadowCandidates,
    closeHistory,
    tradeJournal,
    strategyEvaluation,
    regimeEvaluation,
    manualAlpha,
  ] = await Promise.all([
    fetchJson('/api/research/stats'),
    fetchJson(`/api/research/stats-ledger${params({ limit })}`),
    fetchJson(`/api/shadow/signals${params({ limit, days })}`),
    fetchJson(`/api/shadow/outcomes${params({ limit, days })}`),
    fetchJson(`/api/shadow/candidates${params({ limit, days })}`),
    fetchRows(`/api/trades/close-history${params({ limit, days })}`),
    fetchRows(`/api/trades/journal${params({ limit, days })}`),
    fetchRows(`/api/research/strategy-evaluation${params({ limit })}`),
    fetchRows(`/api/research/regime-evaluation${params({ limit })}`),
    fetchRows(`/api/research/manual-alpha${params({ limit })}`),
  ]);
  return {
    stats,
    statsLedger,
    shadowSignals,
    shadowOutcomes,
    shadowCandidates,
    closeHistory,
    tradeJournal,
    strategyEvaluation,
    regimeEvaluation,
    manualAlpha,
  };
}

export async function loadPolymarketWorkspace(query = {}, options = {}) {
  const q = query.q || '';
  const limit = Number(query.limit) || 12;
  return loadNamedEntries(
    [
      [
        'search',
        (requestOptions) => fetchJson(`/api/polymarket/search${params({ q, limit })}`, null, requestOptions),
      ],
      [
        'radar',
        (requestOptions) => fetchJson(`/api/polymarket/radar${params({ limit })}`, null, requestOptions),
      ],
      ['worker', (requestOptions) => fetchJson('/api/polymarket/radar-worker', null, requestOptions)],
      ['aiScore', (requestOptions) => fetchJson('/api/polymarket/ai-score', null, requestOptions)],
      [
        'history',
        (requestOptions) =>
          fetchJson(`/api/polymarket/history${params({ table: 'all', limit })}`, null, requestOptions),
      ],
      [
        'autoGovernance',
        (requestOptions) => fetchJson('/api/polymarket/auto-governance', null, requestOptions),
      ],
      [
        'canary',
        (requestOptions) => fetchJson('/api/polymarket/canary-executor-contract', null, requestOptions),
      ],
      [
        'canaryRun',
        (requestOptions) => fetchJson('/api/polymarket/canary-executor-run', null, requestOptions),
      ],
      ['realTrades', (requestOptions) => fetchJson('/api/polymarket/real-trades', null, requestOptions)],
      ['cross', (requestOptions) => fetchJson('/api/polymarket/cross-linkage', null, requestOptions)],
      [
        'markets',
        (requestOptions) =>
          fetchJson(`/api/polymarket/markets${params({ limit, sort: 'volume' })}`, null, requestOptions),
      ],
      [
        'assets',
        (requestOptions) =>
          fetchJson(`/api/polymarket/asset-opportunities${params({ limit })}`, null, requestOptions),
      ],
      [
        'singleAnalysis',
        (requestOptions) => fetchJson('/api/polymarket/single-market-analysis', null, requestOptions),
      ],
      ['dailyReview', (requestOptions) => fetchJson('/api/daily-review', null, requestOptions)],
      [
        'canaryLedger',
        (requestOptions) =>
          fetchRows(`/api/polymarket/canary-executor-ledger${params({ limit: 80 })}`, requestOptions),
      ],
      [
        'autoGovernanceLedger',
        (requestOptions) =>
          fetchRows(`/api/polymarket/auto-governance-ledger${params({ limit: 80 })}`, requestOptions),
      ],
    ],
    options,
    5,
  );
}

export async function reloadWorkspace(key, query = {}) {
  const loaders = {
    dashboard: loadDashboardWorkspace,
    mt5: loadMt5Workspace,
    evolution: async () => ({}),
    governance: loadGovernanceWorkspace,
    paramlab: loadParamLabWorkspace,
    research: loadResearchWorkspace,
    polymarket: loadPolymarketWorkspace,
  };
  return loaders[key]?.(query) ?? null;
}

export { fetchJson, fetchRows, postJson, rowsFromPayload };
