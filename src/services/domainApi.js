import { fetchJson, fetchRows, postJson, queryString as params, rowsFromPayload } from './apiClient.js';

const HFM_CRYPTO_ACCOUNT_SCOPE = 'secondary';

function scopedHfmCryptoPath(path, query = {}) {
  return `${path}${params({ ...query, scope: query.scope || HFM_CRYPTO_ACCOUNT_SCOPE })}`;
}

function scopedLiveAutomationPath(path, query = {}) {
  return `${path}${params({ ...query, scope: query.scope || HFM_CRYPTO_ACCOUNT_SCOPE })}`;
}

function scopedProfitTargetPath(path, query = {}) {
  return `${path}${params({ ...query, scope: query.scope || HFM_CRYPTO_ACCOUNT_SCOPE, targetUsd: query.targetUsd || 50 })}`;
}

function scopedUSDJPYStrategyPath(path, query = {}) {
  return `${path}${params({ ...query, scope: query.scope || HFM_CRYPTO_ACCOUNT_SCOPE })}`;
}

async function loadNamedEntries(entries, options = {}, concurrency = 6) {
  const results = {};
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length && !options.signal?.aborted) {
      const [key, loadEntry] = entries[cursor];
      cursor += 1;
      try {
        results[key] = await loadEntry(options);
      } catch (error) {
        results[key] = {
          ok: false,
          status: 0,
          error: {
            message: error?.message || String(error),
          },
          endpointLoadFailed: true,
        };
      }
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
          fetchJson(
            scopedUSDJPYStrategyPath('/api/usdjpy-strategy-lab/autonomous-agent/daily-autopilot-v2'),
            null,
            requestOptions,
          ),
      ],
      [
        'agentOpsHealth',
        (requestOptions) =>
          fetchJson(
            scopedUSDJPYStrategyPath('/api/usdjpy-strategy-lab/agent-ops-health/status'),
            null,
            requestOptions,
          ),
      ],
      [
        'telegramGateway',
        (requestOptions) =>
          fetchJson('/api/usdjpy-strategy-lab/telegram-gateway/status', null, requestOptions),
      ],
      ['mt5Snapshot', (requestOptions) => fetchJson('/api/mt5-readonly/snapshot', null, requestOptions)],
      [
        'secondaryMt5Snapshot',
        (requestOptions) => fetchJson('/api/mt5-readonly-secondary/snapshot', null, requestOptions),
      ],
      [
        'hfmCrypto',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/status', { view: 'summary' }), null, requestOptions),
      ],
      [
        'profitTarget',
        (requestOptions) =>
          fetchJson(scopedProfitTargetPath('/api/profit-target/status'), null, requestOptions),
      ],
      [
        'liveAutomationOrchestrator',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/orchestrator'), null, requestOptions),
      ],
      [
        'championPromotionGate',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/champion-promotion-gate'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'liveAutomationReleaseReadiness',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-readiness-refresh'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseTokenEvidenceReview',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-token-evidence-review'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseTokenSignoffDraft',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-token-signoff-draft'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseTokenSignoffInputTemplate',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/release-token-signoff-input-template'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'releaseTokenSignoffInputReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/release-token-signoff-input-review'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'releaseTokenSignoffHandoff',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-token-signoff-handoff'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'liveExecutionLaneSelector',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/lane-selector'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'forexLive12RuntimeHandoff',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/forex-live12-runtime-handoff'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'forexLive12CapacityExpansionReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/forex-live12-capacity-expansion-review'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'forexLive12CapacityExpansionRoadmap',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/forex-live12-capacity-expansion-roadmap'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'forexLive12MicroExpansionReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/forex-live12-micro-expansion-review'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'forexLive12RsiRepairPlan',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/forex-live12-rsi-repair-plan'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'forexLive12RsiShadowCandidate',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/forex-live12-rsi-shadow-candidate'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'forexLive12RsiTesterRequest',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/forex-live12-rsi-tester-request'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'forexLive12RsiTesterRunGate',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/forex-live12-rsi-tester-run-gate'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'forexLive12RsiCandidatePromotionGate',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/forex-live12-rsi-candidate-promotion-gate'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'forexLive12RsiTesterLockDraft',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/forex-live12-rsi-tester-lock-draft'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'simTargetExecutionReviewSummary',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/sim-target-execution-review-summary'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
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
      ['positions', (requestOptions) => fetchJson('/api/mt5-readonly/positions', null, requestOptions)],
      ['orders', (requestOptions) => fetchJson('/api/mt5-readonly/orders', null, requestOptions)],
      ['symbols', (requestOptions) => fetchJson('/api/mt5-symbol-registry/symbols', null, requestOptions)],
      ['snapshot', (requestOptions) => fetchJson('/api/mt5-readonly/snapshot', null, requestOptions)],
      [
        'secondarySnapshot',
        (requestOptions) =>
          fetchJson('/api/mt5-readonly-secondary/snapshot', null, {
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

export async function loadHfmCryptoWorkspace(options = {}) {
  return loadNamedEntries(
    [
      [
        'mt5Snapshot',
        (requestOptions) => fetchJson('/api/mt5-readonly-secondary/snapshot', null, requestOptions),
      ],
      [
        'status',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/status', { view: 'summary' }), null, requestOptions),
      ],
      [
        'contractSpecExport',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/contract-spec-export'), null, requestOptions),
      ],
      [
        'executionSpec',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/execution-spec'), null, requestOptions),
      ],
      [
        'liveReadiness',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/status'), null, requestOptions),
      ],
      [
        'profitTarget',
        (requestOptions) =>
          fetchJson(scopedProfitTargetPath('/api/profit-target/status'), null, requestOptions),
      ],
      [
        'releaseReadinessRefresh',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-readiness-refresh'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseMinimalDiffReview',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-minimal-diff-review'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseTokenEvidenceReview',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-token-evidence-review'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseTokenSignoffDraft',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-token-signoff-draft'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseTokenSignoffInputTemplate',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/release-token-signoff-input-template'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'releaseTokenSignoffInputReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/release-token-signoff-input-review'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'releaseTokenSignoffHandoff',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-token-signoff-handoff'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
    ],
    options,
    4,
  );
}

export async function loadHfmCryptoWorkspaceDetails(options = {}) {
  return loadNamedEntries(
    [
      [
        'symbols',
        (requestOptions) => fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/symbols'), null, requestOptions),
      ],
      [
        'simulationProfile',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/simulation-profile'), null, requestOptions),
      ],
      [
        'mt5ExporterReview',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/mt5-exporter-review'), null, requestOptions),
      ],
      [
        'mt5UpgradeBundle',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/mt5-upgrade-bundle'), null, requestOptions),
      ],
      [
        'mt5ExporterDeployPlan',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/mt5-exporter-deploy-plan'), null, requestOptions),
      ],
      [
        'standaloneExporterBundle',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/standalone-exporter-bundle'), null, requestOptions),
      ],
      [
        'mt5PostUpgradeVerify',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/mt5-post-upgrade-verify'), null, requestOptions),
      ],
      [
        'postUpgradeController',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/post-upgrade-controller'), null, requestOptions),
      ],
      [
        'filledInputValidator',
        (requestOptions) =>
          fetchJson(scopedHfmCryptoPath('/api/hfm-crypto/filled-input-validator'), null, requestOptions),
      ],
      [
        'liveReviewPacket',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/review-packet'), null, requestOptions),
      ],
      [
        'liveApprovalDraft',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/approval-draft'), null, requestOptions),
      ],
      [
        'liveApprovalEvidence',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/approval-evidence'), null, requestOptions),
      ],
      [
        'dryRunPlan',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/dry-run-plan'), null, requestOptions),
      ],
      [
        'executionLaneSpec',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/execution-lane-spec'),
            null,
            requestOptions,
          ),
      ],
      [
        'dryRunReplay',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/dry-run-replay'), null, requestOptions),
      ],
      [
        'runtimePreflight',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/runtime-preflight'), null, requestOptions),
      ],
      [
        'orderRequestContract',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/order-request-contract'),
            null,
            requestOptions,
          ),
      ],
      [
        'simToLivePipeline',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/pipeline'), null, requestOptions),
      ],
      [
        'executionAdapterReview',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/adapter-review'), null, requestOptions),
      ],
      [
        'liveEvidenceIntake',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/evidence-intake'), null, requestOptions),
      ],
      [
        'livePromotionCandidates',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/promotion-candidates'),
            null,
            requestOptions,
          ),
      ],
      [
        'livePromotionController',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/promotion-controller'),
            null,
            requestOptions,
          ),
      ],
      [
        'adapterSandbox',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/adapter-sandbox'), null, requestOptions),
      ],
      [
        'adapterContractValidator',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/adapter-contract-validator'),
            null,
            requestOptions,
          ),
      ],
      [
        'simToLiveOrchestrator',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/orchestrator'), null, requestOptions),
      ],
      [
        'releaseReadinessRefresh',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-readiness-refresh'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseMinimalDiffReview',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-minimal-diff-review'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseTokenEvidenceReview',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-token-evidence-review'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseTokenSignoffDraft',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-token-signoff-draft'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'releaseTokenSignoffInputTemplate',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/release-token-signoff-input-template'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'releaseTokenSignoffInputReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/release-token-signoff-input-review'),
            null,
            {
              ...requestOptions,
              timeoutMs: 10000,
            },
          ),
      ],
      [
        'releaseTokenSignoffHandoff',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/release-token-signoff-handoff'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'laneSelector',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/lane-selector'), null, {
            ...requestOptions,
            timeoutMs: 10000,
          }),
      ],
      [
        'executionAdapterHarness',
        (requestOptions) =>
          fetchJson(scopedLiveAutomationPath('/api/live-automation/adapter-harness'), null, requestOptions),
      ],
      [
        'livePilotActivationReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/live-pilot-activation-review'),
            null,
            requestOptions,
          ),
      ],
      [
        'receiptReconciliationReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/receipt-reconciliation-review'),
            null,
            requestOptions,
          ),
      ],
      [
        'eaRequestReaderReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/ea-request-reader-review'),
            null,
            requestOptions,
          ),
      ],
      [
        'liveExecutionCutoverReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/live-execution-cutover-review'),
            null,
            requestOptions,
          ),
      ],
      [
        'liveExecutionImplementationSpec',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/live-execution-implementation-spec'),
            null,
            requestOptions,
          ),
      ],
      [
        'liveExecutionAdapterWriteReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/live-execution-adapter-write-review'),
            null,
            requestOptions,
          ),
      ],
      [
        'eaRequestConsumptionReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/ea-request-consumption-review'),
            null,
            requestOptions,
          ),
      ],
      [
        'brokerOrderSendReview',
        (requestOptions) =>
          fetchJson(
            scopedLiveAutomationPath('/api/live-automation/broker-order-send-review'),
            null,
            requestOptions,
          ),
      ],
    ],
    options,
    6,
  );
}

export async function buildHfmCryptoWorkspace(query = {}, options = {}) {
  return postJson(
    scopedHfmCryptoPath('/api/hfm-crypto/build', {
      mossBacktestJson: query.mossBacktestJson,
      simulationProfileJson: query.simulationProfileJson || query.mossBacktestJson,
      hfmContractSpecJson: query.hfmContractSpecJson,
      extraBasesRoot: query.extraBasesRoot,
      scope: query.scope,
    }),
    {},
    null,
    options,
  );
}

export async function buildHfmCryptoExecutionSpec(query = {}, options = {}) {
  return postJson(
    scopedHfmCryptoPath('/api/hfm-crypto/execution-spec/build', {
      hfmContractSpecJson: query.hfmContractSpecJson,
      scope: query.scope,
    }),
    {},
    null,
    options,
  );
}

export async function buildHfmCryptoContractSpecExport(query = {}, options = {}) {
  return postJson(
    scopedHfmCryptoPath('/api/hfm-crypto/contract-spec-export/build', {
      hfmSymbolRegistryJson: query.hfmSymbolRegistryJson || query.symbolRegistryJson,
      liveMt5: query.liveMt5,
      terminalPath: query.terminalPath,
      scope: query.scope,
    }),
    {},
    null,
    options,
  );
}

export async function buildHfmCryptoSimulationProfile(query = {}, options = {}) {
  return postJson(
    scopedHfmCryptoPath('/api/hfm-crypto/simulation-profile/build', {
      simulationProfileJson: query.simulationProfileJson || query.mossBacktestJson,
      scope: query.scope,
    }),
    {},
    null,
    options,
  );
}

export async function buildHfmCryptoEvidenceKit(options = {}) {
  return postJson(scopedHfmCryptoPath('/api/hfm-crypto/evidence-kit/build'), {}, null, options);
}

export async function buildHfmCryptoEvidenceBootstrap(query = {}, options = {}) {
  return postJson(
    scopedHfmCryptoPath('/api/hfm-crypto/evidence-bootstrap/build', {
      overwriteDrafts: query.overwriteDrafts,
      scope: query.scope,
    }),
    {},
    null,
    options,
  );
}

export async function buildHfmCryptoMt5ExporterReview(options = {}) {
  return postJson(scopedHfmCryptoPath('/api/hfm-crypto/mt5-exporter-review/build'), {}, null, options);
}

export async function buildHfmCryptoMt5UpgradeBundle(options = {}) {
  return postJson(scopedHfmCryptoPath('/api/hfm-crypto/mt5-upgrade-bundle/build'), {}, null, options);
}

export async function buildHfmCryptoMt5ExporterDeployPlan(options = {}) {
  return postJson(scopedHfmCryptoPath('/api/hfm-crypto/mt5-exporter-deploy-plan/build'), {}, null, options);
}

export async function buildHfmCryptoStandaloneExporterBundle(options = {}) {
  return postJson(scopedHfmCryptoPath('/api/hfm-crypto/standalone-exporter-bundle/build'), {}, null, options);
}

export async function buildHfmCryptoMt5PostUpgradeVerify(options = {}) {
  return postJson(scopedHfmCryptoPath('/api/hfm-crypto/mt5-post-upgrade-verify/build'), {}, null, options);
}

export async function buildHfmCryptoPostUpgradeController(options = {}) {
  return postJson(scopedHfmCryptoPath('/api/hfm-crypto/post-upgrade-controller/build'), {}, null, options);
}

export async function buildHfmCryptoFilledInputValidator(options = {}) {
  return postJson(scopedHfmCryptoPath('/api/hfm-crypto/filled-input-validator/build'), {}, null, options);
}

function liveAutomationBuildQuery(query = {}) {
  return {
    operatorApprovalJson: query.operatorApprovalJson,
    adapterRequestJson: query.adapterRequestJson || query.requestJson,
    receiptJson: query.receiptJson,
    eaSourcePath: query.eaSourcePath,
    eaStatusJson: query.eaStatusJson,
    mossBacktestJson: query.mossBacktestJson,
    hfmSimulationProfileJson:
      query.hfmSimulationProfileJson || query.simulationProfileJson || query.mossBacktestJson,
    hfmContractSpecJson: query.hfmContractSpecJson,
    extraBasesRoot: query.extraBasesRoot,
    refreshSources: query.refreshSources,
    scope: query.scope,
  };
}

function postLiveAutomationBuild(path, query = {}, options = {}) {
  return postJson(scopedLiveAutomationPath(path, liveAutomationBuildQuery(query)), {}, null, options);
}

function postLiveAutomationBodyBuild(path, query = {}, body = {}, options = {}) {
  return postJson(scopedLiveAutomationPath(path, liveAutomationBuildQuery(query)), body || {}, null, options);
}

export async function buildLiveAutomationReadiness(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/build', query, options);
}

export async function buildLiveReviewPacket(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/review-packet/build', query, options);
}

export async function buildLiveApprovalDraft(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/approval-draft/build', query, options);
}

export async function buildLiveApprovalEvidence(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/approval-evidence/build', query, options);
}

export async function buildDryRunLivePlan(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/dry-run-plan/build', query, options);
}

export async function buildLiveExecutionLaneSpec(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/execution-lane-spec/build', query, options);
}

export async function buildLiveDryRunReplay(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/dry-run-replay/build', query, options);
}

export async function buildLiveRuntimePreflight(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/runtime-preflight/build', query, options);
}

export async function buildLiveOrderRequestContract(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/order-request-contract/build', query, options);
}

export async function buildSimToLivePipeline(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/pipeline/build', query, options);
}

export async function buildExecutionAdapterReview(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/adapter-review/build', query, options);
}

export async function buildLiveEvidenceIntake(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/evidence-intake/build', query, options);
}

export async function buildLivePromotionCandidates(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/promotion-candidates/build', query, options);
}

export async function buildLivePromotionController(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/promotion-controller/build', query, options);
}

export async function buildAdapterSandbox(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/adapter-sandbox/build', query, options);
}

export async function buildAdapterContractValidator(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/adapter-contract-validator/build', query, options);
}

export async function buildSimToLiveOrchestrator(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/orchestrator/build', query, options);
}

export async function buildExecutionAdapterHarness(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/adapter-harness/build', query, options);
}

export async function buildLivePilotActivationReview(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/live-pilot-activation-review/build', query, options);
}

export async function buildReceiptReconciliationReview(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/receipt-reconciliation-review/build', query, options);
}

export async function buildEaRequestReaderReview(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/ea-request-reader-review/build', query, options);
}

export async function buildLiveExecutionCutoverReview(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/live-execution-cutover-review/build', query, options);
}

export async function buildLiveExecutionImplementationSpec(query = {}, options = {}) {
  return postLiveAutomationBuild(
    '/api/live-automation/live-execution-implementation-spec/build',
    query,
    options,
  );
}

export async function buildLiveExecutionAdapterWriteReview(query = {}, options = {}) {
  return postLiveAutomationBuild(
    '/api/live-automation/live-execution-adapter-write-review/build',
    query,
    options,
  );
}

export async function buildEaRequestConsumptionReview(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/ea-request-consumption-review/build', query, options);
}

export async function buildBrokerOrderSendReview(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/broker-order-send-review/build', query, options);
}

export async function buildReleaseTokenSignoffInputReview(query = {}, signoffInput = {}, options = {}) {
  const body =
    typeof signoffInput === 'string'
      ? { signoffJson: signoffInput }
      : signoffInput && typeof signoffInput === 'object'
        ? signoffInput
        : {};
  return postLiveAutomationBodyBuild(
    '/api/live-automation/release-token-signoff-input-review/build',
    query,
    body,
    options,
  );
}

export async function buildReleaseTokenSignoffHandoff(query = {}, options = {}) {
  return postLiveAutomationBuild('/api/live-automation/release-token-signoff-handoff/build', query, options);
}

export async function reloadWorkspace(key, query = {}) {
  const loaders = {
    dashboard: loadDashboardWorkspace,
    mt5: loadMt5Workspace,
    evolution: async () => ({}),
    governance: loadGovernanceWorkspace,
    paramlab: loadParamLabWorkspace,
    research: loadResearchWorkspace,
    'hfm-crypto': loadHfmCryptoWorkspace,
  };
  return loaders[key]?.(query) ?? null;
}

export { fetchJson, fetchRows, postJson, rowsFromPayload };
