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
      ['accountProfiles', (requestOptions) => fetchJson('/api/mt5/account-profiles', null, requestOptions)],
      ['account', (requestOptions) => fetchJson('/api/mt5-readonly/account', null, requestOptions)],
      [
        'secondaryAccount',
        (requestOptions) =>
          fetchJson('/api/mt5-readonly-secondary/account', null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
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
      [
        'secondarySnapshot',
        (requestOptions) =>
          fetchJson(`/api/mt5-readonly-secondary/snapshot${symbolQuery}`, null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      ['latest', (requestOptions) => fetchJson('/api/latest', null, requestOptions)],
      [
        'closeHistory',
        (requestOptions) =>
          fetchRows(`/api/trades/close-history${params({ limit: tradeLimit })}`, requestOptions),
      ],
      [
        'secondaryCloseHistory',
        (requestOptions) =>
          fetchRows(
            `/api/trades/close-history${params({ limit: tradeLimit, scope: 'secondary' })}`,
            requestOptions,
          ),
      ],
      [
        'tradeJournal',
        (requestOptions) => fetchRows(`/api/trades/journal${params({ limit: tradeLimit })}`, requestOptions),
      ],
      [
        'secondaryTradeJournal',
        (requestOptions) =>
          fetchRows(
            `/api/trades/journal${params({ limit: tradeLimit, scope: 'secondary' })}`,
            requestOptions,
          ),
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
          fetchJson('/api/usdjpy-strategy-lab/evidence-os/execution-feedback', null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
    ],
    options,
    8,
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
  const limit = Number(query.limit) || 12;
  return loadNamedEntries(
    [
      [
        'copyTraderDiscovery',
        (requestOptions) => fetchJson('/api/polymarket/copy-trader-discovery', null, requestOptions),
      ],
      [
        'copyTraderShadowReplay',
        (requestOptions) => fetchJson('/api/polymarket/copy-trader-shadow-replay', null, requestOptions),
      ],
      [
        'copyTraderWalkForward',
        (requestOptions) => fetchJson('/api/polymarket/copy-trader-walk-forward', null, requestOptions),
      ],
      [
        'copyTraderSourceBuckets',
        (requestOptions) => fetchJson('/api/polymarket/copy-trader-source-buckets', null, requestOptions),
      ],
      ['research', (requestOptions) => fetchJson('/api/polymarket/research', null, requestOptions)],
      [
        'retunePlanner',
        (requestOptions) => fetchJson('/api/polymarket/retune-planner', null, requestOptions),
      ],
      [
        'isolatedClobRuntime',
        (requestOptions) => fetchJson('/api/polymarket/isolated-clob-runtime', null, requestOptions),
      ],
      ['dailyReview', (requestOptions) => fetchJson('/api/daily-review', null, requestOptions)],
      [
        'researchLedger',
        (requestOptions) => fetchRows(`/api/polymarket/research-ledger${params({ limit })}`, requestOptions),
      ],
      [
        'isolatedClobRuntimeLedger',
        (requestOptions) =>
          fetchRows(`/api/polymarket/isolated-clob-runtime-ledger${params({ limit })}`, requestOptions),
      ],
      [
        'copyTraderDiscoveryLedger',
        (requestOptions) =>
          fetchRows(`/api/polymarket/copy-trader-discovery-ledger${params({ limit })}`, requestOptions),
      ],
      [
        'copyTraderShadowReplayLedger',
        (requestOptions) =>
          fetchRows(
            `/api/polymarket/copy-trader-shadow-replay-ledger${params({ limit: Math.max(limit, 24) })}`,
            requestOptions,
          ),
      ],
      [
        'copyTraderOutcomeLedger',
        (requestOptions) =>
          fetchRows(
            `/api/polymarket/copy-trader-outcome-ledger${params({ limit: Math.max(limit, 24) })}`,
            requestOptions,
          ),
      ],
      [
        'copyTraderWalkForwardLedger',
        (requestOptions) =>
          fetchRows(
            `/api/polymarket/copy-trader-walk-forward-ledger${params({ limit: Math.max(limit, 12) })}`,
            requestOptions,
          ),
      ],
      [
        'copyTraderSourceBucketsLedger',
        (requestOptions) =>
          fetchRows(
            `/api/polymarket/copy-trader-source-buckets-ledger${params({ limit: Math.max(limit, 24) })}`,
            requestOptions,
          ),
      ],
    ],
    options,
    8,
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
