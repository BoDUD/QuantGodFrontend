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
          strategyIterationQueue: [{
            type: 'POLYMARKET_COPY_TRADING_RETUNE',
            status: 'RETUNE_SPEC_READY_STALE_REFRESH_QUEUED',
            completedByAgent: true,
            recommendation: 'Agent 已生成跟单 shadow-only 重调方案。',
          }],
        },
      },
    });

    expect(model.simulationItems.find((item) => item.label === '跟单策略')?.value).toBe('Agent 已生成重调方案');
    expect(model.simulationItems.find((item) => item.label === '下一轮跟单重调')?.status).toBe('ok');
    expect(model.reviewItems.find((item) => item.label === '跟单复盘')?.value).toContain('Agent 已生成');
    expect(model.reviewItems.find((item) => item.label === '跟单迭代方案')?.hint).toContain('结算样本不少于 200 笔');
    expect(model.reviewItems.find((item) => item.label === '跟单迭代方案')?.hint).not.toContain('closed >=');
  });
});
