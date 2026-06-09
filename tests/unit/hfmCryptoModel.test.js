import { describe, expect, it } from 'vitest';

import { buildHfmCryptoModel } from '../../src/workspaces/hfm-crypto/hfmCryptoModel.js';

describe('hfmCryptoModel', () => {
  it('surfaces an authorized HFM account with zero crypto CFD symbols as an account blocker', () => {
    const model = buildHfmCryptoModel({
      mt5Snapshot: {
        ok: true,
        status: 'READY',
        snapshotFresh: true,
        account: {
          login: 186054398,
          server: 'HFMarketsGlobal-Live12',
          currency: 'USC',
          tradeAllowed: true,
          tradeExpert: true,
        },
        runtime: {
          terminalConnected: true,
          accountAuthorized: true,
        },
        market: {
          symbol: 'USDJPYc',
        },
      },
      status: {
        ok: true,
        status: 'WAITING_HFM_ACCOUNT_CRYPTO_CFD_SYMBOLS',
        statusZh: '当前 HFM 账号未下发 Crypto CFD symbols',
        nextRequiredActionZh: '需要换用开通 HFM crypto CFD 的 HFM 账号/服务器。',
        operatorChecklist: [
          {
            id: 'mt5_account_symbol_inventory',
            labelZh: '确认 MT5 账号已授权并下发 broker symbol 清单',
            status: 'PASS',
            statusZh: '已读到账号 symbol 清单',
            passed: true,
            required: true,
            automated: true,
            nextActionZh: '账号链路已通，继续检查是否包含 crypto CFD。',
          },
          {
            id: 'hfm_account_crypto_cfd_symbols',
            labelZh: 'HFM 账号/服务器下发 crypto CFD symbols',
            status: 'BLOCKED',
            statusZh: '当前账号/服务器没有 crypto CFD symbols',
            blocking: true,
            required: true,
            automated: false,
            nextActionZh: '换用开通 HFM crypto CFD 的 HFM MT5 账号/服务器。',
          },
        ],
        targetSymbols: ['BTCUSD', 'ETHUSD'],
        symbolEvidence: {
          found: false,
          canonicalSymbols: [],
          brokerSymbols: [],
          sources: [],
          brokerSymbolDiagnostics: {
            brokerSymbolTotalAll: 56,
            brokerSymbolTotalMarketWatch: 13,
            brokerCryptoLikeCountAll: 0,
            brokerCryptoLikeCountMarketWatch: 0,
            brokerSymbolSampleCount: 2,
            brokerSymbolSamples: [
              {
                brokerSymbol: 'USDJPYc',
                canonicalSymbol: 'USDJPY',
                description: 'US Dollar vs Japanese Yen (Cent)',
                path: 'ForexCent\\USDJPYc',
                visible: true,
                selected: true,
                looksLikeCrypto: false,
                spread: 55,
              },
              {
                brokerSymbol: 'XAUUSDc',
                canonicalSymbol: 'XAUUSD',
                description: 'Gold vs US Dollar (Cent)',
                path: 'Metals\\XAUUSDc',
                visible: true,
                selected: true,
                looksLikeCrypto: false,
                spread: 200,
              },
            ],
          },
        },
        blockers: [
          {
            code: 'HFM_MT5_ACCOUNT_NO_CRYPTO_CFD_SYMBOLS',
            reasonZh: '账号已成功授权并下发 symbol 清单，但当前 HFM 账号/服务器没有 crypto CFD symbol。',
          },
        ],
        safety: {
          readOnly: true,
          shadowOnly: true,
          mt5OrderSendAllowed: false,
        },
      },
      liveReadiness: {
        ok: true,
        lanes: {
          hfmCryptoCfd: {
            accountNoCryptoSymbols: true,
            accountCryptoAvailability: {
              statusZh: '当前 HFM 账号未下发 Crypto CFD symbols',
              nextRequiredActionZh: '需要换用开通 HFM crypto CFD 的 HFM 账号/服务器。',
            },
            reviewBlockers: [
              {
                code: 'HFM_MT5_ACCOUNT_NO_CRYPTO_CFD_SYMBOLS',
                reasonZh: '当前账号/服务器没有 crypto CFD symbols。',
              },
            ],
          },
        },
      },
    });

    const conclusion = model.accountCryptoAvailabilityItems.find((item) => item.label === '结论');
    const mt5Account = model.accountCryptoAvailabilityItems.find((item) => item.label === 'MT5 账号');
    const cryptoCount = model.accountCryptoAvailabilityItems.find((item) => item.label === 'Crypto-like symbols');
    const metric = model.metrics.find((item) => item.label === 'Crypto 接入卡点');
    const readiness = model.readinessItems.find((item) => item.label === '账号 Crypto 可用性');
    const accountLane = model.accountItems.find((item) => item.label === 'HFM Crypto CFD');
    const checklistBlocker = model.operatorChecklistItems.find((item) => item.label === 'HFM 账号/服务器下发 crypto CFD symbols');
    const liveReadiness = model.liveReadinessItems.find((item) => item.label === 'HFM Crypto');

    expect(conclusion).toMatchObject({
      value: '账号已连接，但未下发 HFM crypto CFD symbol',
      status: 'blocked',
    });
    expect(mt5Account).toMatchObject({
      value: '#186054398 / HFMarketsGlobal-Live12',
      status: 'ok',
    });
    expect(cryptoCount).toMatchObject({
      value: 0,
      status: 'blocked',
    });
    expect(metric).toMatchObject({
      value: '当前账号无 crypto CFD',
    });
    expect(metric.hint).toContain('56 个 broker symbol');
    expect(readiness).toMatchObject({
      value: '账号已连接，但未下发 HFM crypto CFD symbol',
      status: 'blocked',
    });
    expect(accountLane).toMatchObject({
      value: '账号已连接，但未下发 HFM crypto CFD symbol',
      status: 'blocked',
    });
    expect(checklistBlocker).toMatchObject({
      value: '当前账号/服务器没有 crypto CFD symbols',
      status: 'blocked',
    });
    expect(liveReadiness).toMatchObject({
      value: '当前 HFM 账号未下发 Crypto CFD symbols',
      status: 'blocked',
    });
    expect(liveReadiness.hint).toContain('换用开通 HFM crypto CFD');
    expect(model.tables.operatorChecklist[1]).toMatchObject({
      项目: 'HFM 账号/服务器下发 crypto CFD symbols',
      状态: '当前账号/服务器没有 crypto CFD symbols',
      人工: '是',
    });
    expect(model.tables.brokerSymbolSamples).toHaveLength(2);
    expect(model.tables.brokerSymbolSamples[0]).toMatchObject({
      Broker名: 'USDJPYc',
      Crypto匹配: '否',
    });
  });

  it('marks HFM crypto availability as ok when broker diagnostics include crypto-like symbols', () => {
    const model = buildHfmCryptoModel({
      status: {
        ok: true,
        status: 'READY_HFM_CRYPTO_CFD_SHADOW_EVIDENCE',
        symbolEvidence: {
          found: true,
          brokerSymbolDiagnostics: {
            brokerSymbolTotalAll: 58,
            brokerSymbolTotalMarketWatch: 15,
            brokerCryptoLikeCountAll: 2,
            brokerCryptoLikeCountMarketWatch: 1,
            brokerSymbolSamples: [
              {
                brokerSymbol: 'BTCUSD',
                canonicalSymbol: 'BTCUSD',
                description: 'Bitcoin vs US Dollar',
                path: 'Crypto\\BTCUSD',
                visible: true,
                selected: true,
                looksLikeCrypto: true,
              },
            ],
          },
        },
      },
    });

    const conclusion = model.accountCryptoAvailabilityItems.find((item) => item.label === '结论');
    const cryptoCount = model.accountCryptoAvailabilityItems.find((item) => item.label === 'Crypto-like symbols');

    expect(conclusion).toMatchObject({
      value: '账号已下发 HFM crypto CFD symbol',
      status: 'ok',
    });
    expect(cryptoCount).toMatchObject({
      value: 2,
      status: 'ok',
    });
    expect(model.tables.brokerSymbolSamples[0]).toMatchObject({
      Broker名: 'BTCUSD',
      Crypto匹配: '是',
    });
  });

  it('surfaces runtime preflight data-plane ready state without showing a data wait', () => {
    const model = buildHfmCryptoModel({
      runtimePreflight: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        statusZh: '数据面预检已通过，等待执行模式闸门',
        runtimeProbePassed: false,
        dataPlaneReadyForLivePilotReview: true,
        executionModeOnlyBlocked: true,
        blockers: [
          {
            code: 'MT5_LIVE_PILOT_MODE_NOT_CONFIRMED',
            reasonZh: 'MT5 dashboard 尚未证明 livePilotMode=true。',
          },
          {
            code: 'MT5_READ_ONLY_MODE_STILL_ACTIVE',
            reasonZh: 'MT5 dashboard 仍处于 readOnly/shadow 模式。',
          },
        ],
      },
      orderRequestContract: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        statusZh: '数据面已通过，等待执行模式闸门',
        readyForAdapterCodeReview: false,
        runtimePreflightDataPlaneReadyForReview: true,
        runtimePreflightExecutionModeOnlyBlocked: true,
        blockers: [
          {
            code: 'EXECUTION_MODE_GATES_NOT_ACTIVE',
            reasonZh: '数据面预检已通过，但 MT5/EA 执行模式闸门尚未打开。',
          },
        ],
      },
    });

    const metric = model.metrics.find((item) => item.label === '运行时预检');
    const requestMetric = model.metrics.find((item) => item.label === 'MT5请求合约');
    const livePreflight = model.liveReadinessItems.find((item) => item.label === '运行时预检');
    const requestContract = model.liveReadinessItems.find((item) => item.label === '请求合约');

    expect(metric).toMatchObject({
      value: '数据面预检已通过，等待执行模式闸门',
    });
    expect(metric.hint).toContain('数据、账号、BTC tick、价差、审批和 dry-run 已通过');
    expect(metric.hint).not.toContain('symbol / kill switch');
    expect(requestMetric.hint).toContain('runtime 数据面已通过');
    expect(livePreflight).toMatchObject({
      value: '数据面预检已通过，等待执行模式闸门',
      status: 'warn',
    });
    expect(requestContract).toMatchObject({
      value: '数据面已通过，等待执行模式闸门',
      status: 'blocked',
    });
  });

  it('marks execution-chain data-plane ready states as waiting for execution gates instead of missing data', () => {
    const gateBlocker = {
      code: 'EXECUTION_MODE_GATES_NOT_ACTIVE',
      reasonZh: '数据面已具备，仅等待 livePilotMode/readOnlyMode/executionEnabled/tradeAllowed。',
    };
    const model = buildHfmCryptoModel({
      eaRequestReaderReview: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        statusZh: 'EA request reader 数据面已通过，等待执行模式闸门',
        dataPlaneEaRequestReaderReady: true,
        executionModeOnlyBlocked: true,
        readyForEaRequestReaderImplementationReview: false,
        blockers: [gateBlocker],
      },
      eaRequestConsumptionReview: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        statusZh: 'EA request consumption 数据面已通过，等待执行模式闸门',
        dataPlaneEaRequestConsumptionReady: true,
        executionModeOnlyBlocked: true,
        readyForEaRequestConsumptionReview: false,
        blockers: [gateBlocker],
      },
      brokerOrderSendReview: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        statusZh: 'broker order send 数据面已通过，等待执行模式闸门',
        dataPlaneBrokerOrderSendReady: true,
        executionModeOnlyBlocked: true,
        readyForBrokerOrderSendReview: false,
        blockers: [gateBlocker],
      },
    });

    expect(model.liveReadinessItems.find((item) => item.label === 'EA Request Reader')).toMatchObject({
      value: 'EA request reader 数据面已通过，等待执行模式闸门',
      status: 'warn',
    });
    expect(model.liveReadinessItems.find((item) => item.label === 'EA Request Consumption')).toMatchObject({
      value: 'EA request consumption 数据面已通过，等待执行模式闸门',
      status: 'warn',
    });
    expect(model.liveReadinessItems.find((item) => item.label === 'Broker Order Send')).toMatchObject({
      value: 'broker order send 数据面已通过，等待执行模式闸门',
      status: 'warn',
    });
  });

  it('surfaces the review-only live pilot preset activation package', () => {
    const model = buildHfmCryptoModel({
      livePilotActivationReview: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        statusZh: '收益和数据面已达标，等待执行模式闸门',
        presetActivationPackage: {
          status: 'WAITING_EXECUTION_MODE_ACTIVATION',
          statusZh: '只生成审查包，不写 preset、不写订单请求',
          reviewedPresetChangePlan: [
            {
              lane: 'forexMt5',
              route: 'USDJPY_RSI_REVERSAL_H1_MICRO_PILOT',
              changes: [
                {
                  key: 'ReadOnlyMode',
                  from: true,
                  to: false,
                  whyZh: '进入 reviewed live pilot 需要关闭只读模式。',
                },
                {
                  key: 'EnablePilotRsiH1Live',
                  from: false,
                  to: true,
                  whyZh: '只启用已审查的 USDJPY RSI live 微型通道。',
                },
              ],
            },
            {
              lane: 'btcCryptoCfd',
              route: 'HFM_CRYPTO_CFD_REQUEST_READER_PILOT',
              changes: [
                {
                  key: 'EnableEARequestReaderReviewHarness',
                  from: false,
                  to: 'reviewed staged enablement',
                  whyZh: 'BTC 需要 request reader 和 broker send 独立评审。',
                },
              ],
            },
          ],
          reviewOnlyPresetCandidates: [
            {
              candidateId: 'forex_mt5_usdjpy_rsi_micro_live_pilot_review_only',
              lane: 'forexMt5',
              statusZh: '外币 live pilot 候选配置已生成，仅供审查',
              canAttachNow: false,
              candidateSettings: [
                {
                  key: 'ReadOnlyMode',
                  currentValue: 'true',
                  candidateValue: 'false',
                  reasonZh: '解除 READ_ONLY_MODE。',
                },
                {
                  key: 'EnablePilotRsiH1Live',
                  currentValue: 'false',
                  candidateValue: 'true',
                  reasonZh: '只打开 USDJPY RSI live 微型路线。',
                },
              ],
            },
            {
              candidateId: 'btc_hfm_crypto_cfd_request_reader_live_pilot_review_only',
              lane: 'btcCryptoCfd',
              statusZh: 'BTC/HFM crypto 候选配置已定义',
              canAttachNow: false,
              candidateSettings: [
                {
                  key: 'Watchlist',
                  currentValue: 'USDJPY',
                  candidateValue: '#BTCUSD or reviewed broker crypto symbol',
                  reasonZh: '让 MT5 dashboard 输出 HFM crypto CFD 实时 tick。',
                },
              ],
            },
          ],
          reviewOnlyCandidateFilePackage: {
            schema: 'quantgod.review_only_live_pilot_activation_candidate_files.v1',
            packageMode: 'REVIEW_ONLY_ACTIVATION_CANDIDATE_FILES_NO_MT5_MUTATION',
            manifestPath: '/tmp/qg/agent/review_only_activation_candidates/QuantGod_LivePilotActivationCandidateManifest.json',
            reviewArtifactFilesWritten: true,
            files: [
              {
                lane: 'forexMt5',
                route: 'USDJPY_RSI_REVERSAL_H1_MICRO_PILOT',
                previewPath: '/tmp/qg/agent/review_only_activation_candidates/forex.review-only.txt',
                reviewArtifactFileWritten: true,
                writesMt5Preset: false,
                writesMt5OrderRequest: false,
                orderSendAllowed: false,
                canAttachNow: false,
              },
              {
                lane: 'btcCryptoCfd',
                route: 'HFM_CRYPTO_CFD_REQUEST_READER_PILOT',
                previewPath: '/tmp/qg/agent/review_only_activation_candidates/btc.review-only.txt',
                reviewArtifactFileWritten: true,
                writesMt5Preset: false,
                writesMt5OrderRequest: false,
                orderSendAllowed: false,
                canAttachNow: false,
              },
            ],
          },
        },
      },
    });

    expect(model.tables.livePilotPresetActivationRows).toEqual([
      expect.objectContaining({
        Lane: 'forexMt5',
        Route: 'USDJPY_RSI_REVERSAL_H1_MICRO_PILOT',
        Key: 'ReadOnlyMode',
        From: true,
        To: false,
        可执行: '否',
      }),
      expect.objectContaining({
        Lane: 'forexMt5',
        Key: 'EnablePilotRsiH1Live',
        可执行: '否',
      }),
      expect.objectContaining({
        Lane: 'btcCryptoCfd',
        Route: 'HFM_CRYPTO_CFD_REQUEST_READER_PILOT',
        Key: 'EnableEARequestReaderReviewHarness',
        可执行: '否',
      }),
    ]);
    expect(model.tables.livePilotPresetCandidateRows).toEqual([
      expect.objectContaining({
        Lane: 'forexMt5',
        Candidate: 'forex_mt5_usdjpy_rsi_micro_live_pilot_review_only',
        Key: 'ReadOnlyMode',
        Current: 'true',
        CandidateValue: 'false',
        可挂载: '否',
      }),
      expect.objectContaining({
        Lane: 'forexMt5',
        Key: 'EnablePilotRsiH1Live',
        CandidateValue: 'true',
        可挂载: '否',
      }),
      expect.objectContaining({
        Lane: 'btcCryptoCfd',
        Candidate: 'btc_hfm_crypto_cfd_request_reader_live_pilot_review_only',
        Key: 'Watchlist',
        CandidateValue: '#BTCUSD or reviewed broker crypto symbol',
        可挂载: '否',
      }),
    ]);
    expect(model.tables.livePilotCandidateFileRows).toEqual([
      expect.objectContaining({
        Lane: 'forexMt5',
        Route: 'USDJPY_RSI_REVERSAL_H1_MICRO_PILOT',
        Preview: '/tmp/qg/agent/review_only_activation_candidates/forex.review-only.txt',
        Manifest: '/tmp/qg/agent/review_only_activation_candidates/QuantGod_LivePilotActivationCandidateManifest.json',
        已写审查文件: '是',
        写MT5预设: '否',
        写订单请求: '否',
        允许下单: '否',
        可挂载: '否',
      }),
      expect.objectContaining({
        Lane: 'btcCryptoCfd',
        Route: 'HFM_CRYPTO_CFD_REQUEST_READER_PILOT',
        Preview: '/tmp/qg/agent/review_only_activation_candidates/btc.review-only.txt',
        已写审查文件: '是',
        写MT5预设: '否',
        写订单请求: '否',
        允许下单: '否',
        可挂载: '否',
      }),
    ]);
  });

  it('shows target reached execution gate blockers without falling back to waiting-data copy', () => {
    const model = buildHfmCryptoModel({
      liveReadiness: {
        runtimeScope: {
          scope: 'secondary',
          requestedScope: 'secondary',
          accountLabel: 'HFM Live16 crypto CFD',
          runtimeDir: '/Users/bowen/Library/Application Support/net.metaquotes.wine.metatrader5-live16/drive_c/Program Files/MetaTrader 5/MQL5/Files',
        },
      },
      releaseReadinessRefresh: {
        status: 'WAITING_RELEASE_TOKENS_AND_EXECUTION_MODE',
        statusZh: '5 个 release token 未释放，且 4 个 MT5 执行模式闸门未通过',
        canReleaseExecutionNow: false,
        postTargetExecutionSummary: {
          schema: 'quantgod.post_target_execution_summary.v1',
          stage: 'TARGET_REACHED_EXECUTION_LOCKED_REVIEW_ONLY',
          status: 'WAITING_RELEASE_TOKENS_AND_EXECUTION_MODE',
          statusZh: '收益目标已达成，执行仍锁定：5 个 release token 未释放，4 个 MT5 执行模式闸门未通过',
          canReleaseExecutionNow: false,
          primaryActionableBlocker: {
            code: 'DEPLOYED_PRESET_READ_ONLY_TRUE',
            reasonZh: '当前部署 preset 仍为 ReadOnlyMode=true。',
          },
          blockedReleaseTokenCodes: [
            'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
            'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
          ],
        },
        primaryActionableBlocker: {
          code: 'STARTUP_CONFIG_ALLOW_LIVE_TRADING_OFF',
          reasonZh: 'Live16 启动 ini 的 [Experts] AllowLiveTrading=0；重新启动时仍会保持终端级 live trading 关闭。',
        },
        fileEvidenceBlockers: [
          {
            code: 'DEPLOYED_PRESET_READ_ONLY_TRUE',
            reasonZh: '当前部署 preset 仍为 ReadOnlyMode=true。',
          },
        ],
        executionReleaseGateSummary: {
          statusZh: '5 个执行 release token 未释放',
          blockerCodes: ['REQUEST_WRITE_RELEASE_TOKEN_MISSING'],
        },
        releaseUnblockPlan: {
          schema: 'quantgod.release_unblock_plan.v1',
          status: 'TARGET_REACHED_REVIEW_ONLY_UNBLOCK_PLAN',
          statusZh: '收益已达标；待审查 5 个 release token 和 4 个 MT5 执行模式最小 diff',
          canReleaseExecutionNow: false,
          orderSendAllowed: false,
          mt5OrderSendAllowed: false,
          nextSafeActionZh: '生成审查用最小 diff 和 release-token 证据清单；未通过单独执行 lane 评审前保持只读。',
        },
      },
      executionLaneSpec: {
        authorizationBoundary: {
          schema: 'quantgod.authorization_boundary.v1',
          chatAuthorizationAcknowledged: true,
          chatAuthorizationCanUnlockLiveExecution: false,
          operatorApprovalJsonCanUnlockLiveExecution: false,
          canReleaseExecutionNow: false,
          reasonZh: '聊天授权不能单独打开真实下单；仍需 release token 与 MT5 执行模式证据。',
        },
        postTargetReleaseAudit: {
          schema: 'quantgod.execution_lane_post_target_release_audit.v1',
          status: 'TARGET_REACHED_EXECUTION_RELEASE_BLOCKED',
          statusZh: '收益已达标，但 5 个 release token 和 4 个 MT5 执行模式闸门仍未释放',
          canReleaseExecutionNow: false,
          combinedVerifiedUsdProfit: 137.22,
          primaryActionableBlocker: {
            code: 'DEPLOYED_PRESET_READ_ONLY_TRUE',
            reasonZh: '当前部署 preset 仍为 ReadOnlyMode=true。',
          },
          blockedReleaseTokenCodes: [
            'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
            'REQUEST_READER_RELEASE_TOKEN_MISSING',
            'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
          ],
        },
      },
      releaseMinimalDiffReview: {
        schema: 'quantgod.release_minimal_diff_review.v1',
        status: 'TARGET_REACHED_MINIMAL_DIFF_READY_FOR_SEPARATE_REVIEW',
        statusZh: '收益已达标；最小 diff 审查包已生成，仍待 5 个 release token 和 4 个执行模式闸门',
        canReleaseExecutionNow: false,
        nextRequiredActionZh: '把本审查包作为单独 execution release 评审输入；通过前不得改 ini/preset、写 request 或调用 broker。',
        reviewPackage: {
          proposedChanges: [
            {
              artifact: 'startupConfig',
              section: 'Experts',
              key: 'AllowLiveTrading',
              from: '0',
              to: '1',
              canApplyNow: false,
              blockerCode: 'STARTUP_CONFIG_ALLOW_LIVE_TRADING_OFF',
              reviewRequirementZh: '单独评审终端级 AllowLiveTrading=1。',
            },
            {
              artifact: 'deployedPreset',
              key: 'ReadOnlyMode',
              from: 'true',
              to: 'false',
              canApplyNow: false,
              blockerCode: 'DEPLOYED_PRESET_READ_ONLY_TRUE',
              reviewRequirementZh: '单独评审 ReadOnlyMode=false 的最小 diff。',
            },
          ],
          releaseTokens: [
            {
              tokenName: 'QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1',
              gateId: 'broker_order_send_release',
              labelZh: 'Broker OrderSend',
              sideEffectZh: '调用 MT5 OrderSend',
              dataPlaneReady: true,
              tokenProvided: false,
              canMintNow: false,
              blockerCode: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
              requiredEvidenceZh: '需要单独审查的 release token、no-side-effect 测试和 kill-switch 探针证据。',
            },
          ],
        },
      },
      releaseTokenEvidenceReview: {
        schema: 'quantgod.release_token_evidence_review.v1',
        status: 'WAITING_RELEASE_TOKEN_EVIDENCE_AND_SEPARATE_REVIEW',
        statusZh: '无副作用证据已完成 1/1；release token 已提供 0/1，保持 review-only',
        canReleaseExecutionNow: false,
        releaseTokenCount: 1,
        missingEvidenceCount: 1,
        evidenceCompleteCount: 1,
        noSideEffectEvidenceCompleteCount: 1,
        tokenProvidedCount: 0,
        tokenMissingCount: 1,
        tokenMissingOnly: true,
        releaseBlockerClass: 'TOKEN_MISSING_ONLY_AFTER_NO_SIDE_EFFECT_EVIDENCE',
        manualReleaseReviewReadyCount: 1,
        manualReleaseReviewStatus: 'READY_FOR_SEPARATE_SIGNOFF_REVIEW',
        manualReleaseReviewStatusZh: '1/1 个 release token 可进入单独签收评审；本 artifact 不签收、不铸造 token',
        nextRequiredActionZh: '按 evidenceRows 逐项补单独 release token 审查证据；通过前不得写 request、消费 request、调用 broker、写 receipt 或自动改 preset。',
        evidenceRows: [
          {
            gateId: 'broker_order_send_release',
            labelZh: 'Broker OrderSend',
            tokenName: 'QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1',
            blockerCode: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
            contractArtifact: 'brokerOrderSendReview',
            sideEffectZh: '调用 MT5 OrderSend',
            dataPlaneReady: true,
            evidenceComplete: true,
            noSideEffectEvidenceComplete: true,
            evidencePassedCount: 6,
            evidenceCheckCount: 6,
            tokenProvided: false,
            releaseAllowedNow: false,
            requiredChecks: ['OrderSend plan is schema-validated'],
            testCommands: ['node --test tests/node/test_live_automation_readiness_guard.mjs'],
          },
        ],
        manualReleaseReviewRows: [
          {
            gateId: 'broker_order_send_release',
            status: 'READY_FOR_SEPARATE_SIGNOFF_REVIEW',
            statusZh: '无副作用证据已齐，可进入单独 release token 签收评审',
            readyForSeparateSignoffReview: true,
            canSignOffHere: false,
            canMintTokenHere: false,
          },
        ],
      },
      releaseTokenSignoffDraft: {
        schema: 'quantgod.release_token_signoff_draft.v1',
        status: 'READY_FOR_SEPARATE_SIGNOFF_INPUT',
        statusZh: '1/1 个 release token 已生成签收输入草案；当前 artifact 不签收、不铸造 token',
        releaseTokenCount: 1,
        readyForSeparateSignoffCount: 1,
        cannotBeUsedAsReleaseToken: true,
        canSignOffHere: false,
        canMintTokenHere: false,
        canReleaseExecutionNow: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
        signoffDraftTemplate: {
          releaseTokenSignoffs: [
            {
              gateId: 'broker_order_send_release',
              labelZh: 'Broker OrderSend',
              tokenName: 'QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1',
              blockerCode: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
              sideEffectZh: '调用 MT5 OrderSend',
              readyForSeparateSignoffReview: true,
              canSignOffHere: false,
              canMintTokenHere: false,
              canReleaseExecutionNow: false,
              signoffQuestionZh: '是否允许释放 QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1？',
            },
          ],
        },
      },
      releaseTokenSignoffInputReview: {
        schema: 'quantgod.release_token_signoff_input_review.v1',
        status: 'WAITING_SIGNOFF_INPUT',
        statusZh: '0/1 个 release token 签收输入完整；仍等待完整签收输入',
        releaseTokenCount: 1,
        completeSignoffCount: 0,
        canAcceptSignoffHere: false,
        canMintTokenHere: false,
        canReleaseExecutionNow: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
        reviewRows: [
          {
            gateId: 'broker_order_send_release',
            labelZh: 'Broker OrderSend',
            tokenName: 'QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1',
            blockerCode: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
            inputProvided: false,
            acknowledgementComplete: false,
            finalSignoffTextOk: false,
            completeForSeparateReleaseReview: false,
            canAcceptSignoffHere: false,
            canReleaseExecutionNow: false,
            statusZh: '签收输入不完整或签收文本未包含 tokenName 与 blockerCode',
          },
        ],
      },
      releaseTokenSignoffInputTemplate: {
        schema: 'quantgod.release_token_signoff_input_template.v1',
        status: 'READY_FOR_SIGNOFF_INPUT_FILL',
        statusZh: '1/1 个 release token 签收输入模板已生成；等待外部独立填写',
        releaseTokenCount: 1,
        readyForInputCount: 1,
        canAcceptSignoffHere: false,
        canMintTokenHere: false,
        canReleaseExecutionNow: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
        signoffInputTemplate: {
          releaseTokenSignoffs: [
            {
              gateId: 'broker_order_send_release',
              labelZh: 'Broker OrderSend',
              tokenName: 'QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1',
              blockerCode: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
              readyForSeparateSignoffReview: true,
              acknowledgeNoSideEffectEvidence: false,
              acknowledgeRiskLimits: false,
              acknowledgeExecutionModeSeparatelyReviewed: false,
              finalSignoffText: '',
              canAcceptSignoffHere: false,
              canReleaseExecutionNow: false,
            },
          ],
        },
      },
      laneSelector: {
        selectedLaneId: 'forexMt5',
        selectedLaneLabelZh: '外币 MT5 Live12',
        selectedLanePrimaryBlocker: {
          code: 'FOREX_NEWS_BLOCK_ACTIVE',
          reasonZh: 'USDJPY news pre-block: jolts-job-openings in 41m',
        },
      },
      profitTarget: {
        status: 'TARGET_REACHED',
        statusZh: '已达到合计 50 USD 目标',
        dualTargetReached: true,
        simToLiveDecision: {
          status: 'TARGET_REACHED_WAITING_EXECUTION_MODE_ACTIVATION',
          statusZh: '模拟收益目标 50 USD 已由任一 lane 或净合计达成，等待执行模式闸门',
          targetReached: true,
          dataPlaneReady: true,
          executionModeOnlyBlocked: true,
          allActivationGatesPassed: false,
          primaryActionableBlocker: {
            code: 'DEPLOYED_PRESET_READ_ONLY_TRUE',
            reasonZh: '当前部署 preset 仍为 ReadOnlyMode=true。',
          },
          activationGateChecklist: [
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
        laneTargets: {
          btcCryptoCfd: {
            labelZh: 'BTC / HFM crypto CFD 模拟',
            simulationVerifiedUsdProfit: 65.22,
            targetReached: true,
            targetUsd: 50,
            status: 'LANE_POSITIVE',
          },
        },
      },
    });

    expect(model.metrics.find((item) => item.label === '执行闸门')).toMatchObject({
      value: '1/1 个执行闸门未通过',
      hint: '当前主 blocker：Live16 启动 ini 的 [Experts] AllowLiveTrading=0；重新启动时仍会保持终端级 live trading 关闭。',
    });
    expect(model.metrics.find((item) => item.label === '择优车道')).toMatchObject({
      value: '外币 MT5 Live12',
      hint: '外币 MT5 Live12：USDJPY news pre-block: jolts-job-openings in 41m',
    });
    expect(model.metrics.find((item) => item.label === '合计 50 USD 目标')).toMatchObject({
      value: '已达标',
      hint: '收益已达标，但执行未释放：当前主 blocker：Live16 启动 ini 的 [Experts] AllowLiveTrading=0；重新启动时仍会保持终端级 live trading 关闭。',
    });
    expect(model.profitTargetItems.find((item) => item.label === '合计模拟目标')).toMatchObject({
      value: '已达成',
      hint: '收益已达标，但执行未释放：当前主 blocker：Live16 启动 ini 的 [Experts] AllowLiveTrading=0；重新启动时仍会保持终端级 live trading 关闭。',
    });
    expect(model.profitTargetItems.find((item) => item.label === 'Sim-to-live 决策')).toMatchObject({
      hint: '当前主 blocker：Live16 启动 ini 的 [Experts] AllowLiveTrading=0；重新启动时仍会保持终端级 live trading 关闭。',
    });
    expect(model.liveReadinessItems.find((item) => item.label === '执行闸门清单')).toMatchObject({
      hint: '当前主 blocker：Live16 启动 ini 的 [Experts] AllowLiveTrading=0；重新启动时仍会保持终端级 live trading 关闭。',
    });
    expect(model.liveReadinessItems.find((item) => item.label === '达标后执行摘要')).toMatchObject({
      value: '收益目标已达成，执行仍锁定：5 个 release token 未释放，4 个 MT5 执行模式闸门未通过',
      hint: '当前部署 preset 仍为 ReadOnlyMode=true。',
      status: 'blocked',
    });
    expect(model.liveReadinessItems.find((item) => item.label === '实盘释放计划')).toMatchObject({
      value: '收益已达标；最小 diff 审查包已生成，仍待 5 个 release token 和 4 个执行模式闸门',
      hint: '把本审查包作为单独 execution release 评审输入；通过前不得改 ini/preset、写 request 或调用 broker。',
      status: 'blocked',
    });
    expect(model.liveReadinessItems.find((item) => item.label === 'Release Token 证据')).toMatchObject({
      value: '无副作用证据已完成 1/1；release token 已提供 0/1，保持 review-only',
      hint: '无副作用证据 1/1 / Token 0/1 / 缺 1',
      status: 'blocked',
    });
    expect(model.liveReadinessItems.find((item) => item.label === 'Release Token 签收草案')).toMatchObject({
      value: '1/1 个 release token 已生成签收输入草案；当前 artifact 不签收、不铸造 token',
      hint: '签收草案 1/1 / 不能在此签收',
      status: 'blocked',
    });
    expect(model.liveReadinessItems.find((item) => item.label === 'Release Token 签收输入')).toMatchObject({
      value: '0/1 个 release token 签收输入完整；仍等待完整签收输入',
      hint: '签收输入 0/1 / 当前仍不放行',
      status: 'blocked',
    });
    expect(model.liveReadinessItems.find((item) => item.label === 'Execution release 审计')).toMatchObject({
      value: '收益已达标，但 5 个 release token 和 4 个 MT5 执行模式闸门仍未释放',
      hint: '当前部署 preset 仍为 ReadOnlyMode=true。',
      status: 'blocked',
    });
    expect(model.liveReadinessItems.find((item) => item.label === '授权边界')).toMatchObject({
      value: '聊天授权已记录，执行 release 未释放',
      hint: '聊天授权不能单独打开真实下单；仍需 release token 与 MT5 执行模式证据。',
      status: 'blocked',
    });
    expect(model.liveReadinessItems.find((item) => item.label === '审查账号')).toMatchObject({
      value: 'HFM Live16 crypto CFD (secondary)',
      status: 'ok',
    });
    expect(model.tables.releaseMinimalDiffChanges[0]).toMatchObject({
      文件: 'startupConfig',
      字段: 'Experts.AllowLiveTrading',
      当前: '0',
      目标: '1',
      可立即应用: '否',
      阻塞码: 'STARTUP_CONFIG_ALLOW_LIVE_TRADING_OFF',
    });
    expect(model.tables.releaseMinimalDiffTokens[0]).toMatchObject({
      ReleaseToken: 'QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1',
      环节: 'Broker OrderSend',
      已提供: '否',
      可自动生成: '否',
      阻塞码: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
    });
    expect(model.tables.releaseTokenEvidence[0]).toMatchObject({
      ReleaseToken: 'QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1',
      环节: 'Broker OrderSend',
      合同: 'brokerOrderSendReview',
      证据完成: '是',
      无副作用证据: '是',
      检查通过: '6/6',
      可释放: '否',
      签收评审: '无副作用证据已齐，可进入单独 release token 签收评审',
      阻塞码: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
    });
    expect(model.tables.releaseTokenSignoffDraftRows[0]).toMatchObject({
      ReleaseToken: 'QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1',
      可进入签收: '是',
      此处可签收: '否',
      可铸Token: '否',
      可释放: '否',
      阻塞码: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
    });
    expect(model.tables.releaseTokenSignoffInputTemplateRows[0]).toMatchObject({
      ReleaseToken: 'QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1',
      可填写: '是',
      Ack证据: '否',
      Ack风控: '否',
      Ack执行复核: '否',
      签收文本: '等待资料',
      此处可签收: '否',
      可释放: '否',
      阻塞码: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
    });
    expect(model.tables.releaseTokenSignoffInputRows[0]).toMatchObject({
      ReleaseToken: 'QG_REVIEWED_BROKER_ORDER_SEND_RELEASE_V1',
      输入已给: '否',
      Acknowledgement: '否',
      签收文本: '否',
      可进独立复核: '否',
      此处可签收: '否',
      可释放: '否',
      阻塞码: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
    });
  });

  it('hydrates current liveExecutionReview fields without falling back to waiting-data copy', () => {
    const model = buildHfmCryptoModel({
      status: {
        status: 'READY_FOR_SHADOW_RESEARCH',
        statusZh: 'HFM Crypto CFD 影子研究就绪',
        symbolEvidence: {
          found: true,
          canonicalSymbols: ['BTCUSD', 'ETHUSD'],
          brokerSymbols: ['#BTCUSD', '#ETHUSD'],
        },
        safety: {
          readOnly: true,
          shadowOnly: true,
          mt5OrderSendAllowed: false,
        },
      },
      liveReadiness: {
        status: 'READY_FOR_EXECUTION_REVIEW',
        statusZh: '可进入实盘执行审查',
        canPromoteToLiveNow: false,
        liveExecutionAllowed: false,
        orderSendAllowed: false,
        mt5OrderSendAllowed: false,
        executionReviewSummary: {
          status: 'REVIEW_READY_EXECUTION_DISABLED',
          statusZh: '可进入执行评审，但真实执行仍关闭',
          liveExecutionAllowed: false,
          orderSendAllowed: false,
          mt5OrderSendAllowed: false,
          canPromoteToLiveNow: false,
          reviewReadyLaneIds: ['hfmCryptoCfd'],
          simulationQualifiedLaneIds: ['hfmCryptoCfd'],
          primaryBlockerCodes: [
            'HFM_CRYPTO_EXECUTION_LANE_REVIEW_REQUIRED',
            'EXECUTION_LANE_NOT_ENABLED',
            'SEPARATE_REVIEW_REQUIRED',
          ],
          blockerCodesByLane: {
            usdjpyMt5: ['LIVE12_RUNTIME_REFRESH_BLOCKED'],
            hfmCryptoCfd: ['HFM_CRYPTO_EXECUTION_LANE_REVIEW_REQUIRED'],
            global: ['EXECUTION_LANE_NOT_ENABLED', 'SEPARATE_REVIEW_REQUIRED'],
          },
          nextRequiredActionZh: 'HFM/BTC 证据可进入单独 execution lane 评审；当前不写订单。',
        },
        lanes: {
          hfmCryptoCfd: {
            reviewCandidate: true,
            simulationQualified: true,
            accountNoCryptoSymbols: false,
            accountCryptoAvailability: {
              statusZh: 'HFM Crypto CFD 影子研究就绪',
            },
          },
        },
        runtimeScope: {
          scope: 'secondary',
          accountLabel: 'HFM Live16 crypto CFD',
        },
      },
      profitTarget: {
        status: 'TARGET_REACHED',
        statusZh: '已达到合计 50 USD 目标',
        targetReached: true,
        dualTargetReached: true,
        combinedTarget: {
          combinedVerifiedUsdProfit: 137.22,
          targetReached: true,
          statusZh: '任一 lane 或多 lane 净合计已达到 50 USD',
        },
        laneTargets: {
          forexMt5: {
            labelZh: '外币 MT5 模拟/纸盘',
            simulationVerifiedUsdProfit: 72,
            targetReached: true,
            combinedTargetUsd: 50,
            statusZh: '该 lane 已证明正收益',
            evidenceCount: 1,
          },
          btcCryptoCfd: {
            labelZh: 'BTC / HFM crypto CFD 模拟',
            simulationVerifiedUsdProfit: 65.22,
            targetReached: true,
            combinedTargetUsd: 50,
            statusZh: '该 lane 已证明正收益',
            evidenceCount: 1,
          },
        },
        liveCutoverGate: {
          status: 'READY_FOR_EXECUTION_REVIEW',
          statusZh: '任一 lane 或多 lane 净合计收益目标已达成，可进入单独 execution lane 评审',
          orderSendAllowed: false,
          cutoverReady: false,
          combinedTargetReached: true,
          reasonZh: '达到模拟收益目标只代表可进入实盘执行评审；本追踪器不写订单、不改预设。',
        },
        liveExecutionReview: {
          status: 'TARGET_REACHED_WAITING_EXECUTION_MODE_ACTIVATION',
          statusZh: '模拟收益目标 50 USD 已由任一 lane 或净合计达成，等待执行模式闸门',
          targetReached: true,
          dataPlaneCutoverReady: true,
          cutoverExecutionModeOnlyBlocked: true,
          orderSendAllowed: false,
          mt5OrderSendAllowed: false,
          writesMt5OrderRequest: false,
          brokerCallsMade: false,
          disabledFirstImplementationWorkReady: true,
          nextCodeWorkAllowedInReviewOnly: true,
          liveExecutionStillForbidden: true,
          primaryActionableBlocker: {
            code: 'DEPLOYED_PRESET_READ_ONLY_TRUE',
            reasonZh: '当前部署 preset 仍为 ReadOnlyMode=true。',
          },
          requiredLaneSummaries: [
            {
              laneId: 'forexMt5',
              simulationVerifiedUsdProfit: 72,
              targetReached: true,
              combinedTargetUsd: 50,
              status: 'LANE_POSITIVE',
              evidenceCount: 1,
            },
            {
              laneId: 'btcCryptoCfd',
              simulationVerifiedUsdProfit: 65.22,
              targetReached: true,
              combinedTargetUsd: 50,
              status: 'LANE_POSITIVE',
              evidenceCount: 1,
            },
          ],
          executionReleaseReadinessPacket: {
            safeAutomationCanContinue: true,
            activationGateSummary: {
              allPassed: false,
              failedGateFields: ['livePilotMode', 'readOnlyMode', 'executionEnabled', 'tradeAllowed'],
            },
          },
          dashboardSnapshot: {
            livePilotMode: false,
            readOnlyMode: true,
            executionEnabled: false,
            tradeAllowed: false,
            executionGateDiagnostics: {
              livePilotMode: {
                rawValue: false,
                detailZh: 'EA runtime 仍未确认 livePilotMode=true。',
              },
              readOnlyMode: {
                rawValue: true,
                detailZh: 'EA runtime readOnlyMode 仍为 true。',
              },
              executionEnabled: {
                rawValue: false,
                detailZh: 'EA runtime executionEnabled=false。',
              },
              tradeAllowed: {
                rawValue: false,
                detailZh: '当前 composite tradeAllowed=false 的直接阻塞为 READ_ONLY_MODE。',
              },
            },
          },
          blockers: [
            {
              code: 'MT5_LIVE_PILOT_MODE_NOT_CONFIRMED',
              reasonZh: 'MT5 dashboard 尚未证明 livePilotMode=true。',
            },
            {
              code: 'MT5_READ_ONLY_MODE_STILL_ACTIVE',
              reasonZh: 'MT5 dashboard 仍处于 readOnly/shadow 模式，不能进入 live pilot 预检通过态。',
            },
            {
              code: 'MT5_EXECUTION_NOT_ENABLED_FOR_PILOT',
              reasonZh: 'MT5 dashboard 尚未证明 live pilot 执行环境已显式启用。',
            },
            {
              code: 'MT5_TRADE_ALLOWED_NOT_CONFIRMED',
              reasonZh: 'MT5 dashboard 尚未证明账户、终端、EA 和 symbol 交易权限均允许。',
            },
          ],
          nextRequiredActionZh: '模拟收益目标和 HFM/BTC 数据面已达成；审批证据已验收，不再等待用户确认。',
        },
      },
    });

    expect(model.metrics.find((item) => item.label === '合计 50 USD 目标')).toMatchObject({
      value: '已达标',
      hint: '收益已达标，但执行未释放：当前主 blocker：当前部署 preset 仍为 ReadOnlyMode=true。',
    });
    expect(model.metrics.find((item) => item.label === '执行闸门')).toMatchObject({
      value: '4/4 个执行闸门未通过',
      hint: '当前主 blocker：当前部署 preset 仍为 ReadOnlyMode=true。',
    });
    expect(model.metrics.find((item) => item.label === '真实执行')).toMatchObject({
      value: '未开放',
      hint: '可进入执行评审，但真实执行仍关闭',
    });
    expect(model.liveReadinessItems.find((item) => item.label === '执行评审摘要')).toMatchObject({
      value: '可进入执行评审，但真实执行仍关闭',
      hint: 'HFM/BTC 证据可进入单独 execution lane 评审；当前不写订单。',
      status: 'warn',
    });
    expect(model.liveReadinessItems.find((item) => item.label === '可直接实盘')).toMatchObject({
      value: '否',
      hint: '可进入执行评审，但真实执行仍关闭',
      status: 'blocked',
    });
    expect(model.liveReadinessItems.find((item) => item.label === 'HFM Crypto')).toMatchObject({
      value: '可评审，不能下单',
      hint: 'HFM_CRYPTO_EXECUTION_LANE_REVIEW_REQUIRED',
      status: 'warn',
    });
    expect(model.profitTargetItems.find((item) => item.label === '数据面')).toMatchObject({
      value: '是',
      status: 'ok',
    });
    expect(model.profitTargetItems.find((item) => item.label === 'Sim-to-live 决策')).toMatchObject({
      value: '模拟收益目标 50 USD 已由任一 lane 或净合计达成，等待执行模式闸门',
      hint: '当前主 blocker：当前部署 preset 仍为 ReadOnlyMode=true。',
    });
    expect(model.tables.profitTargetLanes).toEqual([
      expect.objectContaining({ Lane: 'forexMt5', 盈利USD: '72.00', 达标: '是' }),
      expect.objectContaining({ Lane: 'btcCryptoCfd', 盈利USD: '65.22', 达标: '是' }),
    ]);
    expect(model.tables.executionReviewSummaryBlockers).toEqual([
      expect.objectContaining({ Lane: 'usdjpyMt5', 阻塞码: 'LIVE12_RUNTIME_REFRESH_BLOCKED' }),
      expect.objectContaining({ Lane: 'hfmCryptoCfd', 阻塞码: 'HFM_CRYPTO_EXECUTION_LANE_REVIEW_REQUIRED' }),
      expect.objectContaining({ Lane: 'global', 阻塞码: 'EXECUTION_LANE_NOT_ENABLED' }),
      expect.objectContaining({ Lane: 'global', 阻塞码: 'SEPARATE_REVIEW_REQUIRED' }),
    ]);
  });

  it('surfaces the exact sim-to-live pipeline stage blocker', () => {
    const model = buildHfmCryptoModel({
      simToLivePipeline: {
        status: 'WAITING_SIM_TO_LIVE_PIPELINE_INPUTS',
        statusZh: '等待模拟转实盘流水线证据',
        autoStage: 'operator_approval',
        orderSendAllowed: false,
        readyForSeparateExecutionAdapterReview: false,
        blockers: [
          {
            code: 'PIPELINE_STAGE_NOT_PASSED',
            reasonZh: 'sim-to-live 流水线停在当前未通过阶段。',
            value: 'operator_approval',
          },
          {
            code: 'OPERATOR_APPROVAL_EVIDENCE_NOT_ACCEPTED',
            reasonZh: '人工审批证据尚未通过。',
          },
        ],
        stages: [
          {
            stageId: 'readiness',
            nameZh: '模拟/执行反馈准入',
            status: 'READY_FOR_EXECUTION_REVIEW',
            statusZh: '可进入实盘执行审查',
            passed: true,
            blockerCodes: [],
          },
          {
            stageId: 'operator_approval',
            nameZh: '人工审批证据',
            status: 'WAITING_OPERATOR_APPROVAL_EVIDENCE',
            statusZh: '等待有效人工审批证据',
            passed: false,
            blockerCodes: ['OPERATOR_APPROVAL_JSON_MISSING'],
            nextRequiredActionZh: '按 approval draft 填写本地 JSON，并确保 reviewPacketHash 与当前审查包一致。',
          },
        ],
      },
    });

    expect(model.metrics.find((item) => item.label === '自动化流水线')).toMatchObject({
      value: '等待模拟转实盘流水线证据',
      hint: '停在 operator_approval：OPERATOR_APPROVAL_JSON_MISSING',
    });
    expect(model.liveReadinessItems.find((item) => item.label === '流水线阶段')).toMatchObject({
      value: 'operator_approval',
      hint: '停在 operator_approval：OPERATOR_APPROVAL_JSON_MISSING',
      status: 'blocked',
    });
    expect(model.tables.simToLivePipelineBlockerRows).toEqual([
      expect.objectContaining({
        阶段: '模拟/执行反馈准入',
        Stage: 'readiness',
        通过: '是',
        阻塞: '否',
      }),
      expect.objectContaining({
        阶段: '人工审批证据',
        Stage: 'operator_approval',
        状态: '等待有效人工审批证据',
        通过: '否',
        阻塞: '是',
        阻塞码: 'OPERATOR_APPROVAL_JSON_MISSING',
        下一步: '按 approval draft 填写本地 JSON，并确保 reviewPacketHash 与当前审查包一致。',
      }),
    ]);
  });

  it('uses the review-only preset diff package when it is available', () => {
    const model = buildHfmCryptoModel({
      livePilotActivationReview: {
        presetActivationPackage: {
          reviewedPresetChangePlan: [
            {
              lane: 'legacy',
              route: 'LEGACY',
              changes: [{ key: 'ReadOnlyMode', from: 'true', to: 'false' }],
            },
          ],
          reviewOnlyPresetDiffPackage: {
            mode: 'REVIEW_ONLY_PRESET_DIFF_PACKAGE_NO_FILE_WRITE',
            laneDiffs: [
              {
                lane: 'btcCryptoCfd',
                canAttachNow: false,
                preferredFirstLivePilot: 'BTC has profit evidence, but needs broker-send lane review before attach',
                changes: [
                  {
                    key: 'ReadOnlyMode',
                    current: 'true',
                    candidate: 'false after broker-send review',
                    reasonZh: 'BTC/HFM crypto 必须等 broker send 全部审查后才可解除。',
                  },
                ],
              },
            ],
          },
        },
      },
    });

    expect(model.tables.livePilotPresetActivationRows).toEqual([
      expect.objectContaining({
        Lane: 'btcCryptoCfd',
        Key: 'ReadOnlyMode',
        From: 'true',
        To: 'false after broker-send review',
        可执行: '否',
      }),
    ]);
  });

  it('surfaces the live pilot gate transition plan as review-only steps', () => {
    const model = buildHfmCryptoModel({
      liveExecutionImplementationSpec: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        executionActivationGapAudit: {
          livePilotGateTransitionPlan: {
            status: 'WAITING_EXECUTION_MODE_ACTIVATION',
            canBeAppliedByThisArtifact: false,
            orderSendAllowed: false,
            transitionSteps: [
              {
                stepId: 'operator_approval_bound',
                labelZh: '用户授权绑定到当前 review packet',
                status: 'DONE_IN_REVIEW_EVIDENCE',
                requiredBeforeLive: true,
                canBeAppliedByThisArtifact: false,
                evidenceRequired: ['approval evidence accepted'],
                forbiddenHere: ['unlock orderSendAllowed'],
              },
              {
                stepId: 'manual_mt5_attach_and_runtime_proof',
                labelZh: 'MT5 手动挂载后重新证明四个执行闸门',
                status: 'WAITING_RUNTIME_PROOF',
                requiredBeforeLive: true,
                canBeAppliedByThisArtifact: false,
                evidenceRequired: ['livePilotMode=true', 'readOnlyMode=false'],
                forbiddenHere: ['infer runtime proof from account permission only'],
              },
            ],
          },
        },
      },
    });

    expect(model.tables.livePilotGateTransitionRows).toEqual([
      expect.objectContaining({
        步骤: '用户授权绑定到当前 review packet',
        状态: 'DONE_IN_REVIEW_EVIDENCE',
        必需: '是',
        可由本页执行: '否',
        证据: 'approval evidence accepted',
        禁止: 'unlock orderSendAllowed',
      }),
      expect.objectContaining({
        步骤: 'MT5 手动挂载后重新证明四个执行闸门',
        状态: 'WAITING_RUNTIME_PROOF',
        必需: '是',
        可由本页执行: '否',
        证据: 'livePilotMode=true / readOnlyMode=false',
      }),
    ]);
  });

  it('surfaces adapter writer release-token gate before any MT5 request write', () => {
    const model = buildHfmCryptoModel({
      liveExecutionAdapterWriteReview: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        dataPlaneAdapterWriteReady: true,
        executionModeOnlyBlocked: true,
        requestWritesAllowed: false,
        requestFilesWritten: false,
        disabledWriterImplementationContract: {
          releaseGate: {
            tokenRequired: true,
            tokenProvidedInThisArtifact: false,
            blockerCode: 'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
          },
        },
        writerRuntimePreflight: {
          releaseTokenRequired: true,
          releaseTokenProvided: false,
          releaseTokenBlockerCode: 'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
        },
        writePlans: [
          {
            requestId: 'sandbox-review-btc-001',
            brokerSymbol: '#BTCUSD',
            atomicWriteRequired: true,
            wouldWriteToMt5RequestDirectory: false,
            serializedPayloadHash: 'hash-001',
          },
        ],
      },
    });

    expect(model.tables.liveExecutionAdapterWriteRows).toEqual([
      expect.objectContaining({
        Request: 'sandbox-review-btc-001',
        写MT5: '否',
        ReleaseToken: '否',
        Release阻断: 'REQUEST_WRITE_RELEASE_TOKEN_MISSING',
      }),
    ]);
  });

  it('surfaces EA request reader release-token gate before file consumption', () => {
    const model = buildHfmCryptoModel({
      eaRequestConsumptionReview: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        dataPlaneEaRequestConsumptionReady: true,
        executionModeOnlyBlocked: true,
        releaseTokenRequired: true,
        releaseTokenProvided: false,
        releaseTokenBlockerCode: 'REQUEST_READER_RELEASE_TOKEN_MISSING',
        readerReleaseGate: {
          tokenRequired: true,
          tokenProvided: false,
          blockerCode: 'REQUEST_READER_RELEASE_TOKEN_MISSING',
        },
        consumptionPlans: [
          {
            requestId: 'sandbox-review-btc-001',
            requestDirectory: 'runtime/agent/mt5_order_requests',
            receiptDirectory: 'runtime/agent/mt5_order_receipts',
            defaultAction: 'REJECT_REVIEW_ONLY',
            wouldReadRequestFile: false,
            wouldWriteReceiptFile: false,
          },
        ],
      },
    });

    expect(model.tables.eaRequestConsumptionRows).toEqual([
      expect.objectContaining({
        Request: 'sandbox-review-btc-001',
        读Request: '否',
        写Receipt: '否',
        ReleaseToken: '否',
        Release阻断: 'REQUEST_READER_RELEASE_TOKEN_MISSING',
      }),
    ]);
  });

  it('surfaces broker OrderSend release-token gate before broker calls', () => {
    const model = buildHfmCryptoModel({
      brokerOrderSendReview: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        dataPlaneBrokerOrderSendReady: true,
        executionModeOnlyBlocked: true,
        releaseTokenRequired: true,
        releaseTokenProvided: false,
        releaseTokenBlockerCode: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
        brokerReleaseGate: {
          tokenRequired: true,
          tokenProvided: false,
          blockerCode: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
        },
        brokerSendPlans: [
          {
            requestId: 'sandbox-review-btc-001',
            brokerSymbol: '#BTCUSD',
            side: 'BUY',
            volumeLots: 0.01,
            requestFusesOk: true,
            wouldCallBroker: false,
            brokerCallsMade: false,
            releaseTokenRequired: true,
            releaseTokenProvided: false,
            releaseTokenBlockerCode: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
          },
        ],
      },
    });

    expect(model.tables.brokerOrderSendRows).toEqual([
      expect.objectContaining({
        Request: 'sandbox-review-btc-001',
        Broker调用: '否',
        ReleaseToken: '否',
        Release阻断: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
      }),
    ]);
  });

  it('surfaces receipt writer release-token gate before receipt writes', () => {
    const model = buildHfmCryptoModel({
      receiptReconciliationReview: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        dataPlaneReconciliationReady: true,
        executionModeOnlyBlocked: true,
        releaseTokenRequired: true,
        releaseTokenProvided: false,
        releaseTokenBlockerCode: 'RECEIPT_WRITER_RELEASE_TOKEN_MISSING',
        receiptReleaseGate: {
          tokenRequired: true,
          tokenProvided: false,
          blockerCode: 'RECEIPT_WRITER_RELEASE_TOKEN_MISSING',
        },
        reconciliationResults: [
          {
            requestId: 'sandbox-review-btc-001',
            brokerSymbol: '#BTCUSD',
            receiptFound: true,
            passed: true,
            receiptRejectedReasonCode: 'REQUEST_READER_RELEASE_TOKEN_MISSING',
          },
        ],
      },
    });

    expect(model.tables.receiptReconciliationRows).toEqual([
      expect.objectContaining({
        Request: 'sandbox-review-btc-001',
        Receipt: '已匹配',
        ReleaseToken: '否',
        Release阻断: 'RECEIPT_WRITER_RELEASE_TOKEN_MISSING',
      }),
    ]);
  });

  it('surfaces orchestrator release-token summary across execution side-effect gates', () => {
    const model = buildHfmCryptoModel({
      simToLiveOrchestrator: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        currentLiveExecutionStageZh: 'receipt 对账评审',
        allExecutionReleaseTokensProvided: false,
        executionReleaseGateSummary: {
          total: 5,
          released: 0,
          blocked: 5,
          allReleased: false,
          statusZh: '5 个执行 release token 未释放',
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
            gateId: 'broker_order_send_release',
            labelZh: 'Broker OrderSend',
            sourceArtifact: 'brokerOrderSendReview',
            sideEffectZh: '调用 MT5 OrderSend',
            dataPlaneReady: true,
            tokenRequired: true,
            tokenProvided: false,
            blockerCode: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
          },
        ],
      },
    });

    expect(model.liveReadinessItems.find((item) => item.label === 'Release Tokens')).toMatchObject({
      value: '5 个执行 release token 未释放',
      status: 'blocked',
    });
    expect(model.tables.executionReleaseGateRows).toEqual([
      expect.objectContaining({
        闸门: 'Broker OrderSend',
        副作用: '调用 MT5 OrderSend',
        数据面: '是',
        ReleaseToken: '否',
        阻断: 'BROKER_ORDER_SEND_RELEASE_TOKEN_MISSING',
      }),
    ]);
  });

  it('surfaces execution safety traceability rows without enabling broker side effects', () => {
    const model = buildHfmCryptoModel({
      status: {
        ok: true,
        status: 'READY_FOR_SHADOW_RESEARCH',
        statusZh: 'HFM Crypto CFD 影子研究就绪',
      },
      liveExecutionImplementationSpec: {
        status: 'WAITING_EXECUTION_MODE_ACTIVATION',
        statusZh: 'live execution implementation spec 数据面已通过，等待执行模式闸门',
        dataPlaneImplementationSpecReady: true,
        executionModeOnlyBlocked: true,
        disabledFirstImplementationWorkReady: true,
        nextCodeWorkAllowedInReviewOnly: true,
        liveExecutionStillForbidden: true,
        implementationReadinessSummary: {
          status: 'READY_TO_IMPLEMENT_DISABLED_FIRST',
          statusZh: '可继续 disabled-first 实现，但真实订单仍禁止',
          allowedWorkType: 'CODE_AND_REVIEW_ARTIFACTS_ONLY',
          forbiddenWorkType: 'LIVE_ORDER_EXECUTION',
          nextRequiredActionZh: '继续实现 request writer/EA reader/broker wrapper 的禁用态代码和审查 artifact。',
        },
        executionSafetyTraceabilityMatrix: [
          {
            stepId: 'broker_order_send_path',
            gateId: 'broker_send_wrapper',
            labelZh: 'OrderSend 最小封装只能从已验收 EA request reader 进入',
            reviewOnlyStatus: 'PENDING_SEPARATE_PR_REVIEW',
            requiredBeforeLive: true,
            currentArtifactAllowedToApply: false,
            orderSendAllowed: false,
            mt5OrderSendAllowed: false,
            writesMt5OrderRequest: false,
            requestFilesWritten: false,
            receiptFilesWritten: false,
            brokerCallsMade: false,
            blockingIfMissing: 'BROKER_ORDER_SEND_PATH_NOT_REVIEWED',
          },
          {
            stepId: 'receipt_writer_and_reconciliation_path',
            labelZh: '每个 request 必须有 receipt 并可对账',
            reviewOnlyStatus: 'PENDING_SEPARATE_PR_REVIEW',
            requiredBeforeLive: true,
            currentArtifactAllowedToApply: false,
            orderSendAllowed: false,
            brokerCallsMade: false,
            blockingIfMissing: 'RECEIPT_RECONCILIATION_PATH_NOT_REVIEWED',
          },
          {
            stepId: 'rollback_and_auto_disable_path',
            labelZh: '异常 receipt 必须触发暂停/回滚审查',
            reviewOnlyStatus: 'PENDING_SEPARATE_PR_REVIEW',
            requiredBeforeLive: true,
            currentArtifactAllowedToApply: false,
            orderSendAllowed: false,
            brokerCallsMade: false,
            blockingIfMissing: 'ROLLBACK_AUTO_DISABLE_PATH_NOT_REVIEWED',
          },
        ],
      },
    });

    const implementationMetric = model.metrics.find((item) => item.label === 'Live实现规格');
    const implementationWorkMetric = model.metrics.find((item) => item.label === '实现工作包');

    expect(implementationMetric.hint).toContain('3 个执行安全缺口');
    expect(implementationWorkMetric).toMatchObject({
      value: '可继续 disabled-first 实现',
      hint: '继续实现 request writer/EA reader/broker wrapper 的禁用态代码和审查 artifact。',
    });
    expect(model.tables.liveExecutionSafetyTraceabilityRows).toEqual([
      expect.objectContaining({
        步骤: 'broker_order_send_path',
        状态: 'PENDING_SEPARATE_PR_REVIEW',
        必需: '是',
        可执行: '否',
        下单: '否',
        写Request: '否',
        Broker调用: '否',
        缺口: 'BROKER_ORDER_SEND_PATH_NOT_REVIEWED',
      }),
      expect.objectContaining({
        步骤: 'receipt_writer_and_reconciliation_path',
        下单: '否',
        Broker调用: '否',
      }),
      expect.objectContaining({
        步骤: 'rollback_and_auto_disable_path',
        缺口: 'ROLLBACK_AUTO_DISABLE_PATH_NOT_REVIEWED',
      }),
    ]);
  });

  it('uses Live16 specs evidence instead of showing missing-evidence or EA-missing placeholders', () => {
    const model = buildHfmCryptoModel({
      mt5Snapshot: {
        ok: true,
        status: 'READY',
        snapshotFresh: true,
        account: {
          login: 900016,
          server: 'HFMarketsGlobal-Live16',
          currency: 'USD',
          tradeAllowed: true,
          tradeExpert: true,
        },
        runtime: {
          terminalConnected: true,
          accountAuthorized: true,
          tickAgeSeconds: 4,
        },
        market: {
          symbol: '#BTCUSD',
        },
      },
      status: {
        ok: true,
        status: 'READY_FOR_SHADOW_RESEARCH',
        statusZh: 'HFM Crypto CFD 影子研究就绪',
        sourceFiles: {
          contractSpecExport: '/live16/MQL5/Files/hfm_crypto/QuantGod_HFMCryptoContractSpecExport.json',
        },
        targetSymbols: ['BTCUSD', 'ETHUSD'],
        symbolEvidence: {
          found: true,
          contractSpecExportReady: true,
          executionSpecReady: true,
          canonicalSymbols: ['BTCUSD', 'ETHUSD'],
          brokerSymbols: ['#BTCUSD', '#ETHUSD'],
          brokerSymbolDiagnostics: {
            brokerSymbolTotalAll: 346,
            brokerSymbolTotalMarketWatch: 10,
            brokerCryptoLikeCountAll: 39,
            brokerCryptoLikeCountMarketWatch: 0,
          },
        },
        mossBacktestProfile: {
          profileFound: false,
        },
      },
      executionSpec: {
        ok: true,
        readyForExecutionSpecReview: true,
        validRowCount: 35,
      },
      mt5ExporterReview: {
        ok: true,
        status: 'HFM_CRYPTO_MT5_EXPORT_AVAILABLE',
        statusZh: 'HFM crypto MT5 规格导出已可用',
        exporterReadyForEvidenceIntake: true,
        blockers: [],
        warnings: [
          {
            code: 'INSTALLED_MT5_EA_EXPORTER_MISSING',
            reasonZh: '当前 MT5 安装目录里的 EA 源码还没有 hfmCryptoSymbolSpecs exporter；已由独立只读 exporter/specs 输出接管证据。',
          },
        ],
      },
      standaloneExporterBundle: {
        ok: true,
        status: 'STANDALONE_MT5_SPEC_EXPORT_OUTPUT_DETECTED',
        statusZh: '已检测到独立只读 crypto specs 输出，等待刷新规格审查',
        standaloneExporterReady: true,
        targetInstalledAndCompiled: true,
        targetExpertInstalledAndCompiled: true,
        output: {
          expectedSpecsExists: true,
          expectedSpecsRowCount: 39,
          expectedSpecsPath: '/live16/MQL5/Files/hfm_crypto/QuantGod_HFMCryptoSymbolSpecs.json',
        },
        blockers: [],
      },
      liveReadiness: {
        ok: true,
        status: 'READY_FOR_EXECUTION_REVIEW',
        statusZh: '证据链可进入执行评审',
        lanes: {
          hfmCryptoCfd: {
            accountNoCryptoSymbols: false,
            reviewCandidate: true,
            accountCryptoAvailability: {
              status: 'PASS',
              statusZh: 'HFM crypto CFD symbol 已发现',
            },
          },
        },
      },
    });

    const visibleText = JSON.stringify({
      metrics: model.metrics,
      readinessItems: model.readinessItems,
      accountItems: model.accountItems,
      liveReadinessItems: model.liveReadinessItems,
      mossItems: model.mossItems,
    });
    expect(visibleText).not.toContain('未提供证据');
    expect(visibleText).not.toContain('安装目录 EA 缺少');
    expect(visibleText).not.toContain('缺少 crypto exporter');
    expect(visibleText).not.toContain('等待资料');
    expect(model.metrics.find((item) => item.label === 'Crypto 接入卡点')).toMatchObject({
      value: 'Live16 specs 证据已生成',
    });
    expect(model.accountItems.find((item) => item.label === 'Crypto exporter')).toMatchObject({
      value: '规格证据已接通',
      status: 'ok',
    });
    expect(model.readinessItems.find((item) => item.label === 'MT5 EA导出器')).toMatchObject({
      value: '规格证据可用',
      status: 'ok',
    });
    expect(model.mossItems).toEqual([
      expect.objectContaining({
        label: '资料状态',
        value: '未导入 Moss/backtest profile',
      }),
    ]);
  });
});
