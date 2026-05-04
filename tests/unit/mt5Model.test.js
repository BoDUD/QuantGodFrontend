import { describe, expect, it } from 'vitest';

import {
  buildCloseHistoryRows,
  buildMt5SimulationItems,
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
          shadowResearchUniverseLabel: 'USDJPYc,EURUSDc,XAUUSDc',
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
    expect(items.find((item) => item.label === '模拟Universe')?.value).toBe('USDJPYc,EURUSDc,XAUUSDc');
    expect(items.find((item) => item.label === '当前实盘策略')?.value).toBe('RSI 买入侧观察');
    expect(items.find((item) => item.label === '今日待办')?.hint).toContain('20:10-23:30');
    expect(items.find((item) => item.label === '缠论/MACD-TD')?.value).toContain('尚未进入');
  });
});
