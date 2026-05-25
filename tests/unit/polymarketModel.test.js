import { describe, expect, it } from 'vitest';

import { buildPolymarketModel } from '../../src/workspaces/polymarket/polymarketModel.js';

describe('polymarketModel simulation explanation', () => {
  it('prefers live Polymarket account cash when displaying wallet balance', () => {
    const model = buildPolymarketModel({
      dailyReview: {
        copyTradingReview: {
          capitalSimulation: {
            accountCashUSDC: 1,
          },
        },
      },
      retunePlanner: {
        data: [
          {
            account: {
              accountCash: 7.100176,
            },
          },
        ],
      },
    });

    const wallet = model.metrics.find((item) => item.label === '钱包余额');

    expect(wallet?.value).toContain('7.10');
    expect(wallet?.status).toBe('ok');
  });

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
          takeProfitPct: 2,
          takeProfitUSDC: 0.05,
          stopLossPct: 4,
          trailingStopPct: 2,
          maxPositionUSDC: 5,
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
            takeProfitUSDC: 0.05,
            takeProfitUSDCPrice: 0.4941,
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
    expect(model.metrics.find((item) => item.label === '真实钱包TP/SL')?.hint).toContain('微利 $0.05');
    expect(model.realPositionItems.find((item) => item.label === '价格状态')?.hint).toContain('浮盈 $0.05');
    expect(wallet?.hint).not.toContain('没有放开真钱');
    expect(wallet?.status).toBe('ok');
    expect(clob?.value).toBe('CLOB已配置 / 实盘监控');
    expect(clob?.status).toBe('ok');
  });

  it('does not turn failed planned orders or historical fills into current positions', () => {
    const model = buildPolymarketModel({
      copyTraderDiscovery: {
        walletRiskPolicy: {
          realWalletExecutionAllowed: false,
        },
      },
      isolatedClobRuntime: {
        status: 'PREPARED_REAL_WALLET_BLOCKED',
        runtimePrepared: true,
        adapter: { name: 'isolated_clob' },
        clob: { hostConfigured: true },
      },
      canaryRun: {
        summary: {
          ordersSent: 0,
          walletPolicyRealExecutionAllowed: true,
        },
        plannedOrders: [
          {
            orderSent: false,
            question: 'Failed planned market',
            size: 8.13,
            limitPrice: 0.61,
            adapterStatus: 'CLOB_API_KEY_SIGNER_MISMATCH:PolyApiException',
            response: {
              originalError: 'the order signer address has to be the address of the API KEY',
            },
          },
        ],
      },
      canaryOrderAuditLedger: {
        rows: [
          {
            order_sent: 'true',
            response_status: 'matched',
            response_id: 'old-order-1',
            question: 'Historical market',
            size: 5.71,
            limit_price: 0.52,
          },
        ],
      },
      canaryExitMonitorRun: {
        planOnly: false,
        summary: {
          positionsTracked: 0,
          exitSignals: 0,
          exitsSent: 0,
        },
        positions: [],
      },
      canaryPositionLedger: {
        rows: [],
      },
    });

    expect(model.tables.realPositions).toHaveLength(0);
    expect(model.tables.realExecutions).toHaveLength(1);
    expect(model.simulationItems.find((item) => item.label === '真实下注')?.value).toBe('未开启');
    expect(model.simulationItems.find((item) => item.label === '真实下注')?.hint).toContain(
      '历史真实订单记录',
    );
    expect(model.progressItems.find((item) => item.label === '真钱钱包')?.value).not.toBe(
      '真实已接入 / 持仓监控',
    );
  });

  it('separates promoted source state from zero executable candidates', () => {
    const model = buildPolymarketModel({
      copyTraderDiscovery: {
        summary: {
          eligibleTraders: 15,
          rankedTraders: 30,
          shadowCandidates: 84,
          realWalletCandidates: 0,
          telegramWallets: 78,
          telegramSignals: 300,
        },
        walletRiskPolicy: {
          realWalletExecutionAllowed: true,
          sourceScopedMicroLiveGatePassed: true,
        },
      },
    });

    const promotion = model.progressItems.find((item) => item.label === '晋级状态');
    expect(promotion?.value).toBe('来源已晋级 / 候选0');
    expect(promotion?.hint).toContain('来源局部 micro-live 已通过');
    expect(promotion?.hint).toContain('没有逐笔候选');
    expect(promotion?.status).toBe('warn');
  });

  it('shows source quality separately from aggregate replay', () => {
    const model = buildPolymarketModel({
      copyTraderDiscovery: {
        sourceStatus: {
          telegramChannel: {
            channelNames: ['预测市场内幕钱包监控', 'AI 1000x Polymarket'],
            sources: {
              telethon: {
                signals: [
                  { channelName: '预测市场内幕钱包监控' },
                  { channelName: 'AI 1000x Polymarket' },
                  { channelName: 'AI 1000x Polymarket' },
                ],
              },
            },
          },
        },
      },
      copyTraderShadowReplay: {
        collection: {
          currentDiscoveryCandidates: 83,
        },
      },
      copyTraderSourceBuckets: {
        bySource: [
          {
            bucketType: 'source',
            bucketKey: 'telegram_telethon:预测市场内幕钱包监控',
            status: 'QUARANTINE',
            samples: 207,
            wins: 89,
            losses: 118,
            openOrUnresolved: 258,
            netPnlUSDC: -2.94,
            profitFactor: 0.377119,
            minSamples: 30,
            action: 'exclude_from_shadow_candidates',
          },
          {
            bucketType: 'source',
            bucketKey: 'telegram_telethon:ai 1000x polymarket',
            status: 'COLLECTING',
            samples: 28,
            wins: 19,
            losses: 9,
            openOrUnresolved: 42,
            netPnlUSDC: 0.02,
            profitFactor: 1.055556,
            minSamples: 30,
            action: 'collect_more_settled_samples',
          },
          {
            bucketType: 'source',
            bucketKey: 'copy_trader_discovery:self_explore',
            status: 'COLLECTING',
            samples: 14,
            wins: 1,
            losses: 13,
            openOrUnresolved: 69,
            netPnlUSDC: -0.44,
            profitFactor: 0.083333,
            minSamples: 30,
            action: 'collect_more_settled_samples',
          },
        ],
      },
    });

    const oldChannel = model.sourceQualityItems.find(
      (item) => item.label === '预测市场内幕钱包监控',
    );
    const aiChannel = model.sourceQualityItems.find(
      (item) => item.label === 'AI 1000x Polymarket',
    );
    const selfExplore = model.sourceQualityItems.find((item) => item.label === '自探索强交易员');

    expect(oldChannel?.value).toContain('隔离中');
    expect(oldChannel?.value).toContain('-$2.94');
    expect(aiChannel?.value).toContain('收集中');
    expect(aiChannel?.status).toBe('warn');
    expect(aiChannel?.hint).toContain('2');
    expect(selfExplore?.value).toContain('收集中');
    expect(selfExplore?.status).toBe('warn');
    expect(selfExplore?.hint).toContain('83');
    expect(model.tables.sourceQuality).toHaveLength(3);
  });

  it('labels retained source promotions as a hold state', () => {
    const model = buildPolymarketModel({
      copyTraderSourceBuckets: {
        bySource: [
          {
            bucketType: 'source',
            bucketKey: 'telegram_telethon:ai 1000x polymarket',
            status: 'PROMOTABLE_PROBATION',
            rawStatus: 'QUARANTINE',
            retainedPromotion: true,
            promotionHoldUntilIso: '2026-05-24T18:57:10.000Z',
            samples: 54,
            wins: 26,
            losses: 28,
            openOrUnresolved: 103,
            netPnlUSDC: -0.6,
            profitFactor: 0.464286,
            minSamples: 30,
            action: 'retain_micro_live_during_promotion_hold',
          },
        ],
      },
    });

    const aiChannel = model.sourceQualityItems.find(
      (item) => item.label === 'AI 1000x Polymarket',
    );

    expect(aiChannel?.value).toContain('晋级保持');
    expect(aiChannel?.hint).toContain('原始状态 隔离中');
    expect(aiChannel?.status).toBe('warn');
  });
});
