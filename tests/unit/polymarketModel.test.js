import { describe, expect, it } from 'vitest';

import { buildPolymarketModel } from '../../src/workspaces/polymarket/polymarketModel.js';

describe('polymarketModel simulation explanation', () => {
  it('makes research-only simulation and loss quarantine readable', () => {
    const model = buildPolymarketModel({
      canaryRun: { data: { rows: [{ status: 'EVIDENCE_BLOCKED' }, { status: 'EVIDENCE_BLOCKED' }] } },
      autoGovernance: { data: { rows: [{ governance_state: 'QUARANTINE_NO_PROMOTION' }] } },
      canaryLedger: {
        data: {
          rows: [
            { canary_state: 'EVIDENCE_BLOCKED' },
            { canary_state: 'EVIDENCE_BLOCKED' },
            { canary_state: 'EVIDENCE_BLOCKED' },
          ],
        },
      },
      autoGovernanceLedger: {
        data: {
          rows: [
            { governance_state: 'QUARANTINE_NO_PROMOTION' },
            { governance_state: 'QUARANTINE_NO_PROMOTION' },
          ],
        },
      },
      realTrades: { data: { rows: [] } },
      dailyReview: {
        summary: {
          polymarketLossQuarantine: true,
          polymarketTodoCount: 0,
          polymarketExecutedPF: 0.0145,
          polymarketShadowPF: 0.7055,
          completionReportStatus: 'COMPLETE_NO_ACTION',
          completionRecommendationCount: 2,
          codexReviewRequired: false,
        },
      },
    });

    expect(model.simulationItems.find((item) => item.label === '真实下注')?.value).toBe('未开启');
    expect(model.simulationItems.find((item) => item.label === '模拟在做什么')?.hint).toContain('3 条');
    expect(model.simulationItems.find((item) => item.label === '治理状态')?.hint).toContain('2 条治理证据');
    expect(model.simulationItems.find((item) => item.label === '当前效果')?.value).toContain('影子PF');
    expect(model.simulationItems.find((item) => item.label === '当前效果')?.hint).toContain('亏损来源');
    expect(model.reviewItems.find((item) => item.label === '亏损复盘')?.value).toBe('仍在隔离');
    expect(model.tables.canaryLedger).toHaveLength(3);
    expect(model.tables.autoGovernanceLedger).toHaveLength(2);
  });

  it('shows agent-generated copy retune plan instead of manual stale warning', () => {
    const model = buildPolymarketModel({
      dailyReview: {
        summary: {
          polymarketLossQuarantine: true,
          polymarketExecutedPF: 0.0145,
          polymarketShadowPF: 0.7055,
        },
        polymarket: {
          dailyReview: {
            summary: {
              lossQuarantine: true,
              retuneRed: 3,
              retuneYellow: 2,
              retuneCopyTrading: 1,
            },
            copyTradingReview: {
              active: true,
              status: 'COPY_TRADING_RETUNE_REQUIRED',
              operatorStatusLabel: 'Agent 已生成跟单重调方案',
              summary: 'Agent 已生成下一轮全市场 shadow 重调方案。',
              capitalSimulation: {
                cashScaledPnlUSDC: -0.06,
              },
              iterationPlan: {
                completedByAgent: true,
                retuneRequired: true,
                candidateVariants: [
                  { key: 'copy_archive_all_market_whitelist_v2' },
                  { key: 'copy_archive_market_family_split_v1' },
                ],
                acceptanceCriteriaZh: ['结算样本不少于 200 笔', 'Profit Factor 不低于 1.10'],
              },
            },
          },
        },
        dailyIteration: {
          strategyIterationQueue: [
            {
              type: 'POLYMARKET_COPY_TRADING_RETUNE',
              status: 'RETUNE_SPEC_READY_STALE_REFRESH_QUEUED',
              completedByAgent: true,
              recommendation: 'Agent 已生成跟单 shadow-only 重调方案。',
            },
          ],
        },
      },
    });

    expect(model.simulationItems.find((item) => item.label === '跟单策略')?.value).toBe(
      'Agent 已生成重调方案',
    );
    expect(model.simulationItems.find((item) => item.label === '下一轮跟单重调')?.status).toBe('ok');
    expect(model.reviewItems.find((item) => item.label === '跟单复盘')?.value).toContain('Agent 已生成');
    expect(model.reviewItems.find((item) => item.label === '跟单迭代方案')?.hint).toContain(
      '结算样本不少于 200 笔',
    );
    expect(model.reviewItems.find((item) => item.label === '跟单迭代方案')?.hint).not.toContain('closed >=');
  });

  it('does not show real wallet as unconnected after a matched live order', () => {
    const model = buildPolymarketModel({
      copyTraderDiscovery: {
        walletRiskPolicy: {
          realWalletExecutionAllowed: false,
          runtimePreflight: {
            blockers: ['walk_forward_not_validated', 'real_execution_switch_false'],
          },
          takeProfitPct: 35,
          stopLossPct: 18,
          trailingStopPct: 12,
          maxPositionUSDC: 3,
          maxDailyLossUSDC: 2,
        },
      },
      isolatedClobRuntime: {
        status: 'PREPARED_REAL_WALLET_BLOCKED',
        adapter: { name: 'isolated_clob' },
        clob: { hostConfigured: true },
        safety: { orderSendAllowed: false },
        preflight: {
          blockers: ['real_execution_switch_false'],
        },
        runtimePrepared: true,
      },
      canaryOrderAuditLedger: {
        rows: [
          {
            order_sent: 'true',
            response_status: 'matched',
            response_id: 'order-1',
            question: 'Example market',
            size: 12.23,
            limit_price: 0.49,
          },
        ],
      },
      canaryExitMonitorRun: {
        planOnly: false,
        summary: {
          positionsTracked: 1,
          exitSignals: 0,
          exitsSent: 0,
        },
        positions: [
          {
            orderID: 'order-1',
            question: 'Example market',
            positionSize: 12.23,
            entryPrice: 0.49,
            currentExitPrice: 0.54,
            decision: 'HOLD',
          },
        ],
      },
    });

    const wallet = model.progressItems.find((item) => item.label === '真钱钱包');
    const clob = model.progressItems.find((item) => item.label === 'Isolated CLOB');
    expect(wallet?.value).toBe('真实已接入 / 持仓监控');
    expect(wallet?.hint).toContain('已有真实订单 1 笔');
    expect(wallet?.hint).toContain('新开仓扩容当前仍受门控');
    expect(wallet?.hint).not.toContain('没有放开真钱');
    expect(wallet?.status).toBe('ok');
    expect(clob?.value).toBe('CLOB已配置 / 实盘监控');
    expect(clob?.status).toBe('ok');
  });
});
