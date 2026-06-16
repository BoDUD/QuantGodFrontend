import { describe, expect, it } from 'vitest';

import {
  buildDailyReviewRows,
  buildDailyTodoRows,
  buildActivationGateRows,
  buildDashboardMetrics,
  buildDailyItems,
  buildEndpointHealth,
  buildRuntimeSourceDiagnosticRows,
  buildSnapshotRootCauseBanner,
  buildSnapshotRecoveryItems,
  buildSnapshotRecoveryRows,
  buildFrontendSnapshotRecoveryRows,
  buildCoreEvidenceRecoveryRows,
  buildRuntimeItems,
  buildProfitTargetItems,
  normalizeDashboardSnapshot,
  buildReleaseGateRows,
} from '../../src/workspaces/dashboard/dashboardModel.js';

describe('dashboardModel', () => {
  it('surfaces stale /api/latest freshness instead of treating old MT5 data as normal', () => {
    const raw = {
      latest: {
        account: { number: 186054398, server: 'HFMarketsGlobal-Live12', currency: 'USC', equity: 10220.35 },
        _freshness: {
          mode: 'LATEST_DASHBOARD_MTIME_WATCH',
          status: 'STALE_DASHBOARD_SNAPSHOT',
          statusZh: 'MT5 dashboard 快照已过期',
          stale: true,
          fresh: false,
          ageSeconds: 7103.2,
          nextActionZh: '恢复主 MT5/EA 进程并刷新 QuantGod_Dashboard.json。',
          blockers: ['live_dashboard_snapshot_stale'],
        },
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const metrics = buildDashboardMetrics(snapshot);
    const freshnessMetric = metrics.find((item) => item.label === 'MT5 快照新鲜度');
    const equityMetric = metrics.find((item) => item.label === '账户净值');
    const positionsMetric = metrics.find((item) => item.label === '当前持仓');
    const runtimeItems = buildRuntimeItems(snapshot);
    const sourceRows = buildRuntimeSourceDiagnosticRows(raw);
    const latestHealth = buildEndpointHealth(raw).find((item) => item.endpoint === '/api/latest');

    expect(snapshot.latestDashboardStale).toBe(true);
    expect(snapshot.runtimeState).toBe('STALE_DASHBOARD_SNAPSHOT');
    expect(equityMetric).toMatchObject({
      value: '快照过期',
      status: 'warn',
    });
    expect(equityMetric.hint).toContain('MT5 dashboard 快照已过期');
    expect(equityMetric.hint).toContain('历史净值: 10220.35 USC，仅作参考');
    expect(freshnessMetric).toMatchObject({
      value: '过期',
      hint: 'MT5 dashboard 快照已过期',
    });
    expect(positionsMetric).toMatchObject({
      value: '不可确认',
      status: 'warn',
    });
    expect(positionsMetric.hint).toContain('旧快照持仓 0 笔，仅作历史参考');
    expect(runtimeItems[0]).toMatchObject({
      label: '运行状态',
      value: '快照过期',
      status: 'warn',
      hint: 'MT5 dashboard 快照已过期',
    });
    expect(latestHealth).toMatchObject({
      status: 'warn',
      statusLabel: '快照过期',
      description: '恢复主 MT5/EA 进程并刷新 QuantGod_Dashboard.json。',
    });
    expect(sourceRows.find((row) => row.数据源 === '总览 MT5 dashboard')).toMatchObject({
      状态: '快照过期',
      年龄: '2.0 小时',
      动作: '恢复主 MT5/EA 进程并刷新 QuantGod_Dashboard.json。',
    });
  });

  it('does not treat missing /api/latest freshness as a fresh MT5 snapshot', () => {
    const raw = {
      latest: null,
      state: null,
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const freshnessMetric = buildDashboardMetrics(snapshot).find((item) => item.label === 'MT5 快照新鲜度');

    expect(snapshot.latestDashboardFresh).toBe(false);
    expect(snapshot.latestDashboardStale).toBe(false);
    expect(freshnessMetric).toMatchObject({
      value: '待确认',
      hint: '按 /api/latest dashboard mtime 判定',
    });
  });

  it('keeps the dashboard shell renderable while nullable API payloads are still loading', () => {
    const raw = {
      latest: null,
      state: null,
      mt5Snapshot: null,
      secondaryMt5Snapshot: null,
      usdJpyLiveLoop: null,
      hfmCrypto: null,
      profitTarget: null,
      productionEvidenceValidation: null,
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const recoveryItems = buildSnapshotRecoveryItems(snapshot);
    const rootCause = buildSnapshotRootCauseBanner(snapshot);

    expect(snapshot.snapshotRecovery).toMatchObject({
      realtimeUsable: false,
      processMissing: false,
    });
    expect(recoveryItems.find((item) => item.label === '实时账号状态')).toMatchObject({
      value: '不可作为当前状态',
      status: 'blocked',
    });
    expect(rootCause).toMatchObject({
      status: 'warn',
      title: '真实账号快照不能当作当前状态',
    });
    expect(rootCause.recoveryPathLine).toBe('Dashboard 首页、MT5 工作台和 HFM Crypto 工作台只读复核即可。');
  });

  it('surfaces secondary MT5 readonly snapshot staleness on the dashboard', () => {
    const raw = {
      latest: {
        _freshness: {
          status: 'FRESH_DASHBOARD_SNAPSHOT',
          fresh: true,
          stale: false,
        },
      },
      secondaryMt5Snapshot: {
        ok: true,
        status: 'STALE_EA_SNAPSHOT',
        snapshotFresh: false,
        source: {
          file: '/tmp/live16/MQL5/Files/QuantGod_Dashboard.json',
          ageSeconds: 875085,
          maxAgeSeconds: 180,
          fresh: false,
        },
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const live16Metric = buildDashboardMetrics(snapshot).find((item) => item.label === 'Live16 快照');
    const sourceRows = buildRuntimeSourceDiagnosticRows(raw);
    const live16Health = buildEndpointHealth(raw).find(
      (item) => item.endpoint === '/api/mt5-readonly-secondary/snapshot',
    );
    const runtimeItems = buildRuntimeItems(snapshot);

    expect(snapshot.secondaryMt5SnapshotStale).toBe(true);
    expect(live16Metric).toMatchObject({
      value: '快照过期',
      status: 'warn',
    });
    expect(live16Health).toMatchObject({
      status: 'warn',
      statusLabel: '快照过期',
    });
    expect(runtimeItems.find((item) => item.label === 'Live16 只读桥')).toMatchObject({
      value: '快照过期',
      status: 'warn',
    });
    expect(sourceRows.find((row) => row.数据源 === 'Live16 只读桥')).toMatchObject({
      状态: '快照过期',
      年龄: '10.1 天',
      源文件: '/tmp/live16/MQL5/Files/QuantGod_Dashboard.json',
    });
    expect(sourceRows.find((row) => row.数据源 === 'HFM Crypto CFD')).toMatchObject({
      状态: '依赖快照过期',
    });
  });

  it('surfaces missing MT5 EA snapshot as a recovery blocker instead of waiting data', () => {
    const raw = {
      latest: {
        _freshness: {
          status: 'FRESH_DASHBOARD_SNAPSHOT',
          fresh: true,
          stale: false,
        },
      },
      mt5Snapshot: {
        ok: false,
        status: 'MISSING_EA_SNAPSHOT',
        statusZh: 'MT5 dashboard 快照缺失',
        snapshotFresh: false,
        hostProcess: {
          status: 'MISSING',
          terminalProcessDetected: false,
          matchingProcessCount: 0,
        },
        _freshness: {
          status: 'MISSING_EA_SNAPSHOT',
          statusZh: 'MT5 dashboard 快照缺失',
          stale: true,
          fresh: false,
          blockers: ['missing_ea_dashboard_snapshot', 'mt5_terminal_process_missing'],
          nextActionZh: '未找到 QuantGod_Dashboard.json；先恢复 MT5 终端和 EA dashboard writer。',
        },
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const metrics = buildDashboardMetrics(snapshot);
    const sourceRows = buildRuntimeSourceDiagnosticRows(raw);
    const recoveryItems = buildSnapshotRecoveryItems(snapshot);

    expect(snapshot.mt5SnapshotStale).toBe(true);
    expect(snapshot.mt5HostProcessMissing).toBe(true);
    expect(snapshot.snapshotRecovery).toMatchObject({
      status: 'blocked',
      label: 'MT5/EA dashboard writer 未运行',
      realtimeUsable: false,
    });
    expect(metrics.find((item) => item.label === '主 MT5 只读桥')).toMatchObject({
      value: 'writer 未运行',
      status: 'blocked',
    });
    expect(sourceRows.find((row) => row.数据源 === '主账号只读桥')).toMatchObject({
      状态: 'writer 未运行',
      动作: '恢复主账号 MT5/EA dashboard writer。',
    });
    expect(recoveryItems.find((item) => item.label === '当前结论')).toMatchObject({
      value: 'MT5/EA dashboard writer 未运行',
      status: 'blocked',
    });
  });

  it('summarizes stale MT5 snapshots across the whole dashboard without hiding fresh research evidence', () => {
    const raw = {
      latest: {
        _freshness: {
          status: 'STALE_DASHBOARD_SNAPSHOT',
          stale: true,
          fresh: false,
          ageSeconds: 542273,
          nextActionZh: '恢复主 MT5/EA 进程并刷新 QuantGod_Dashboard.json。',
        },
      },
      mt5Snapshot: {
        ok: true,
        status: 'STALE_EA_SNAPSHOT',
        snapshotFresh: false,
        hostProcess: {
          status: 'MISSING',
          terminalProcessDetected: false,
          matchingProcessCount: 0,
        },
        _freshness: {
          status: 'STALE_EA_SNAPSHOT',
          stale: true,
          fresh: false,
          ageSeconds: 542273,
          nextAction: 'Restore the MT5 terminal/EA dashboard writer process.',
          recoveryStepsZh: ['确认 Live12 HFM/MT5 终端正在运行。', '确认 EA 持续写出 QuantGod_Dashboard.json。'],
          blockers: ['live_dashboard_snapshot_stale', 'mt5_terminal_process_missing'],
        },
      },
      secondaryMt5Snapshot: {
        ok: true,
        status: 'STALE_EA_SNAPSHOT',
        snapshotFresh: false,
        hostProcess: {
          status: 'MISSING',
          terminalProcessDetected: false,
          matchingProcessCount: 0,
        },
        _freshness: {
          status: 'STALE_EA_SNAPSHOT',
          stale: true,
          fresh: false,
          ageSeconds: 878748,
          nextAction: 'Restore the Live16 MT5 terminal/EA dashboard writer process.',
          recoveryStepsZh: ['确认 Live16 HFM/MT5 终端正在运行。', '刷新 /api/mt5-readonly-secondary/snapshot。'],
          blockers: ['live_dashboard_snapshot_stale', 'mt5_terminal_process_missing'],
        },
      },
      usdJpyLiveLoop: {
        schema: 'quantgod.usdjpy_live_loop_status.v1',
        state: 'EVIDENCE_MISSING',
        stateZh: 'USDJPY 运行快照不可用',
        runtimeReady: false,
        runtime: {
          found: true,
          ready: false,
          freshnessTier: 'HARD_STALE',
          ageSeconds: 542273,
          source: '/tmp/runtime/QuantGod_MT5RuntimeSnapshot_USDJPYc.json',
          reasons: ['运行快照严重陈旧：542273s > 90s'],
        },
      },
      hfmCrypto: {
        ok: true,
        status: 'READY_FOR_SHADOW_RESEARCH',
        statusZh: 'HFM Crypto CFD 影子研究就绪',
        symbolEvidence: {
          canonicalSymbols: ['BTCUSD', 'ETHUSD'],
          brokerSymbols: ['#BTCUSD', '#ETHUSD'],
        },
      },
      profitTarget: {
        ok: true,
        executionTargetReached: true,
        laneTargets: {
          forexMt5: { simulationVerifiedUsdProfit: 20.5 },
          btcCryptoCfd: { simulationVerifiedUsdProfit: 38.2 },
        },
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const items = buildSnapshotRecoveryItems(snapshot);
    const rows = buildSnapshotRecoveryRows(snapshot);
    const frontendRows = buildFrontendSnapshotRecoveryRows(snapshot);
    const metrics = buildDashboardMetrics(snapshot);
    const sourceRows = buildRuntimeSourceDiagnosticRows(raw);
    const liveLoopHealth = buildEndpointHealth(raw).find(
      (item) => item.endpoint === '/api/usdjpy-strategy-lab/live-loop',
    );
    const rootCause = buildSnapshotRootCauseBanner(snapshot);

    expect(snapshot.snapshotRecovery).toMatchObject({
      status: 'blocked',
      label: 'MT5/EA dashboard writer 未运行',
      realtimeUsable: false,
      hfmShadowUsable: true,
      liveLoopUsable: false,
    });
    expect(snapshot.snapshotRecovery.nextAction).toContain('Live12: 未检测到 terminal64/wine 进程');
    expect(snapshot.snapshotRecovery.nextAction).toContain('确认 Live12 HFM/MT5 终端正在运行');
    expect(snapshot.snapshotRecovery.nextAction).toContain('Live16: 未检测到 terminal64/wine 进程');
    expect(snapshot.snapshotRecovery.nextAction).toContain('刷新 /api/mt5-readonly-secondary/snapshot');
    expect(snapshot.usdJpyLiveLoopStale).toBe(true);
    expect(metrics.find((item) => item.label === 'USDJPY Live Loop')).toMatchObject({
      value: '严重过期',
      status: 'blocked',
    });
    expect(liveLoopHealth).toMatchObject({
      status: 'blocked',
      statusLabel: '运行快照严重过期',
    });
    expect(rootCause).toMatchObject({
      status: 'blocked',
      label: 'MT5/EA dashboard writer 未运行',
      title: '真实账号快照不能当作当前状态',
    });
    expect(rootCause.rootCauseLine).toContain('Live12 MT5/EA writer 未运行');
    expect(rootCause.rootCauseLine).toContain('Live16 MT5/EA writer 未运行');
    expect(rootCause.rootCauseLine).toContain('USDJPY live-loop 运行快照严重过期');
    expect(rootCause.blockedLine).toContain('当前账户/净值/持仓/执行状态');
    expect(rootCause.usableLine).toContain('HFM Crypto shadow/spec/Moss 研究证据');
    expect(rootCause.usableLine).toContain('模拟收益目标证据');
    expect(rootCause.recoveryPathLine).toContain('/vue/?workspace=mt5');
    expect(rootCause.recoveryPathLine).toContain('/vue/?workspace=hfm-crypto');
    expect(sourceRows.find((row) => row.数据源 === 'USDJPY Live Loop')).toMatchObject({
      状态: '严重过期',
      源文件: '/tmp/runtime/QuantGod_MT5RuntimeSnapshot_USDJPYc.json',
    });
    expect(items.find((item) => item.label === '实时账号状态')).toMatchObject({
      value: '不可作为当前状态',
      status: 'blocked',
    });
    expect(items.find((item) => item.label === '主账号进程')).toMatchObject({
      value: '未检测到 terminal64/wine 进程',
      status: 'blocked',
    });
    expect(items.find((item) => item.label === 'USDJPY Live Loop')).toMatchObject({
      value: '严重过期',
      status: 'blocked',
    });
    expect(items.find((item) => item.label === 'HFM Crypto 研究证据')).toMatchObject({
      value: '仍可用于 shadow 研究',
      status: 'ok',
    });
    expect(rows.find((row) => row.区域 === 'Live16 / HFM Crypto')).toMatchObject({
      打开页面: '/vue/?workspace=hfm-crypto',
      核对端点: '/api/mt5-readonly-secondary/snapshot',
      状态: 'writer 未运行',
      影响: 'HFM Crypto shadow 证据可读，但当前 Live16 账号状态不可确认',
      验收标准: 'Live16 只读桥 fresh=true，BTC/crypto tick 再作为当前账号证据。',
    });
    expect(rows.find((row) => row.区域 === 'HFM Crypto shadow')).toMatchObject({
      状态: '研究证据可用',
      打开页面: '/vue/?workspace=hfm-crypto',
      核对端点: '/api/hfm-crypto/status?view=summary&scope=secondary',
    });
    expect(rows.find((row) => row.区域 === 'USDJPY live-loop')).toMatchObject({
      状态: '依赖运行快照严重过期',
      打开页面: '/vue/?workspace=mt5',
      核对端点: '/api/usdjpy-strategy-lab/live-loop',
    });
    expect(frontendRows.find((row) => row.前端区域 === 'Dashboard 首页')).toMatchObject({
      状态: 'MT5/EA dashboard writer 未运行',
      修复优先级: 'P0',
      打开页面: '/vue/?workspace=dashboard',
      核对端点: '/api/latest + /api/mt5-readonly/snapshot + /api/mt5-readonly-secondary/snapshot',
      可信范围: '研究证据可读；账户、持仓、执行状态只能当历史参考',
      验收标准: '全局根因变为实时快照新鲜，账户/持仓指标不再显示快照过期。',
    });
    expect(frontendRows.find((row) => row.前端区域 === 'MT5 工作台')).toMatchObject({
      状态: 'writer 未运行',
      修复优先级: 'P0',
      打开页面: '/vue/?workspace=mt5',
      核对端点: '/api/mt5-readonly/snapshot',
    });
    expect(frontendRows.find((row) => row.前端区域 === 'HFM Crypto 工作台')).toMatchObject({
      状态: '研究证据可看 / Live16 账号快照阻断',
      修复优先级: 'P0',
      打开页面: '/vue/?workspace=hfm-crypto',
      核对端点: '/api/mt5-readonly-secondary/snapshot + /api/hfm-crypto/status?view=summary&scope=secondary',
      验收标准: 'Live16 快照新鲜后，BTC/crypto tick 与账号准备度才可作为当前证据。',
    });
    expect(frontendRows.find((row) => row.前端区域 === 'USDJPY Live Loop')).toMatchObject({
      状态: '依赖运行快照严重过期',
      修复优先级: 'P1',
      打开页面: '/vue/?workspace=mt5',
      核对端点: '/api/usdjpy-strategy-lab/live-loop',
    });
    expect(frontendRows.find((row) => row.前端区域 === 'Sim-to-live 闸门')).toMatchObject({
      可信范围: '只展示 readiness / token / gate 证据；当前前端不签收、不启用实盘执行',
      打开页面: '/vue/?workspace=dashboard',
      验收标准: '仅数据面可显示达标；真实执行仍需独立 release lane 审查。',
    });
  });

  it('does not mark daily autopilot complete when the endpoint payload is missing', () => {
    const row = buildDailyReviewRows({ dailyAutopilot: null }).find((item) => item.领域 === '自动闭环');

    expect(row).toMatchObject({
      复盘: '缺失',
      结果: '等待 /api/daily-autopilot',
      建议: '先恢复 /api/daily-autopilot 或等待今日自动闭环生成后再判定完成',
    });
    expect(row.结果).not.toBe('闭环完成');
  });

  it('does not mark ok false daily autopilot envelopes as generated', () => {
    const raw = {
      dailyAutopilot: {
        ok: false,
        status: 'MISSING',
        reasonZh: 'QuantGod_DailyAutopilot.json 尚未由本地自动化生成',
      },
    };
    const snapshot = normalizeDashboardSnapshot(raw);
    const item = buildDailyItems(snapshot).find((entry) => entry.label === '今日自动闭环');
    const row = buildDailyReviewRows(raw).find((entry) => entry.领域 === '自动闭环');

    expect(snapshot.dailyAutopilotAvailable).toBe(false);
    expect(item).toMatchObject({
      value: '缺失',
      status: 'warn',
    });
    expect(row).toMatchObject({
      复盘: '缺失',
      结果: '等待 /api/daily-autopilot',
    });
    expect(row.结果).not.toBe('闭环完成');
  });

  it('surfaces champion history freshness as a blocked GA daily item', () => {
    const raw = {
      backtest: {
        historyProductionStatus: {
          status: 'PASS',
          statusZh: '生产级 PASS',
          promotionGateStatus: 'PASS',
        },
      },
      championPromotionGate: {
        historyFreshnessPromotionReview: {
          status: 'HISTORY_FRESHNESS_BLOCKED',
          blocksLivePromotion: true,
          failedTimeframes: ['M1', 'M5'],
          staleTimeframes: ['M1', 'M5', 'M15', 'H1'],
          blockers: ['history_freshness_lag_exceeded'],
          reasonZh:
            'USDJPY 历史生产状态未通过；覆盖/密度/最新延迟未全部达标前，只允许 tester-only/forward 或 shadow 观察。',
        },
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const item = buildDailyItems(snapshot).find((entry) => entry.label === 'GA 历史样本');

    expect(snapshot.historyProductionStatus).toMatchObject({
      promotionGateStatus: 'BLOCKED',
      historyFreshnessStatus: 'HISTORY_FRESHNESS_BLOCKED',
      historyFreshnessBlocksPromotion: true,
    });
    expect(item).toMatchObject({
      value: '历史 freshness 阻断晋级',
      status: 'blocked',
    });
    expect(item.hint).toContain('晋级门 BLOCKED');
    expect(item.hint).toContain('history_freshness_lag_exceeded');
    expect(item.hint).toContain('周期 M1/M5/M15/H1');
  });

  it('marks missing production history as blocked even without daily autopilot evidence', () => {
    const raw = {
      championPromotionGate: {
        historyFreshnessPromotionReview: {
          status: 'HISTORY_PRODUCTION_STATUS_MISSING',
          blocksLivePromotion: true,
          failedTimeframes: ['M1', 'M5', 'M15', 'H1'],
          staleTimeframes: ['M1', 'M5', 'M15', 'H1'],
          blockers: ['history_production_status_missing'],
          reasonZh: '缺少 USDJPY 历史生产状态；M1/M5/M15/H1 未被证明新鲜前，不能把冠军包装成实盘晋级。',
        },
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const item = buildDailyItems(snapshot).find((entry) => entry.label === 'GA 历史样本');

    expect(snapshot.historyProductionStatus).toMatchObject({
      promotionGateStatus: 'BLOCKED',
      status: 'WARN',
      statusZh: '历史 freshness 阻断晋级',
      historyFreshnessBlocksPromotion: true,
    });
    expect(item).toMatchObject({
      value: '历史 freshness 阻断晋级',
      status: 'blocked',
    });
    expect(item.hint).toContain('history_production_status_missing');
  });

  it('surfaces core runtime evidence promotion blockers on the dashboard', () => {
    const raw = {
      productionEvidenceValidation: {
        ok: true,
        report: {
          coreRuntimeEvidenceIntegrity: {
            status: 'PASS',
            statusZh: '核心运行证据完整',
            promotionGateStatus: 'BLOCKED',
            promotionGatePassed: false,
            nextActionZh: '核心证据文件完整，但 history freshness、Case Memory 样本类型仍阻断晋级。',
            promotionBlockers: [
              'historyProductionStatus:M1:freshness_not_ok',
              'caseMemoryArtifactManifest:missing_category:BAD_ENTRY',
              'caseMemoryArtifactManifest:missing_category:GA_OVERFIT',
            ],
            artifacts: [
              {
                artifactId: 'historyProductionStatus',
                promotionGate: {
                  status: 'BLOCKED',
                  timeframes: {
                    M1: { passed: false, freshnessOk: false },
                    M5: { passed: true, freshnessOk: true },
                  },
                },
              },
              {
                artifactId: 'caseMemoryArtifactManifest',
                promotionGate: {
                  status: 'BLOCKED',
                  missingCategories: ['BAD_ENTRY', 'GA_OVERFIT'],
                },
              },
            ],
          },
        },
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const metric = buildDashboardMetrics(snapshot).find((item) => item.label === '核心证据晋级闸');
    const recoveryItem = buildSnapshotRecoveryItems(snapshot).find((item) => item.label === '核心证据晋级闸');
    const recoveryRow = buildSnapshotRecoveryRows(snapshot).find((row) => row.区域 === 'Core evidence / GA 晋级');
    const coreRecoveryRows = buildCoreEvidenceRecoveryRows(snapshot);
    const sourceRow = buildRuntimeSourceDiagnosticRows(raw).find((row) => row.数据源 === 'Core Runtime Evidence');
    const health = buildEndpointHealth(raw).find(
      (item) => item.endpoint === '/api/production-evidence-validation/status',
    );

    expect(snapshot.coreRuntimeEvidence).toMatchObject({
      integrityOk: true,
      promotionBlocked: true,
      promotionGateStatus: 'BLOCKED',
      value: '晋级阻断',
      uiStatus: 'blocked',
      missingCategories: ['BAD_ENTRY', 'GA_OVERFIT'],
      staleTimeframes: ['M1'],
      promotionRecoveryQueueCount: 3,
      recoveryQueueLine: 'history:M1 / case:BAD_ENTRY / case:GA_OVERFIT',
      recoveryActionLine:
        '按恢复队列处理 history:M1 / case:BAD_ENTRY / case:GA_OVERFIT；只允许只读/shadow/tester 补证。',
    });
    expect(metric).toMatchObject({
      value: '晋级阻断',
      status: 'blocked',
    });
    expect(snapshot.coreRuntimeEvidence.detailLine).toContain('missing_category:BAD_ENTRY');
    expect(snapshot.coreRuntimeEvidence.detailLine).toContain('Case Memory 缺 BAD_ENTRY/GA_OVERFIT');
    expect(metric.hint).toContain('按恢复队列处理 history:M1 / case:BAD_ENTRY / case:GA_OVERFIT');
    expect(recoveryItem).toMatchObject({
      value: '晋级阻断',
      status: 'blocked',
      hint: '按恢复队列处理 history:M1 / case:BAD_ENTRY / case:GA_OVERFIT；只允许只读/shadow/tester 补证。',
    });
    expect(recoveryRow).toMatchObject({
      状态: '晋级阻断',
      影响: '核心文件可以完整，但 GA/champion 晋级仍被 freshness 或 Case Memory 样本类型阻断',
      下一步: '按恢复队列处理 history:M1 / case:BAD_ENTRY / case:GA_OVERFIT；只允许只读/shadow/tester 补证。',
    });
    expect(coreRecoveryRows).toHaveLength(3);
    expect(coreRecoveryRows[0]).toMatchObject({
      任务: 'History freshness M1',
      状态: 'FRESHNESS_STALE',
      优先级: 'HIGH',
      下一步: '刷新 M1 history freshness；通过 production-status 前禁止 GA/champion 晋级。',
    });
    expect(coreRecoveryRows[1]).toMatchObject({
      任务: 'Case Memory BAD_ENTRY',
      状态: 'MISSING_CATEGORY',
      优先级: 'HIGH',
    });
    expect(sourceRow).toMatchObject({
      状态: '晋级阻断',
      阈值: '完整性 PASS + promotion gate PASS',
    });
    expect(health).toMatchObject({
      status: 'blocked',
      statusLabel: '晋级阻断',
    });
  });

  it('does not mark ok false endpoint envelopes as normal health', () => {
    const health = buildEndpointHealth({
      hfmCrypto: {
        ok: false,
        status: 'UNAVAILABLE',
        error: 'MetaTrader5 Python package is unavailable',
      },
    }).find((item) => item.label === 'HFM Crypto CFD');

    expect(health).toMatchObject({
      status: 'warn',
      statusLabel: '不可用',
      description: 'MetaTrader5 Python package is unavailable',
    });
  });

  it('surfaces compact HFM crypto account diagnostics instead of empty evidence', () => {
    const raw = {
      hfmCrypto: {
        compactView: true,
        status: 'WAITING_HFM_ACCOUNT_CRYPTO_CFD_SYMBOLS',
        statusZh: '当前 HFM 账号未下发 Crypto CFD symbols',
        symbolEvidence: {
          found: false,
          brokerSymbolDiagnostics: {
            brokerSymbolTotalAll: 56,
            brokerSymbolTotalMarketWatch: 13,
            brokerCryptoLikeCountAll: 0,
            brokerCryptoLikeCountMarketWatch: 0,
          },
        },
        blockers: [
          {
            code: 'HFM_MT5_ACCOUNT_NO_CRYPTO_CFD_SYMBOLS',
            reasonZh: '账号已成功授权并下发 symbol 清单，但当前 HFM 账号/服务器没有 crypto CFD symbol。',
          },
        ],
      },
      releaseTokenSignoffDraft: {
        schema: 'quantgod.release_token_signoff_draft.v1',
        status: 'READY_FOR_SEPARATE_SIGNOFF_INPUT',
        statusZh: '5/5 个 release token 已生成签收输入草案；当前 artifact 不签收、不铸造 token',
        releaseTokenCount: 5,
        readyForSeparateSignoffCount: 5,
        cannotBeUsedAsReleaseToken: true,
        canAcceptSignoffHere: false,
        canSignOffHere: false,
        canMintTokenHere: false,
        canReleaseExecutionNow: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
        signoffDraftTemplate: {
          releaseTokenSignoffs: [
            {
              gateId: 'request_writer_release',
              labelZh: 'Python request writer release token',
              tokenName: 'QG_REVIEWED_REQUEST_WRITER_RELEASE_V1',
              blockerCode: 'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
              readyForSeparateSignoffReview: true,
              canSignOffHere: false,
              canMintTokenHere: false,
            },
          ],
        },
      },
      releaseTokenSignoffInputTemplate: {
        schema: 'quantgod.release_token_signoff_input_template.v1',
        status: 'READY_FOR_SIGNOFF_INPUT_FILL',
        statusZh: '5/5 个 release token 签收输入模板已生成；等待外部独立填写',
        releaseTokenCount: 5,
        readyForInputCount: 5,
        cannotBeUsedAsReleaseToken: true,
        canAcceptSignoffHere: false,
        canMintTokenHere: false,
        canReleaseExecutionNow: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
      },
      releaseTokenSignoffInputReview: {
        schema: 'quantgod.release_token_signoff_input_review.v1',
        status: 'WAITING_SIGNOFF_INPUT',
        statusZh: '0/5 个 release token 签收输入完整；仍等待完整签收输入',
        releaseTokenCount: 5,
        completeSignoffCount: 0,
        canAcceptSignoffHere: false,
        canMintTokenHere: false,
        canReleaseExecutionNow: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const hfmMetric = buildDashboardMetrics(snapshot).find((item) => item.label === 'HFM Crypto');
    const hfmTodo = buildDailyTodoRows(raw).find((row) => row.领域 === 'HFM Crypto');
    const hfmReview = buildDailyReviewRows(raw).find((row) => row.领域 === 'HFM Crypto');

    expect(snapshot.hfmCryptoRows).toHaveLength(1);
    expect(snapshot.hfmCryptoRows[0]).toMatchObject({
      code: 'HFM_MT5_ACCOUNT_NO_CRYPTO_CFD_SYMBOLS',
      brokerSymbolTotalAll: 56,
      brokerCryptoLikeCountAll: 0,
      compactView: true,
    });
    expect(hfmMetric).toMatchObject({
      value: 0,
      hint: '0 crypto / 56 broker / 13 Market Watch',
    });
    expect(hfmTodo).toMatchObject({
      任务: '账号 symbol 探测',
      状态: '0 crypto / 56 broker / 13 Market Watch',
    });
    expect(hfmReview).toMatchObject({
      结果: '0 crypto / 56 broker / 13 Market Watch',
      建议: '账号已成功授权并下发 symbol 清单，但当前 HFM 账号/服务器没有 crypto CFD symbol。',
    });
  });

  it('uses HFM crypto specs evidence when live broker inventory reports zero crypto symbols', () => {
    const raw = {
      hfmCrypto: {
        compactView: true,
        status: 'READY_FOR_SHADOW_RESEARCH',
        statusZh: 'HFM Crypto CFD 影子研究就绪',
        symbolEvidence: {
          found: true,
          canonicalSymbols: ['BTCUSD', 'ETHUSD'],
          brokerSymbols: ['#BTCUSD', '#ETHUSD'],
          brokerSymbolDiagnostics: {
            brokerSymbolTotalAll: 0,
            brokerSymbolTotalMarketWatch: 0,
            brokerCryptoLikeCountAll: 0,
            brokerCryptoLikeCountMarketWatch: 0,
          },
        },
        standaloneExporterBundle: {
          runtimeProbeTickDetected: true,
          startupSymbol: '#BTCUSD',
        },
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const hfmMetric = buildDashboardMetrics(snapshot).find((item) => item.label === 'HFM Crypto');
    const hfmTodo = buildDailyTodoRows(raw).find((row) => row.领域 === 'HFM Crypto');
    const hfmReview = buildDailyReviewRows(raw).find((row) => row.领域 === 'HFM Crypto');

    expect(hfmMetric).toMatchObject({
      value: 2,
      hint: '#BTCUSD runtime probe 已输出实时 tick',
    });
    expect(hfmTodo).toMatchObject({
      任务: 'BTC runtime probe',
      状态: '2 specs crypto / 0 broker / 0 Market Watch',
      结论: '#BTCUSD runtime probe 已输出实时 tick',
    });
    expect(hfmReview).toMatchObject({
      结果: '2 specs crypto / 0 broker / 0 Market Watch',
      建议: '#BTCUSD runtime probe 已输出实时 tick',
    });
  });

  it('surfaces combined 50 USD simulation target progress from profit target tracker', () => {
    const raw = {
      profitTarget: {
        status: 'TARGET_REACHED',
        statusZh: '已达到合计 50 USD 目标',
        executionTargetReached: true,
        dualTargetReached: true,
        simToLiveDecision: {
          status: 'TARGET_REACHED_WAITING_EXECUTION_MODE_ACTIVATION',
          statusZh: '模拟收益目标 50 USD 已由任一 lane 或净合计达成，等待执行模式闸门',
          targetReached: true,
          dataPlaneReady: true,
          executionModeOnlyBlocked: true,
          allActivationGatesPassed: false,
          orderSendAllowed: false,
          brokerCallsMade: false,
          writesMt5OrderRequest: false,
          authorizationVsExecution: {
            schema: 'quantgod.authorization_vs_execution.v1',
            chatAuthorizationAcknowledged: true,
            operatorApprovalEvidenceAccepted: true,
            simulationTargetReached: true,
            executionModeOnlyBlocked: true,
            executionCanStartNow: false,
            remainingGateFields: ['livePilotMode', 'readOnlyMode', 'executionEnabled', 'tradeAllowed'],
            remainingBlockerCodes: [
              'MT5_LIVE_PILOT_MODE_NOT_CONFIRMED',
              'MT5_READ_ONLY_MODE_STILL_ACTIVE',
              'MT5_EXECUTION_NOT_ENABLED_FOR_PILOT',
              'MT5_TRADE_ALLOWED_NOT_CONFIRMED',
            ],
            whyNotLiveNowZh:
              '聊天/操作员授权证据已接受，但 MT5 执行模式闸门仍关闭；需要 livePilotMode=true、readOnlyMode=false、executionEnabled=true、tradeAllowed=true 的 runtime 证据，本追踪器不会写订单。',
          },
          nextRequiredActionZh: '模拟收益目标和 HFM/BTC 数据面已达成；仅剩执行模式闸门。',
          primaryActionableBlocker: {
            code: 'DEPLOYED_PRESET_READ_ONLY_TRUE',
            reasonZh: '当前部署 preset 仍为 ReadOnlyMode=true。',
          },
          activationGateChecklist: [
            {
              field: 'livePilotMode',
              current: false,
              expected: true,
              passed: false,
              blockerCode: 'MT5_LIVE_PILOT_MODE_NOT_CONFIRMED',
              reasonZh: 'MT5 dashboard 尚未证明 livePilotMode=true。',
            },
            {
              field: 'readOnlyMode',
              current: true,
              expected: false,
              passed: false,
              blockerCode: 'MT5_READ_ONLY_MODE_STILL_ACTIVE',
              reasonZh: 'MT5 dashboard 仍处于 readOnly/shadow 模式。',
            },
          ],
        },
        liveCutoverGate: {
          status: 'READY_FOR_EXECUTION_REVIEW',
          statusZh: '任一 lane 或多 lane 净合计收益目标已达成，可进入单独 execution lane 评审',
          reasonZh: '达到模拟收益目标只代表可进入实盘执行评审；本追踪器不写订单、不改预设。',
        },
        liveExecutionReview: {
          status: 'WAITING_EXECUTION_MODE_ACTIVATION',
          statusZh: '数据面已通过，等待执行模式闸门',
          runtimeProbePassed: false,
          runtimePreflightDataPlaneReadyForReview: true,
          runtimePreflightExecutionModeOnlyBlocked: true,
          dryRunIntent: {
            canonicalSymbol: 'BTCUSD',
            brokerSymbol: '#BTCUSD',
          },
          primaryActionableBlocker: {
            code: 'DEPLOYED_PRESET_READ_ONLY_TRUE',
            reasonZh: '当前部署 preset 仍为 ReadOnlyMode=true。',
          },
          blockers: [
            {
              code: 'EXECUTION_MODE_GATES_NOT_ACTIVE',
              reasonZh: '数据面预检已通过，但 MT5/EA 执行模式闸门尚未打开。',
            },
            {
              code: 'MT5_LIVE_PILOT_MODE_NOT_CONFIRMED',
              reasonZh: 'MT5 dashboard 尚未证明 livePilotMode=true。',
            },
          ],
        },
        laneTargets: {
          forexMt5: {
            labelZh: '外币 MT5 模拟/纸盘',
            simulationVerifiedUsdProfit: 72.0,
            targetReached: true,
            targetUsd: 50,
            status: 'LANE_POSITIVE',
            statusZh: '该 lane 已证明正收益',
          },
          btcCryptoCfd: {
            labelZh: 'BTC / HFM crypto CFD 模拟',
            simulationVerifiedUsdProfit: 65.22,
            targetReached: true,
            targetUsd: 50,
            status: 'LANE_POSITIVE',
            statusZh: '该 lane 已证明正收益',
          },
        },
      },
      liveAutomationOrchestrator: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
        executionReleaseGateSummary: {
          status: 'BLOCKED',
          statusZh: '5 个 release token 未提供',
          blocked: 5,
          total: 5,
          blockerCodes: [
            'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
            'REQUEST_READER_RELEASE_TOKEN_MISSING',
            'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
            'RECEIPT_WRITER_RELEASE_TOKEN_MISSING',
            'ROLLBACK_AUTO_DISABLE_RELEASE_TOKEN_MISSING',
          ],
        },
        executionReleaseGateChecklist: [
          {
            gateId: 'request_writer_release',
            labelZh: 'Python request writer release token',
            dataPlaneReady: true,
            tokenRequired: true,
            tokenProvided: false,
            blockerCode: 'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
          },
        ],
        executionReleaseReadinessPacket: {
          status: 'WAITING_RELEASE_TOKENS_AND_EXECUTION_MODE',
          statusZh: '5 个 release token 未释放，且 4 个 MT5 执行模式闸门未通过',
          blockedGateCount: 5,
          canReleaseExecutionNow: false,
          orderSendAllowed: false,
          requestFilesWritten: false,
          brokerCallsMade: false,
          activationGateSummary: {
            blocked: 4,
          },
          blockedReleaseTokenCodes: [
            'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
            'REQUEST_READER_RELEASE_TOKEN_MISSING',
            'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
            'RECEIPT_WRITER_RELEASE_TOKEN_MISSING',
            'ROLLBACK_AUTO_DISABLE_RELEASE_TOKEN_MISSING',
          ],
        },
      },
      releaseTokenEvidenceReview: {
        schema: 'quantgod.release_token_evidence_review.v1',
        status: 'WAITING_RELEASE_TOKEN_EVIDENCE_AND_SEPARATE_REVIEW',
        statusZh: '无副作用证据已完成 5/5；release token 已提供 0/5，保持 review-only',
        releaseTokenCount: 5,
        evidenceCompleteCount: 5,
        noSideEffectEvidenceCompleteCount: 5,
        tokenProvidedCount: 0,
        tokenMissingCount: 5,
        tokenMissingOnly: true,
        canReleaseExecutionNow: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
        evidenceRows: [
          {
            gateId: 'request_writer_release',
            labelZh: 'Python request writer release token',
            dataPlaneReady: true,
            tokenProvided: false,
            evidenceComplete: true,
            noSideEffectEvidenceComplete: true,
            blockerCode: 'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
          },
        ],
        manualReleaseReviewRows: [
          {
            gateId: 'request_writer_release',
            statusZh: '无副作用证据已齐，可进入单独 release token 签收评审',
            readyForSeparateSignoffReview: true,
            canSignOffHere: false,
          },
        ],
      },
      releaseTokenSignoffDraft: {
        schema: 'quantgod.release_token_signoff_draft.v1',
        status: 'READY_FOR_SEPARATE_SIGNOFF_INPUT',
        statusZh: '5/5 个 release token 已生成签收输入草案；当前 artifact 不签收、不铸造 token',
        releaseTokenCount: 5,
        readyForSeparateSignoffCount: 5,
        cannotBeUsedAsReleaseToken: true,
        canAcceptSignoffHere: false,
        canSignOffHere: false,
        canMintTokenHere: false,
        canReleaseExecutionNow: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
        signoffDraftTemplate: {
          releaseTokenSignoffs: [
            {
              gateId: 'request_writer_release',
              labelZh: 'Python request writer release token',
              tokenName: 'QG_REVIEWED_REQUEST_WRITER_RELEASE_V1',
              blockerCode: 'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
              readyForSeparateSignoffReview: true,
              canSignOffHere: false,
              canMintTokenHere: false,
            },
          ],
        },
      },
      releaseTokenSignoffInputTemplate: {
        schema: 'quantgod.release_token_signoff_input_template.v1',
        status: 'READY_FOR_SIGNOFF_INPUT_FILL',
        statusZh: '5/5 个 release token 签收输入模板已生成；等待外部独立填写',
        releaseTokenCount: 5,
        readyForInputCount: 5,
        cannotBeUsedAsReleaseToken: true,
        canAcceptSignoffHere: false,
        canMintTokenHere: false,
        canReleaseExecutionNow: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
      },
      releaseTokenSignoffInputReview: {
        schema: 'quantgod.release_token_signoff_input_review.v1',
        status: 'WAITING_SIGNOFF_INPUT',
        statusZh: '0/5 个 release token 签收输入完整；仍等待完整签收输入',
        releaseTokenCount: 5,
        completeSignoffCount: 0,
        canAcceptSignoffHere: false,
        canMintTokenHere: false,
        canReleaseExecutionNow: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const targetMetric = buildDashboardMetrics(snapshot).find((item) => item.label === '合计模拟目标');
    const targetEndpoint = buildEndpointHealth(raw).find((item) => item.label === '合计 50 USD 目标');
    const releaseEvidenceEndpoint = buildEndpointHealth(raw).find(
      (item) => item.label === 'Release Token 证据',
    );
    const releaseSignoffEndpoint = buildEndpointHealth(raw).find(
      (item) => item.label === 'Release Token 签收草案',
    );
    const releaseSignoffTemplateEndpoint = buildEndpointHealth(raw).find(
      (item) => item.label === 'Release Token 签收模板',
    );
    const releaseSignoffInputEndpoint = buildEndpointHealth(raw).find(
      (item) => item.label === 'Release Token 签收输入',
    );
    const targetTodo = buildDailyTodoRows(raw).find((row) => row.领域 === '合计模拟目标');
    const targetReview = buildDailyReviewRows(raw).find((row) => row.领域 === '合计模拟目标');
    const targetItems = buildProfitTargetItems(snapshot);
    const gates = buildActivationGateRows(snapshot);
    const releaseGates = buildReleaseGateRows(snapshot);

    expect(snapshot.dualTargetReached).toBe(true);
    expect(snapshot.profitTargetLine).toBe('外币 72.00 / BTC 65.22 USD');
    expect(snapshot.authorizationVsExecution).toMatchObject({
      chatAuthorizationAcknowledged: true,
      executionCanStartNow: false,
    });
    expect(snapshot.executionReleaseGateSummary).toMatchObject({
      blocked: 5,
      total: 5,
    });
    expect(snapshot.executionReleaseReadinessPacket).toMatchObject({
      status: 'WAITING_RELEASE_TOKENS_AND_EXECUTION_MODE',
      canReleaseExecutionNow: false,
      blockedGateCount: 5,
    });
    expect(snapshot.releaseTokenEvidenceProgressLine).toBe('无副作用证据 5/5 / Token 0/5 / 缺 5');
    expect(snapshot.releaseTokenSignoffDraftProgressLine).toBe('签收草案 5/5 / 不能在此签收');
    expect(snapshot.releaseTokenSignoffInputTemplateProgressLine).toBe('签收模板 5/5 / 等待外部填写');
    expect(snapshot.releaseTokenSignoffInputProgressLine).toBe('签收输入 0/5 / 当前仍不放行');
    expect(gates).toHaveLength(2);
    expect(gates[0]).toMatchObject({
      闸门: 'livePilotMode',
      当前: '否',
      期望: '是',
      通过: '否',
    });
    expect(releaseGates).toHaveLength(1);
    expect(releaseGates[0]).toMatchObject({
      闸门: 'Python request writer release token',
      ReleaseToken: '否',
      证据完成: '是',
      无副作用证据: '是',
      签收评审: '无副作用证据已齐，可进入单独 release token 签收评审',
      阻塞码: 'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
    });
    expect(targetItems.find((item) => item.label === '执行模式闸门')).toMatchObject({
      value: '2/2 个执行闸门未通过',
      status: 'blocked',
    });
    expect(targetItems.find((item) => item.label === 'Release Tokens')).toMatchObject({
      value: '无副作用证据已完成 5/5；release token 已提供 0/5，保持 review-only',
      hint: '无副作用证据 5/5 / Token 0/5 / 缺 5',
      status: 'blocked',
    });
    expect(targetItems.find((item) => item.label === 'Release Token 签收草案')).toMatchObject({
      value: '5/5 个 release token 已生成签收输入草案；当前 artifact 不签收、不铸造 token',
      hint: '签收草案 5/5 / 不能在此签收',
      status: 'blocked',
    });
    expect(targetItems.find((item) => item.label === 'Release Token 签收模板')).toMatchObject({
      value: '5/5 个 release token 签收输入模板已生成；等待外部独立填写',
      hint: '签收模板 5/5 / 等待外部填写',
      status: 'blocked',
    });
    expect(targetItems.find((item) => item.label === 'Release Token 签收输入')).toMatchObject({
      value: '0/5 个 release token 签收输入完整；仍等待完整签收输入',
      hint: '签收输入 0/5 / 当前仍不放行',
      status: 'blocked',
    });
    expect(targetItems.find((item) => item.label === '执行释放包')).toMatchObject({
      value: '5 个 release token 未释放，且 4 个 MT5 执行模式闸门未通过',
      hint: 'REQUEST_WRITE_RELEASE_TOKEN_MISSING / REQUEST_READER_RELEASE_TOKEN_MISSING / BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING +2',
      status: 'blocked',
    });
    expect(targetMetric).toMatchObject({
      value: '达标',
      hint: '收益已达标，但执行未释放：#BTCUSD：聊天/操作员授权证据已接受，但 MT5 执行模式闸门仍关闭；需要 livePilotMode=true、readOnlyMode=false、executionEnabled=true、tradeAllowed=true 的 runtime 证据，本追踪器不会写订单；当前主 blocker：当前部署 preset 仍为 ReadOnlyMode=true。',
    });
    expect(targetEndpoint).toMatchObject({
      endpoint: '/api/profit-target/status?scope=secondary&targetUsd=50',
      status: 'ok',
    });
    expect(releaseEvidenceEndpoint).toMatchObject({
      endpoint: '/api/live-automation/release-token-evidence-review?scope=secondary',
      status: 'ok',
    });
    expect(releaseSignoffEndpoint).toMatchObject({
      endpoint: '/api/live-automation/release-token-signoff-draft?scope=secondary',
      status: 'ok',
    });
    expect(releaseSignoffTemplateEndpoint).toMatchObject({
      endpoint: '/api/live-automation/release-token-signoff-input-template?scope=secondary',
      status: 'ok',
    });
    expect(releaseSignoffInputEndpoint).toMatchObject({
      endpoint: '/api/live-automation/release-token-signoff-input-review?scope=secondary',
      status: 'ok',
    });
    expect(buildEndpointHealth(raw).find((item) => item.label === 'Sim-to-live 编排器')).toMatchObject({
      endpoint: '/api/live-automation/orchestrator?scope=secondary',
      status: 'ok',
    });
    expect(targetTodo).toMatchObject({
      状态: '收益目标已达成',
      结论: '收益已达标，但执行未释放：#BTCUSD：聊天/操作员授权证据已接受，但 MT5 执行模式闸门仍关闭；需要 livePilotMode=true、readOnlyMode=false、executionEnabled=true、tradeAllowed=true 的 runtime 证据，本追踪器不会写订单；当前主 blocker：当前部署 preset 仍为 ReadOnlyMode=true。',
    });
    expect(targetReview).toMatchObject({
      结果: '外币 72.00 / BTC 65.22 USD',
      建议: '收益已达标，但执行未释放：#BTCUSD：聊天/操作员授权证据已接受，但 MT5 执行模式闸门仍关闭；需要 livePilotMode=true、readOnlyMode=false、executionEnabled=true、tradeAllowed=true 的 runtime 证据，本追踪器不会写订单；当前主 blocker：当前部署 preset 仍为 ReadOnlyMode=true。',
    });
    expect(targetItems.find((item) => item.label === 'Sim-to-live 决策')).toMatchObject({
      hint: '收益已达标，但执行未释放：#BTCUSD：聊天/操作员授权证据已接受，但 MT5 执行模式闸门仍关闭；需要 livePilotMode=true、readOnlyMode=false、executionEnabled=true、tradeAllowed=true 的 runtime 证据，本追踪器不会写订单；当前主 blocker：当前部署 preset 仍为 ReadOnlyMode=true。',
    });
    expect(targetItems.find((item) => item.label === '授权证据')).toMatchObject({
      value: '是',
      status: 'ok',
    });
    expect(targetItems.find((item) => item.label === '可开始执行')).toMatchObject({
      value: '否',
      hint: 'livePilotMode / readOnlyMode / executionEnabled / tradeAllowed',
      status: 'blocked',
    });
  });

  it('prioritizes Live16 release-readiness file blockers after the profit target is reached', () => {
    const raw = {
      profitTarget: {
        status: 'TARGET_REACHED',
        executionTargetReached: true,
        dualTargetReached: true,
        simToLiveDecision: {
          targetReached: true,
          dataPlaneReady: true,
          executionModeOnlyBlocked: true,
          primaryActionableBlocker: {
            code: 'EXECUTION_MODE_GATES_NOT_ACTIVE',
            reasonZh: '旧决策只知道执行模式闸门未打开。',
          },
        },
        laneTargets: {
          forexMt5: { simulationVerifiedUsdProfit: 72, targetReached: true },
          btcCryptoCfd: { simulationVerifiedUsdProfit: 65.22, targetReached: true },
        },
      },
      liveAutomationReleaseReadiness: {
        status: 'WAITING_RELEASE_TOKENS_AND_EXECUTION_MODE',
        statusZh: '5 个 release token 未释放，且 4 个 MT5 执行模式闸门未通过',
        canReleaseExecutionNow: false,
        primaryActionableBlocker: {
          code: 'DEPLOYED_PRESET_READ_ONLY_TRUE',
          reasonZh: '当前部署 preset 仍为 ReadOnlyMode=true。',
        },
        fileEvidenceBlockers: [
          {
            code: 'STARTUP_CONFIG_ALLOW_LIVE_TRADING_OFF',
            reasonZh:
              'Live16 启动 ini 的 [Experts] AllowLiveTrading=0；重新启动时仍会保持终端级 live trading 关闭。',
          },
        ],
      },
      liveExecutionLaneSelector: {
        selectedLaneId: 'forexMt5',
        selectedLaneLabelZh: '外币 MT5 Live12',
        selectedLanePrimaryBlocker: {
          code: 'FOREX_NEWS_BLOCK_ACTIVE',
          reasonZh: 'USDJPY news pre-block: jolts-job-openings in 41m',
        },
        lanes: [
          {
            laneId: 'forexMt5',
            noEntryDiagnostics: {
              guards: {
                spreadAllowed: false,
                spreadPips: 3,
                maxSpreadPips: 2.2,
              },
              rsi: {
                evalCode: 'SPREAD_BLOCK',
                signalDirection: 'NONE',
              },
            },
          },
        ],
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const metric = buildDashboardMetrics(snapshot).find((item) => item.label === '合计模拟目标');
    const selectorMetric = buildDashboardMetrics(snapshot).find((item) => item.label === '最接近实盘车道');
    const items = buildProfitTargetItems(snapshot);

    expect(snapshot.profitExecutionConclusionLine).toBe(
      '收益已达标，但执行未释放：BTCUSD：5 个 release token 未释放，且 4 个 MT5 执行模式闸门未通过；当前主 blocker：当前部署 preset 仍为 ReadOnlyMode=true。',
    );
    expect(metric).toMatchObject({
      value: '达标',
      hint: snapshot.profitExecutionConclusionLine,
    });
    expect(selectorMetric).toMatchObject({
      value: '外币 MT5 Live12',
      hint: '外币 MT5 Live12：USDJPY news pre-block: jolts-job-openings in 41m；点差 3/2.2；RSI SPREAD_BLOCK',
    });
    expect(buildEndpointHealth(raw).find((item) => item.label === '双车道择优')).toMatchObject({
      endpoint: '/api/live-automation/lane-selector?scope=secondary',
      status: 'ok',
    });
    expect(items.find((item) => item.label === 'Sim-to-live 决策')).toMatchObject({
      hint: snapshot.profitExecutionConclusionLine,
    });
  });

  it('surfaces HFM BTC runtime probe blocker from compact standalone exporter summary', () => {
    const raw = {
      hfmCrypto: {
        compactView: true,
        status: 'READY_FOR_SHADOW_RESEARCH',
        statusZh: 'HFM Crypto CFD 影子研究就绪',
        symbolEvidence: {
          found: true,
          brokerSymbolDiagnostics: {
            brokerSymbolTotalAll: 346,
            brokerSymbolTotalMarketWatch: 10,
            brokerCryptoLikeCountAll: 39,
            brokerCryptoLikeCountMarketWatch: 0,
          },
        },
        standaloneExporterBundle: {
          status: 'WAITING_STANDALONE_MT5_RUNTIME_PROBE_INSTALL',
          statusZh: '等待安装/编译带 runtime probe 的只读 HFM crypto exporter EA',
          runtimeProbeMissingAfterSpecs: true,
          runtimeProbeTickDetected: false,
          startupSymbol: '#BTCUSD',
          targetExpertInstalledMatchesBundle: false,
        },
      },
    };

    const snapshot = normalizeDashboardSnapshot(raw);
    const hfmMetric = buildDashboardMetrics(snapshot).find((item) => item.label === 'HFM Crypto');
    const hfmTodo = buildDailyTodoRows(raw).find((row) => row.领域 === 'HFM Crypto');
    const hfmReview = buildDailyReviewRows(raw).find((row) => row.领域 === 'HFM Crypto');

    expect(snapshot.hfmCryptoRuntimeProbeLine).toBe(
      '#BTCUSD runtime probe 缺失：当前 MT5 Experts 里的 exporter EA 不是最新版',
    );
    expect(hfmMetric).toMatchObject({
      value: 39,
      hint: '#BTCUSD runtime probe 缺失：当前 MT5 Experts 里的 exporter EA 不是最新版',
    });
    expect(hfmTodo).toMatchObject({
      任务: 'BTC runtime probe',
      状态: '39 crypto / 346 broker / 10 Market Watch',
      结论: '#BTCUSD runtime probe 缺失：当前 MT5 Experts 里的 exporter EA 不是最新版',
    });
    expect(hfmReview).toMatchObject({
      结果: '39 crypto / 346 broker / 10 Market Watch',
      建议: '#BTCUSD runtime probe 缺失：当前 MT5 Experts 里的 exporter EA 不是最新版',
    });
  });
});
