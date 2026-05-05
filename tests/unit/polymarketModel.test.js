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
});
