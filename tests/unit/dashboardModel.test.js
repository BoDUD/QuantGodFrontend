import { describe, expect, it } from 'vitest';

import {
  buildDailyReviewRows,
  buildDailyTodoRows,
  buildActivationGateRows,
  buildDashboardMetrics,
  buildEndpointHealth,
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
    const latestHealth = buildEndpointHealth(raw).find((item) => item.endpoint === '/api/latest');

    expect(snapshot.latestDashboardStale).toBe(true);
    expect(freshnessMetric).toMatchObject({
      value: '过期',
      hint: 'MT5 dashboard 快照已过期',
    });
    expect(latestHealth).toMatchObject({
      status: 'warn',
      statusLabel: '快照过期',
      description: '恢复主 MT5/EA 进程并刷新 QuantGod_Dashboard.json。',
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
    const releaseEvidenceEndpoint = buildEndpointHealth(raw).find((item) => item.label === 'Release Token 证据');
    const releaseSignoffEndpoint = buildEndpointHealth(raw).find((item) => item.label === 'Release Token 签收草案');
    const releaseSignoffTemplateEndpoint = buildEndpointHealth(raw).find((item) => item.label === 'Release Token 签收模板');
    const releaseSignoffInputEndpoint = buildEndpointHealth(raw).find((item) => item.label === 'Release Token 签收输入');
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
            reasonZh: 'Live16 启动 ini 的 [Experts] AllowLiveTrading=0；重新启动时仍会保持终端级 live trading 关闭。',
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

    expect(snapshot.hfmCryptoRuntimeProbeLine).toBe('#BTCUSD runtime probe 缺失：当前 MT5 Experts 里的 exporter EA 不是最新版');
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
