import { describe, expect, it } from 'vitest';

import {
  buildCloseHistoryRows,
  buildMt5SimulationItems,
  buildMt5ShadowEquityRows,
  buildMt5ShadowSummary,
  buildMt5ShadowTradeRows,
  buildMt5EvidenceOsLiteItems,
  buildMt5TodoRows,
  buildMt5ReviewRows,
  buildTradeJournalRows,
  normalizeMt5Snapshot,
} from '../../src/workspaces/mt5/mt5Model.js';

describe('mt5Model ledgers', () => {
  it('shows the newest trade journal rows first even when the CSV is oldest-first', () => {
    const tradeJournal = Array.from({ length: 44 }, (_, index) => ({
      EventTime: `2026.04.23 ${String(index % 24).padStart(2, '0')}:00`,
      EventType: 'ENTRY',
      Symbol: 'USDJPYc',
      NetProfit: '0.00',
      PositionId: String(index),
    }));
    tradeJournal[42] = {
      EventTime: '2026.05.04 08:00',
      EventType: 'ENTRY',
      Symbol: 'USDJPYc',
      NetProfit: '0.00',
      PositionId: '587641897',
    };
    tradeJournal[43] = {
      EventTime: '2026.05.04 08:19',
      EventType: 'EXIT',
      Symbol: 'USDJPYc',
      NetProfit: '0.06',
      PositionId: '587641897',
    };

    const rows = buildTradeJournalRows({ tradeJournal });

    expect(rows).toHaveLength(40);
    expect(rows[0]).toMatchObject({ 时间: '2026.05.04 08:19', 事件: 'EXIT', 净盈亏: '0.06' });
    expect(rows[1]).toMatchObject({ 时间: '2026.05.04 08:00', 事件: 'ENTRY' });
  });

  it('keeps close history latest-first when files are already latest-first', () => {
    const closeHistory = [
      { CloseTime: '2026.05.04 08:19', Symbol: 'USDJPYc', NetProfit: '0.06' },
      { CloseTime: '2026.05.01 12:30', Symbol: 'USDJPYc', NetProfit: '0.52' },
      { CloseTime: '2026.04.29 15:05', Symbol: 'USDJPYc', NetProfit: '-0.55' },
    ];

    const rows = buildCloseHistoryRows({ closeHistory });

    expect(rows[0]).toMatchObject({ 平仓时间: '2026.05.04 08:19', 净盈亏: '0.06' });
    expect(rows[1]).toMatchObject({ 平仓时间: '2026.05.01 12:30', 净盈亏: '0.52' });
  });

  it('explains live universe, shadow universe, tester window and Vibe-only strategy state', () => {
    const snapshot = normalizeMt5Snapshot({
      latest: {
        strategies: {
          RSI_Reversal: { enabled: true, active: true, riskMultiplier: 1, reason: 'Waiting for next H1 bar' },
        },
      },
      snapshot: {
        runtime: {
          tradeAllowed: true,
          executionEnabled: true,
          pilotKillSwitch: false,
          pilotStartupEntryGuardActive: false,
        },
      },
      dailyReview: {
        summary: {
          todayTodoStatus: 'SCHEDULED_FOR_TESTER_WINDOW',
          nextTesterWindowLabel: '2026-05-04 20:10-23:30 JST',
        },
        actionQueue: [{ candidateId: 'RSI_Reversal_USDJPYc_rsi_ultra_extreme_guard' }],
      },
      researchStats: {
        summary: {
          liveUniverseLabel: 'USDJPYc',
          shadowResearchUniverseLabel: 'USDJPYc / EURUSDc / XAUUSDc',
        },
      },
      governanceAdvisor: {
        summary: {
          shadowRows: 671,
          candidateRows: 227,
          candidateOutcomeRows: 375,
          paramLabResultParsed: 59,
          versionGatePromoteCandidates: 0,
          strategyVersionCount: 5,
        },
      },
    });

    const items = buildMt5SimulationItems(snapshot);

    expect(items.find((item) => item.label === '实盘Universe')?.value).toBe('USDJPYc');
    expect(items.find((item) => item.label === '模拟Universe')?.value).toBe('USDJPYc');
    expect(items.find((item) => item.label === '当前实盘策略')?.value).toBe('RSI 买入侧观察');
    expect(items.find((item) => item.label === '今日待办')?.hint).toContain('20:10-23:30');
    expect(items.find((item) => item.label === '缠论/MACD-TD')?.value).toContain('尚未进入');
  });

  it('treats an enabled RSI route waiting for signal as live observation', () => {
    const snapshot = normalizeMt5Snapshot({
      latest: {
        strategies: {
          RSI_Reversal: {
            enabled: true,
            active: false,
            runtimeLabel: 'ON',
            status: 'WAIT_SIGNAL',
            riskMultiplier: 1,
            reason: 'Waiting for first H1 RSI evaluation',
          },
        },
      },
      snapshot: {
        runtime: {
          tradeAllowed: true,
          executionEnabled: true,
          pilotKillSwitch: false,
          pilotStartupEntryGuardActive: false,
        },
      },
      researchStats: {
        summary: {
          liveUniverseLabel: 'USDJPYc',
          shadowResearchUniverseLabel: 'USDJPYc',
        },
      },
    });

    const items = buildMt5SimulationItems(snapshot);

    expect(items.find((item) => item.label === '当前实盘策略')?.value).toBe('RSI 买入侧观察');
    expect(items.find((item) => item.label === '当前实盘策略')?.status).toBe('ok');
  });

  it('builds a readable MT5 shadow ledger with pips equity and trade rows', () => {
    const snapshot = normalizeMt5Snapshot({
      shadowSignals: {
        data: {
          rows: [
            {
              LabelTimeLocal: '2026.05.05 10:00',
              Symbol: 'USDJPYc',
              Strategy: 'MA_Cross',
              Blocker: 'RANGE_REGIME',
            },
            {
              LabelTimeLocal: '2026.05.05 10:15',
              Symbol: 'USDJPYc',
              Strategy: 'MA_Cross',
              Blocker: 'RANGE_REGIME',
            },
            {
              LabelTimeLocal: '2026.05.05 10:30',
              Symbol: 'USDJPYc',
              Strategy: 'RSI_Reversal',
              Blocker: 'SESSION',
            },
            {
              LabelTimeLocal: '2026.05.05 10:45',
              Symbol: 'EURUSDc',
              Strategy: 'MA_Cross',
              Blocker: 'SPREAD',
            },
          ],
        },
      },
      shadowCandidateOutcomes: {
        data: {
          rows: [
            {
              EventId: 'A',
              OutcomeLabelTimeLocal: '2026.05.05 11:00',
              Symbol: 'USDJPYc',
              CandidateRoute: 'RANGE_SOFT',
              CandidateDirection: 'BUY',
              HorizonMinutes: '60',
              LongClosePips: '8.5',
              ShortClosePips: '-8.5',
              DirectionalOutcome: 'WIN',
              ReferencePrice: '156.25',
            },
            {
              EventId: 'B',
              OutcomeLabelTimeLocal: '2026.05.05 12:00',
              Symbol: 'EURUSDc',
              CandidateRoute: 'RANGE_SOFT',
              CandidateDirection: 'SELL',
              HorizonMinutes: '60',
              LongClosePips: '4.0',
              ShortClosePips: '-4.0',
              DirectionalOutcome: 'LOSS',
              ReferencePrice: '1.1010',
            },
          ],
        },
      },
    });

    const summary = buildMt5ShadowSummary(snapshot);
    const trades = buildMt5ShadowTradeRows(snapshot);
    const equity = buildMt5ShadowEquityRows(snapshot);

    expect(summary.metrics.find((item) => item.label === '模拟候选样本')?.value).toBe('1 笔');
    expect(summary.metrics.find((item) => item.label === '模拟点数净值')?.value).toBe('+8.5 pips');
    expect(summary.metrics.find((item) => item.label === '模拟胜率')?.value).toBe('100.0%');
    expect(summary.metrics.find((item) => item.label === '主要阻断')?.value).toContain('震荡');
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({ 品种: 'USDJPYc', 方向: '做多', 点数盈亏: '+8.5' });
    expect(equity[0]).toMatchObject({ 品种: 'USDJPYc', 模拟净值: '+8.5' });
  });

  it('keeps shadow builders USDJPY-only even when given raw unnormalized rows', () => {
    const rawSnapshot = {
      shadowSignals: [
        { LabelTimeLocal: '2026.05.05 10:00', Symbol: 'EURUSDc', Strategy: 'MA_Cross', Blocker: 'SPREAD' },
        {
          LabelTimeLocal: '2026.05.05 10:30',
          Symbol: 'USDJPYc',
          Strategy: 'RSI_Reversal',
          Blocker: 'SESSION',
        },
      ],
      shadowCandidateOutcomes: [
        {
          EventId: 'A',
          OutcomeLabelTimeLocal: '2026.05.05 11:00',
          Symbol: 'EURUSDc',
          CandidateRoute: 'MA_Cross',
          CandidateDirection: 'SELL',
          HorizonMinutes: '60',
          ShortClosePips: '12.0',
        },
        {
          EventId: 'B',
          OutcomeLabelTimeLocal: '2026.05.05 12:00',
          Symbol: 'USDJPYc',
          CandidateRoute: 'RSI_Reversal',
          CandidateDirection: 'BUY',
          HorizonMinutes: '60',
          LongClosePips: '4.0',
        },
      ],
    };

    const summary = buildMt5ShadowSummary(rawSnapshot);
    const trades = buildMt5ShadowTradeRows(rawSnapshot);
    const equity = buildMt5ShadowEquityRows(rawSnapshot);

    expect(summary.metrics.find((item) => item.label === '模拟候选样本')?.value).toBe('1 笔');
    expect(trades).toHaveLength(1);
    expect(trades[0].品种).toBe('USDJPYc');
    expect(equity[0].品种).toBe('USDJPYc');
  });

  it('summarizes Evidence OS execution feedback and Case Memory for the MT5 first screen', () => {
    const snapshot = normalizeMt5Snapshot({
      evidenceOS: {
        parity: {
          status: 'PARITY_PASS',
          evidenceSync: {
            strategyJsonBacktest: 'WRITTEN',
            pythonReplay: 'WRITTEN',
          },
          deepParity: {
            status: 'PASS',
            reasonZh: 'Strategy JSON / Python Replay / MQL5 EA 深度门禁矩阵一致',
            hardMismatches: [],
            missingOptionalFields: ['mql5.rsi.crossbackThreshold'],
          },
        },
        executionFeedback: {
          promotionGate: {
            status: 'BLOCKED',
            reasonZh: '执行反馈阻断晋级：最近两笔滑点过大',
            blockers: [{ code: 'SLIPPAGE_DAMAGE', reasonZh: '滑点损伤过大' }],
          },
          metrics: { rejectCount: 1, avgSlippagePips: 2.35, avgLatencyMs: 318 },
        },
        caseMemory: {
          caseMemoryToGA: { queuedHintCount: 1 },
          gaSeedHints: [
            {
              caseId: 'USDJPY-SLIPPAGE-001',
              mutationHint: 'reduce_slippage_damage',
              reasonZh: '下一代需要降低滑点损伤',
            },
          ],
        },
      },
    });

    const items = buildMt5EvidenceOsLiteItems(snapshot);

    expect(items.find((item) => item.label === '三方一致性')?.value).toBe('三方口径一致 / 证据已同步');
    expect(items.find((item) => item.label === '三方一致性')?.hint).toContain('crossbackThreshold');
    expect(items.find((item) => item.label === '三方一致性')?.hint).toContain(
      'Strategy JSON 已同步 / Python Replay 已同步',
    );
    expect(items.find((item) => item.label === '执行反馈晋级门')?.value).toBe('执行反馈阻断晋级');
    expect(items.find((item) => item.label === '执行阻断 / 警告')?.value).toContain('滑点损伤');
    expect(items.find((item) => item.label === '当前最大 Case')?.value).toBe('USDJPY-SLIPPAGE-001');
    expect(items.find((item) => item.label === '下一代 GA 修复方向')?.value).toBe('降低滑点损伤');
  });

  it('hides stale daily review rows instead of showing old EURUSD tasks', () => {
    const staleDailyReview = {
      generatedAtIso: '2026-05-06T12:00:00+09:00',
      actionQueue: [{ candidateId: 'MA_Cross_EURUSDc_old', symbol: 'EURUSDc', state: 'DONE' }],
      dailyPnl: { date: '2026-05-06', closedTrades: 4, netUSC: 2.78 },
      summary: { dailyReviewDateJst: '2026-05-06' },
    };

    const todoRows = buildMt5TodoRows({ dailyReview: staleDailyReview });
    const reviewRows = buildMt5ReviewRows({ dailyReview: staleDailyReview });

    expect(todoRows[0].状态).toContain('等待今日刷新');
    expect(JSON.stringify(todoRows)).not.toContain('EURUSDc');
    expect(reviewRows[0].结果).toContain('等待今日刷新');
    expect(JSON.stringify(reviewRows)).not.toContain('2026-05-06');
  });
});
