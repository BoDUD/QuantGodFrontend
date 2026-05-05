import assert from 'node:assert/strict';
import test from 'node:test';

import { buildParamLabViewModel } from '../src/workspaces/paramlab/paramlabModel.js';

test('maps ParamLab results payload fields instead of placeholder rows', () => {
  const viewModel = buildParamLabViewModel({
    results: {
      data: {
        results: [
          {
            routeKey: 'BB_Triple',
            symbol: 'EURUSDc',
            timeframe: 'H1',
            status: 'PARSED_AGENT_ARTIFACTS',
            metrics: {
              closedTrades: 0,
              profitFactor: null,
              winRate: null,
              netProfit: 0,
            },
            generatedAtIso: '2026-05-05T02:56:09Z',
          },
        ],
      },
    },
  });

  assert.equal(viewModel.resultRows[0].路线, 'BB_Triple');
  assert.equal(viewModel.resultRows[0].品种, 'EURUSDc');
  assert.equal(viewModel.resultRows[0].周期, 'H1');
  assert.equal(viewModel.resultRows[0].状态, '报告已解析');
  assert.equal(viewModel.resultRows[0]['盈亏比(PF)'], '无成交');
  assert.equal(viewModel.resultRows[0].胜率, '无成交');
  assert.equal(viewModel.resultRows[0].交易数, '0');
});

test('maps uppercase ParamLab ledger rows returned by CSV facade', () => {
  const viewModel = buildParamLabViewModel({
    resultRows: [
      {
        RouteKey: 'MA_Cross',
        Symbol: 'USDJPYc',
        Timeframe: 'M15',
        Status: 'PARSED_AGENT_ARTIFACTS',
        ClosedTrades: '0',
        ProfitFactor: '0',
        WinRate: '',
        NetProfit: '0.0',
        GeneratedAtIso: '2026-05-05T02:56:09Z',
      },
    ],
  });

  assert.equal(viewModel.resultRows[0].路线, 'MA_Cross');
  assert.equal(viewModel.resultRows[0].品种, 'USDJPYc');
  assert.equal(viewModel.resultRows[0].周期, 'M15');
  assert.equal(viewModel.resultRows[0]['盈亏比(PF)'], '无成交');
  assert.equal(viewModel.resultRows[0].胜率, '无成交');
  assert.equal(viewModel.resultRows[0].净盈亏, '0.0');
});
