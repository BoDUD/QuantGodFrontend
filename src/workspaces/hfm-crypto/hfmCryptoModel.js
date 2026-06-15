import { formatDisplayValue, humanizeStatus } from '../../utils/displayText.js';

const WAITING = '等待资料';

export const HFM_CRYPTO_SAFETY_DEFAULTS = Object.freeze({
  readOnly: true,
  shadowOnly: true,
  orderSendAllowed: false,
  closeAllowed: false,
  cancelAllowed: false,
  mt5OrderSendAllowed: false,
  walletAuthorizationAllowed: false,
  copyTradeExecutionAllowed: false,
  mossExecutionAllowed: false,
  livePresetMutationAllowed: false,
  livePilotActivationAllowed: false,
  receiptWritesAllowed: false,
  receiptFilesWritten: false,
  autoDisableMutationAllowed: false,
  eaRequestReaderAllowed: false,
  eaRequestReaderEnabled: false,
  eaRequestFilesRead: false,
  eaRequestFilesConsumed: false,
  eaOrderSendAllowed: false,
  liveExecutionCutoverAllowed: false,
  externalMarketRemoved: true,
});

const LIVE_IMPLEMENTATION_STEP_IDS = Object.freeze([
  'live_execution_adapter_write_path',
  'ea_request_reader_consumption_path',
  'broker_order_send_path',
  'receipt_writer_and_reconciliation_path',
  'rollback_and_auto_disable_path',
]);

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (Array.isArray(value?.items)) return value.items.filter(Boolean);
  if (Array.isArray(value?.rows)) return value.rows.filter(Boolean);
  return [];
}

function firstPayload(state = {}) {
  return state.status || state.symbols || state.build || {};
}

function mt5SnapshotPayload(state = {}) {
  return state.mt5Snapshot || {};
}

function mt5SnapshotFreshness(payload = {}) {
  if (!isObject(payload)) return {};
  if (isObject(payload._freshness) && Object.keys(payload._freshness).length) {
    const stale =
      payload._freshness.stale === true ||
      String(payload._freshness.status || '').toUpperCase() === 'STALE_EA_SNAPSHOT';
    const fresh = payload._freshness.fresh === true;
    return {
      ...payload._freshness,
      sourceFile: payload._freshness.sourceFile || payload.source?.file || '',
      mtimeIso: payload._freshness.mtimeIso || payload.source?.mtimeIso || '',
      statusZh:
        payload._freshness.statusZh ||
        (stale ? 'MT5 dashboard 快照已过期' : fresh ? 'MT5 dashboard 新鲜' : ''),
      nextActionZh:
        payload._freshness.nextActionZh ||
        (stale
          ? '恢复 Live16 MT5/EA 进程并刷新 QuantGod_Dashboard.json；不要把旧快照当成当前实盘状态。'
          : ''),
    };
  }
  const source = isObject(payload.source) ? payload.source : {};
  const hasFreshnessEvidence =
    payload.snapshotFresh !== undefined ||
    source.fresh !== undefined ||
    source.ageSeconds !== undefined ||
    String(payload.status || '').toUpperCase() === 'STALE_EA_SNAPSHOT';
  if (!hasFreshnessEvidence) return {};
  const fresh = payload.snapshotFresh === true || source.fresh === true;
  const stale =
    payload.snapshotFresh === false ||
    source.fresh === false ||
    String(payload.status || '').toUpperCase() === 'STALE_EA_SNAPSHOT';
  return {
    status: stale ? 'STALE_EA_SNAPSHOT' : fresh ? 'FRESH_EA_SNAPSHOT' : 'WAITING_EA_SNAPSHOT_FRESHNESS',
    statusZh: stale
      ? 'MT5 dashboard 快照已过期'
      : fresh
        ? 'MT5 dashboard 新鲜'
        : 'MT5 dashboard 新鲜度待确认',
    fresh,
    stale,
    ageSeconds: source.ageSeconds,
    maxAgeSeconds: source.maxAgeSeconds,
    sourceFile: source.file || '',
    mtimeIso: source.mtimeIso || '',
    nextActionZh: stale
      ? '恢复 Live16 MT5/EA 进程并刷新 QuantGod_Dashboard.json；不要把旧快照当成当前实盘状态。'
      : '',
  };
}

function formatAgeSeconds(value) {
  const ageSeconds = Number(value);
  if (!Number.isFinite(ageSeconds)) return WAITING;
  if (ageSeconds < 60) return `${Math.round(ageSeconds)} 秒`;
  if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)} 分钟`;
  if (ageSeconds < 86400) return `${(ageSeconds / 3600).toFixed(1)} 小时`;
  return `${(ageSeconds / 86400).toFixed(1)} 天`;
}

function mt5FreshnessLine(freshness = {}) {
  if (!isObject(freshness) || !Object.keys(freshness).length) return WAITING;
  if (freshness.statusZh) return freshness.statusZh;
  if (freshness.nextActionZh || freshness.nextAction) return freshness.nextActionZh || freshness.nextAction;
  const ageSeconds = Number(freshness.ageSeconds);
  const ageText = Number.isFinite(ageSeconds) ? `${Math.round(ageSeconds)}s` : WAITING;
  if (freshness.stale) return `MT5 dashboard 快照已过期 ${ageText}`;
  if (freshness.fresh) return 'MT5 dashboard 新鲜';
  return 'MT5 dashboard 新鲜度待确认';
}

function mt5FreshnessRows(freshness = {}, payload = {}) {
  const stale = freshness.stale === true || freshness.status === 'STALE_EA_SNAPSHOT';
  const fresh = freshness.fresh === true;
  return [
    {
      来源: 'Live16 MT5 dashboard',
      端点: '/api/mt5-readonly-secondary/snapshot',
      状态: stale ? '快照过期' : fresh ? '新鲜' : '待确认',
      年龄: formatAgeSeconds(freshness.ageSeconds),
      阈值: formatAgeSeconds(freshness.maxAgeSeconds),
      源文件: freshness.sourceFile || payload.source?.file || WAITING,
      动作:
        freshness.nextActionZh ||
        freshness.nextAction ||
        (stale
          ? '恢复 Live16 MT5/EA dashboard writer，再判断 HFM Crypto 当前账号与 BTC/crypto 执行准备度。'
          : fresh
            ? 'Live16 EA 快照新鲜，可继续 shadow-only 研究验证。'
            : '等待只读桥返回新鲜度证据。'),
    },
  ];
}

function statusTone(status) {
  const text = String(status || '').toUpperCase();
  if (text.includes('READY')) return 'ok';
  if (text.includes('WAITING')) return 'warn';
  if (text.includes('BLOCK') || text.includes('FAIL')) return 'blocked';
  return 'warn';
}

function checklistTone(row = {}) {
  const text = String(row.status || '').toUpperCase();
  if (row.passed || text.includes('PASS') || text.includes('READY')) return 'ok';
  if (row.blocking || text.includes('BLOCK') || text.includes('LOCK') || text.includes('FAIL'))
    return 'blocked';
  return 'warn';
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return formatDisplayValue(value || WAITING);
  return `${numeric.toFixed(1)}%`;
}

function boolText(value) {
  return value ? '是' : '否';
}

function compactList(values, fallback = WAITING) {
  const rows = toArray(values);
  if (!rows.length) return fallback;
  return rows
    .slice(0, 6)
    .map((item) => formatDisplayValue(item))
    .join(' / ');
}

function compactCodeList(values, fallback = WAITING) {
  const rows = toArray(values);
  if (!rows.length) return fallback;
  return rows
    .slice(0, 6)
    .map((item) => String(item))
    .join(' / ');
}

function safetyValue(safety, key) {
  return safety?.[key] ?? HFM_CRYPTO_SAFETY_DEFAULTS[key];
}

function endpointStatus(payload) {
  if (!isObject(payload) || !Object.keys(payload).length) return 'unknown';
  return payload.ok === false ? 'blocked' : 'ok';
}

function endpointLoaded(payload) {
  return isObject(payload) && Object.keys(payload).length > 0 && !payload.endpointLoadFailed;
}

function sourceFileHint(payload, key, fallback = WAITING) {
  return payload?.sourceFiles?.[key] || fallback;
}

function visibleKeyValueRow(row = {}) {
  return row.value !== WAITING;
}

function findingRows(payload) {
  return toArray(payload?.localEvidence?.findings).map((row) => ({
    服务器: row.server || WAITING,
    类型: row.kind || WAITING,
    Symbol: row.symbol || WAITING,
    标准名: row.canonicalSymbol || WAITING,
    文件数: row.fileCountCapped ?? 0,
    路径: row.path || WAITING,
  }));
}

function symbolEvidenceRows(payload) {
  return toArray(payload?.symbolEvidence?.sources).map((row) => ({
    来源: row.sourceZh || row.sourceId || WAITING,
    通过: boolText(row.passed),
    标准名: compactList(row.canonicalSymbols),
    Broker名: compactList(row.brokerSymbols),
  }));
}

function candidateRows(payload) {
  return toArray(payload?.brokerSymbolCandidates).map((row) => ({
    标准名: row.canonicalSymbol || WAITING,
    HFM候选名: row.brokerSymbol || WAITING,
    资产: row.assetClass || 'Crypto CFD',
    最小手数: row.minLot ?? row.lotSize?.minLot ?? WAITING,
    步长: row.lotStep ?? row.lotSize?.lotStep ?? WAITING,
    来源: row.source || WAITING,
  }));
}

function blockerRows(payload) {
  return toArray(payload?.blockers).map((row) => ({
    代码: row.code || WAITING,
    原因: row.reasonZh || row.reason || WAITING,
  }));
}

function operatorChecklistRows(payload) {
  return toArray(payload?.operatorChecklist).map((row) => ({
    项目: row.labelZh || row.id || WAITING,
    状态: row.statusZh || row.status || WAITING,
    必做: boolText(row.required),
    人工: boolText(row.automated === false),
    下一步: row.nextActionZh || row.reasonZh || WAITING,
  }));
}

function brokerSymbolDiagnostics(payload) {
  const diagnostics =
    payload?.symbolEvidence?.brokerSymbolDiagnostics || payload?.brokerSymbolDiagnostics || {};
  return isObject(diagnostics) ? diagnostics : {};
}

function hasNumericValue(value) {
  return Number.isFinite(Number(value));
}

function formatCount(value) {
  return hasNumericValue(value) ? Number(value) : WAITING;
}

function evidenceSymbolCount(payload = {}) {
  const evidence = payload.symbolEvidence || {};
  return Math.max(
    toArray(evidence.canonicalSymbols).length,
    toArray(evidence.brokerSymbols).length,
    toArray(payload.brokerSymbolCandidates).length,
    toArray(payload.localEvidence?.findings).length,
  );
}

function brokerSymbolSampleRows(payload) {
  const diagnostics = brokerSymbolDiagnostics(payload);
  return toArray(diagnostics.brokerSymbolSamples).map((row) => ({
    Broker名: row.brokerSymbol || WAITING,
    标准名: row.canonicalSymbol || WAITING,
    路径: row.path || WAITING,
    描述: row.description || WAITING,
    可见: boolText(row.visible),
    已选: boolText(row.selected),
    Crypto匹配: boolText(row.looksLikeCrypto),
    Spread: row.spread ?? WAITING,
  }));
}

function executionSpecRows(payload) {
  return toArray(payload?.reviewedRows).map((row) => ({
    Symbol: row.brokerSymbol || WAITING,
    标准名: row.canonicalSymbol || WAITING,
    合约大小: row.contractSize ?? WAITING,
    TickSize: row.tickSize ?? WAITING,
    TickValue: row.tickValue ?? WAITING,
    最小手数: row.minLot ?? WAITING,
    步长: row.lotStep ?? WAITING,
    最大手数: row.maxLot ?? WAITING,
    状态: row.validForDryRunContract || row.validForContractSpecReview ? '可审查' : '缺字段',
  }));
}

function executionSpecBlockerRows(payload) {
  return toArray(payload?.blockers).map((row) => ({
    代码: row.code || WAITING,
    Symbol: row.brokerSymbol || row.canonicalSymbol || WAITING,
    字段: row.field || WAITING,
    原因: row.reasonZh || row.reason || WAITING,
  }));
}

function evidenceInputRows(payload) {
  return toArray(payload?.fileInputs).map((row) => ({
    输入: row.labelZh || row.id || WAITING,
    状态: row.exists ? '已存在' : row.required ? '缺失' : '可选',
    路径: row.path || WAITING,
    用途: row.reasonZh || WAITING,
  }));
}

function promotionCandidateRows(payload) {
  return toArray(payload?.candidateLanes).map((row) => ({
    Lane: row.laneZh || row.lane || WAITING,
    模拟达标: boolText(row.simulationQualified),
    可进评审: boolText(row.canEnterLiveReviewNow),
    证据分: row.evidenceScore ?? 0,
    阻塞: row.primaryBlockerCode || WAITING,
  }));
}

function promotionControllerRows(payload) {
  return toArray(payload?.reviewArtifactRuns).map((row) => ({
    Artifact: row.artifactId || WAITING,
    状态: row.statusZh || row.status || WAITING,
    已请求: boolText(row.requestedByController),
    已写入: boolText(row.writtenByController),
  }));
}

function adapterSandboxRows(payload) {
  return toArray(payload?.validationResults).map((row) => ({
    Request: row.requestId || WAITING,
    通过: boolText(row.passed),
    缺字段: row.missingRequiredFields?.length ?? 0,
    未知字段: row.unknownFieldCount ?? 0,
  }));
}

function adapterContractValidatorRows(payload) {
  return toArray(payload?.validationResults).map((row) => ({
    Request: row.requestId || WAITING,
    通过: boolText(row.passed),
    字段错误: row.fieldErrorCount ?? 0,
    Hash有效: boolText(row.reviewPacketHashCurrent && row.runtimePreflightHashCurrent),
    Fuse有效: boolText(row.runtimeFusesOk),
  }));
}

function simToLiveOrchestratorRows(payload) {
  const adapterStages = toArray(payload?.stages).map((row) => ({
    阶段: row.labelZh || row.stageId || WAITING,
    通过: boolText(row.passed),
    阻塞: boolText(row.blocking),
    状态: row.statusZh || row.status || WAITING,
  }));
  const liveStages = toArray(payload?.liveExecutionStages).map((row) => ({
    阶段: row.labelZh || row.stageId || WAITING,
    通过: boolText(row.passed),
    阻塞: boolText(row.blocking),
    状态: row.statusZh || row.status || WAITING,
  }));
  return [...adapterStages, ...liveStages];
}

function executionReleaseGateRows(payload) {
  return toArray(payload?.executionReleaseGateChecklist).map((row) => ({
    闸门: row.labelZh || row.gateId || WAITING,
    副作用: row.sideEffectZh || WAITING,
    数据面: boolText(row.dataPlaneReady),
    ReleaseToken: row.tokenRequired ? boolText(Boolean(row.tokenProvided)) : '不需要',
    阻断: row.tokenRequired && !row.tokenProvided ? row.blockerCode || WAITING : WAITING,
    来源: row.sourceArtifact || row.source || WAITING,
  }));
}

function releaseMinimalDiffChangeRows(payload = {}) {
  const reviewPackage = payload.reviewPackage || payload;
  return toArray(reviewPackage.proposedChanges).map((row) => ({
    文件: row.artifact || WAITING,
    字段: row.section ? `${row.section}.${row.key || WAITING}` : row.key || WAITING,
    当前: formatDisplayValue(row.from ?? WAITING),
    目标: formatDisplayValue(row.to ?? WAITING),
    可立即应用: boolText(Boolean(row.canApplyNow)),
    阻塞码: row.blockerCode || WAITING,
    要求: row.reviewRequirementZh || row.reasonZh || WAITING,
  }));
}

function releaseMinimalDiffTokenRows(payload = {}) {
  const reviewPackage = payload.reviewPackage || payload;
  return toArray(reviewPackage.releaseTokens).map((row) => ({
    ReleaseToken: row.tokenName || row.gateId || WAITING,
    环节: row.labelZh || row.gateId || WAITING,
    副作用: row.sideEffectZh || WAITING,
    数据面: boolText(Boolean(row.dataPlaneReady)),
    已提供: boolText(Boolean(row.tokenProvided)),
    可自动生成: boolText(Boolean(row.canMintNow)),
    阻塞码: row.blockerCode || WAITING,
    证据要求: row.requiredEvidenceZh || WAITING,
  }));
}

function releaseTokenEvidenceRows(payload = {}) {
  const signoffRowsByGate = Object.fromEntries(
    toArray(payload.manualReleaseReviewRows).map((row) => [row.gateId, row]),
  );
  return toArray(payload.evidenceRows).map((row) => ({
    ReleaseToken: row.tokenName || row.gateId || WAITING,
    环节: row.labelZh || row.gateId || WAITING,
    合同: row.contractArtifact || row.sourceArtifact || WAITING,
    副作用: row.sideEffectZh || WAITING,
    数据面: boolText(Boolean(row.dataPlaneReady)),
    证据完成: boolText(Boolean(row.evidenceComplete)),
    无副作用证据: boolText(Boolean(row.noSideEffectEvidenceComplete)),
    检查通过: `${row.evidencePassedCount ?? 0}/${row.evidenceCheckCount ?? 0}`,
    已提供: boolText(Boolean(row.tokenProvided)),
    可释放: boolText(Boolean(row.releaseAllowedNow)),
    签收评审: signoffRowsByGate[row.gateId]?.statusZh || WAITING,
    阻塞码: row.blockerCode || WAITING,
    必查项: compactList(row.requiredChecks),
    测试: compactList(row.testCommands),
  }));
}

function releaseTokenEvidenceProgress(payload = {}) {
  const total = Number(payload.releaseTokenCount);
  if (!Number.isFinite(total) || total <= 0) {
    return payload.nextRequiredActionZh || compactList(payload.blockedReleaseTokenCodes);
  }
  const evidenceDone = Number(
    payload.noSideEffectEvidenceCompleteCount ?? payload.evidenceCompleteCount ?? 0,
  );
  const tokenDone = Number(payload.tokenProvidedCount ?? 0);
  const missing = Number(payload.tokenMissingCount ?? Math.max(total - tokenDone, 0));
  return `无副作用证据 ${evidenceDone}/${total} / Token ${tokenDone}/${total} / 缺 ${missing}`;
}

function releaseTokenSignoffDraftRows(payload = {}) {
  return toArray(payload?.signoffDraftTemplate?.releaseTokenSignoffs).map((row) => ({
    ReleaseToken: row.tokenName || row.gateId || WAITING,
    环节: row.labelZh || row.gateId || WAITING,
    副作用: row.sideEffectZh || WAITING,
    可进入签收: boolText(Boolean(row.readyForSeparateSignoffReview)),
    此处可签收: boolText(Boolean(row.canSignOffHere)),
    可铸Token: boolText(Boolean(row.canMintTokenHere)),
    可释放: boolText(Boolean(row.canReleaseExecutionNow)),
    阻塞码: row.blockerCode || WAITING,
    签收问题: row.signoffQuestionZh || WAITING,
  }));
}

function releaseTokenSignoffDraftProgress(payload = {}) {
  const total = Number(payload.releaseTokenCount);
  const ready = Number(payload.readyForSeparateSignoffCount ?? 0);
  if (!Number.isFinite(total) || total <= 0)
    return payload.nextRequiredActionZh || payload.statusZh || payload.status || WAITING;
  return `签收草案 ${ready}/${total} / 不能在此签收`;
}

function releaseTokenSignoffInputTemplateRows(payload = {}) {
  return toArray(payload?.signoffInputTemplate?.releaseTokenSignoffs).map((row) => ({
    ReleaseToken: row.tokenName || row.gateId || WAITING,
    环节: row.labelZh || row.gateId || WAITING,
    可填写: boolText(Boolean(row.readyForSeparateSignoffReview)),
    Ack证据: boolText(Boolean(row.acknowledgeNoSideEffectEvidence)),
    Ack风控: boolText(Boolean(row.acknowledgeRiskLimits)),
    Ack执行复核: boolText(Boolean(row.acknowledgeExecutionModeSeparatelyReviewed)),
    签收文本: row.finalSignoffText || WAITING,
    此处可签收: boolText(Boolean(row.canAcceptSignoffHere || row.canSignOffHere)),
    可释放: boolText(Boolean(row.canReleaseExecutionNow)),
    阻塞码: row.blockerCode || WAITING,
  }));
}

function releaseTokenSignoffInputTemplateProgress(payload = {}) {
  const total = Number(payload.releaseTokenCount);
  const ready = Number(payload.readyForInputCount ?? 0);
  if (!Number.isFinite(total) || total <= 0)
    return payload.nextRequiredActionZh || payload.statusZh || payload.status || WAITING;
  return `签收模板 ${ready}/${total} / 等待外部填写`;
}

function releaseTokenSignoffInputRows(payload = {}) {
  return toArray(payload?.reviewRows).map((row) => ({
    ReleaseToken: row.tokenName || row.gateId || WAITING,
    环节: row.labelZh || row.gateId || WAITING,
    输入已给: boolText(Boolean(row.inputProvided)),
    Acknowledgement: boolText(Boolean(row.acknowledgementComplete)),
    签收文本: boolText(Boolean(row.finalSignoffTextOk)),
    可进独立复核: boolText(Boolean(row.completeForSeparateReleaseReview)),
    此处可签收: boolText(Boolean(row.canAcceptSignoffHere || row.canSignOffHere)),
    可释放: boolText(Boolean(row.canReleaseExecutionNow)),
    阻塞码: row.blockerCode || WAITING,
    状态: row.statusZh || row.status || WAITING,
  }));
}

function releaseTokenSignoffInputProgress(payload = {}) {
  const total = Number(payload.releaseTokenCount);
  const complete = Number(payload.completeSignoffCount ?? 0);
  if (!Number.isFinite(total) || total <= 0)
    return payload.nextRequiredActionZh || payload.statusZh || payload.status || WAITING;
  return `签收输入 ${complete}/${total} / 当前仍不放行`;
}

function releaseTokenSignoffHandoffRows(payload = {}) {
  return toArray(payload?.missingSignoffRows).map((row) => ({
    ReleaseToken: row.tokenName || row.gateId || WAITING,
    环节: row.labelZh || row.gateId || WAITING,
    输入已给: boolText(Boolean(row.inputProvided)),
    缺少Ack: compactList(row.missingAcknowledgements),
    签收文本: boolText(Boolean(row.finalSignoffTextOk)),
    可释放: boolText(Boolean(row.canReleaseExecutionNow)),
    阻塞码: row.blockerCode || WAITING,
    状态: row.statusZh || row.status || WAITING,
  }));
}

function releaseTokenSignoffHandoffProgress(payload = {}) {
  const total = Number(payload.releaseTokenCount);
  const complete = Number(payload.completeSignoffCount ?? 0);
  const missing = Number(payload.missingSignoffCount ?? Math.max(total - complete, 0));
  if (!Number.isFinite(total) || total <= 0)
    return payload.nextRequiredActionZh || payload.statusZh || payload.status || WAITING;
  return `签收交接 ${complete}/${total} / 缺 ${missing} / 当前仍不放行`;
}

function firstBlockingPipelineStage(payload = {}) {
  const stages = toArray(payload?.stages);
  const blockedStage = stages.find((row) => {
    const blockerCodes = toArray(row.blockerCodes);
    return row.passed === false && (row.blocking || blockerCodes.length || row.status);
  });
  if (blockedStage) return blockedStage;
  const blocker = toArray(payload?.blockers)[0];
  if (!blocker) return null;
  return {
    stageId: blocker.value || payload.autoStage || 'pipeline',
    nameZh: blocker.value || payload.autoStage || 'Pipeline',
    status: blocker.code,
    statusZh: blocker.reasonZh || blocker.reason || blocker.code,
    passed: false,
    blockerCodes: [blocker.code],
    nextRequiredActionZh: blocker.reasonZh || blocker.reason,
  };
}

function pipelineStageReason(payload = {}, stage = {}) {
  const blockerCodes = toArray(stage.blockerCodes);
  const blockers = toArray(payload?.blockers);
  const matched = blockers.find((row) => row.value === stage.stageId || blockerCodes.includes(row.code));
  return stage.nextRequiredActionZh || matched?.reasonZh || matched?.reason || WAITING;
}

function simToLivePipelineHint(payload = {}) {
  const stage = firstBlockingPipelineStage(payload);
  if (!stage) {
    return payload.readyForSeparateExecutionAdapterReview
      ? '可进入单独 execution adapter 评审'
      : '等待证据链';
  }
  const blockerCodes = compactCodeList(stage.blockerCodes, stage.status || WAITING);
  return `停在 ${stage.stageId || payload.autoStage || 'pipeline'}：${blockerCodes}`;
}

function simToLivePipelineBlockerRows(payload) {
  const stages = toArray(payload?.stages);
  if (stages.length) {
    return stages.map((row) => {
      const blockerCodes = toArray(row.blockerCodes);
      return {
        阶段: row.nameZh || row.labelZh || row.stageId || WAITING,
        Stage: row.stageId || WAITING,
        状态: row.statusZh || row.status || WAITING,
        通过: boolText(row.passed),
        阻塞: boolText(row.blocking || (row.passed === false && blockerCodes.length > 0)),
        阻塞码: compactCodeList(blockerCodes, WAITING),
        下一步: pipelineStageReason(payload, row),
      };
    });
  }
  return toArray(payload?.blockers).map((row) => ({
    阶段: row.value || payload?.autoStage || 'Pipeline',
    Stage: row.value || payload?.autoStage || WAITING,
    状态: row.reasonZh || row.reason || row.code || WAITING,
    通过: '否',
    阻塞: '是',
    阻塞码: row.code || WAITING,
    下一步: row.reasonZh || row.reason || WAITING,
  }));
}

function executionAdapterHarnessRows(payload) {
  return toArray(payload?.plannedWrites).map((row) => ({
    Request: row.requestId || WAITING,
    Symbol: row.brokerSymbol || row.canonicalSymbol || WAITING,
    原子写: boolText(row.atomicWriteRequired),
    会写文件: boolText(row.wouldWriteRequestFile || row.wouldWriteReceiptFile),
    Broker调用: boolText(row.brokerCallsMade),
  }));
}

function livePilotActivationRows(payload) {
  return toArray(payload?.reviewChecklist).map((row) => ({
    检查项: row.labelZh || row.id || WAITING,
    通过: boolText(row.passed),
    状态: row.status || WAITING,
    原因: row.reasonZh || WAITING,
  }));
}

function livePilotPresetActivationRows(payload) {
  const packagePayload = payload?.presetActivationPackage || {};
  const diffPackage = packagePayload.reviewOnlyPresetDiffPackage || {};
  const laneDiffs = toArray(diffPackage.laneDiffs);
  if (laneDiffs.length) {
    return laneDiffs.flatMap((plan) =>
      toArray(plan.changes).map((change) => ({
        Lane: plan.lane || WAITING,
        Route: plan.route || plan.preferredFirstLivePilot || WAITING,
        Key: change.key || WAITING,
        From: change.current ?? WAITING,
        To: change.candidate ?? WAITING,
        原因: change.reasonZh || diffPackage.statusZh || WAITING,
        可执行: boolText(plan.canAttachNow),
      })),
    );
  }
  const plans = toArray(packagePayload.reviewedPresetChangePlan);
  return plans.flatMap((plan) =>
    toArray(plan.changes).map((change) => ({
      Lane: plan.lane || WAITING,
      Route: plan.route || WAITING,
      Key: change.key || WAITING,
      From: change.from ?? WAITING,
      To: change.to ?? WAITING,
      原因: change.whyZh || packagePayload.statusZh || WAITING,
      可执行: boolText(false),
    })),
  );
}

function livePilotPresetCandidateRows(payload) {
  const packagePayload = payload?.presetActivationPackage || {};
  const candidates = toArray(packagePayload.reviewOnlyPresetCandidates);
  return candidates.flatMap((candidate) =>
    toArray(candidate.candidateSettings).map((setting) => ({
      Lane: candidate.lane || WAITING,
      Candidate: candidate.candidateId || WAITING,
      Key: setting.key || WAITING,
      Current: setting.currentValue ?? WAITING,
      CandidateValue: setting.candidateValue ?? WAITING,
      原因: setting.reasonZh || candidate.statusZh || WAITING,
      可挂载: boolText(candidate.canAttachNow),
    })),
  );
}

function livePilotCandidateFileRows(payload) {
  const filePackage = payload?.presetActivationPackage?.reviewOnlyCandidateFilePackage || {};
  return toArray(filePackage.files).map((row) => ({
    Lane: row.lane || WAITING,
    Route: row.route || WAITING,
    Preview: row.previewPath || WAITING,
    Manifest: filePackage.manifestPath || WAITING,
    已写审查文件: boolText(row.reviewArtifactFileWritten || filePackage.reviewArtifactFilesWritten),
    写MT5预设: boolText(row.writesMt5Preset),
    写订单请求: boolText(row.writesMt5OrderRequest),
    允许下单: boolText(row.orderSendAllowed),
    可挂载: boolText(row.canAttachNow),
  }));
}

function receiptReconciliationRows(payload) {
  const releaseGate = payload?.receiptReleaseGate || {};
  const releaseTokenRequired = payload?.releaseTokenRequired ?? releaseGate.tokenRequired;
  const releaseTokenProvided = payload?.releaseTokenProvided ?? releaseGate.tokenProvided;
  const releaseBlocker = payload?.releaseTokenBlockerCode || releaseGate.blockerCode || WAITING;
  return toArray(payload?.reconciliationResults).map((row) => ({
    Request: row.requestId || WAITING,
    Symbol: row.brokerSymbol || WAITING,
    Receipt: row.receiptFound ? '已匹配' : '缺失',
    通过: boolText(row.passed),
    ReleaseToken: releaseTokenRequired ? boolText(Boolean(releaseTokenProvided)) : '不需要',
    Release阻断: releaseTokenRequired && !releaseTokenProvided ? releaseBlocker : WAITING,
    原因: row.receiptRejectedReasonCode || WAITING,
  }));
}

function eaRequestReaderRows(payload) {
  const markerRows = toArray(payload?.markerChecks).map((row) => ({
    标记: row.marker || WAITING,
    已存在: boolText(row.present),
    状态: row.status || WAITING,
    原因: row.reasonZh || WAITING,
  }));
  const runtimeRows = toArray(payload?.runtimeStatusSafetyChecks).map((row) => ({
    标记: row.labelZh || row.id || WAITING,
    已存在: boolText(row.passed),
    状态: row.status || WAITING,
    原因: row.reasonZh || WAITING,
  }));
  return [...markerRows, ...runtimeRows];
}

function liveExecutionCutoverRows(payload) {
  return toArray(payload?.cutoverChecklist).map((row) => ({
    检查: row.labelZh || row.id || WAITING,
    通过: boolText(row.passed),
    状态: row.status || WAITING,
    原因: row.reasonZh || WAITING,
  }));
}

function liveExecutionImplementationRows(payload) {
  const rows = toArray(payload?.implementationSteps);
  const sourceRows = rows.length
    ? rows
    : LIVE_IMPLEMENTATION_STEP_IDS.map((stepId) => ({ stepId, status: 'PENDING_CUTOVER_REVIEW' }));
  return sourceRows.map((row) => ({
    步骤: row.labelZh || row.stepId || WAITING,
    状态: row.status || WAITING,
    依赖: compactList(row.dependsOn),
    文件: compactList(row.targetFiles),
  }));
}

function liveExecutionSafetyTraceabilityRows(payload) {
  return toArray(payload?.executionSafetyTraceabilityMatrix).map((row) => ({
    闸门: row.labelZh || row.gateId || row.stepId || WAITING,
    步骤: row.stepId || WAITING,
    状态: row.reviewOnlyStatus || row.stepStatus || WAITING,
    必需: boolText(row.requiredBeforeLive),
    可执行: boolText(row.currentArtifactAllowedToApply),
    下单: boolText(row.orderSendAllowed || row.mt5OrderSendAllowed),
    写Request: boolText(row.writesMt5OrderRequest || row.requestFilesWritten),
    写Receipt: boolText(row.receiptFilesWritten),
    Broker调用: boolText(row.brokerCallsMade),
    缺口: row.blockingIfMissing || WAITING,
  }));
}

function livePilotGateTransitionRows(payload) {
  const plan =
    payload?.livePilotGateTransitionPlan ||
    payload?.executionActivationGapAudit?.livePilotGateTransitionPlan ||
    {};
  return toArray(plan.transitionSteps).map((row) => ({
    步骤: row.labelZh || row.stepId || WAITING,
    状态: row.status || WAITING,
    必需: boolText(row.requiredBeforeLive),
    可由本页执行: boolText(row.canBeAppliedByThisArtifact),
    证据: compactList(row.evidenceRequired),
    禁止: compactList(row.forbiddenHere),
  }));
}

function liveExecutionAdapterWriteRows(payload) {
  const releaseGate = payload?.disabledWriterImplementationContract?.releaseGate || {};
  const writerPreflight = payload?.writerRuntimePreflight || {};
  const releaseTokenRequired = releaseGate.tokenRequired ?? writerPreflight.releaseTokenRequired;
  const releaseTokenProvided =
    releaseGate.tokenProvidedInThisArtifact ?? writerPreflight.releaseTokenProvided;
  const releaseBlocker = releaseGate.blockerCode || writerPreflight.releaseTokenBlockerCode || WAITING;
  return toArray(payload?.writePlans).map((row) => ({
    Request: row.requestId || WAITING,
    Symbol: row.brokerSymbol || WAITING,
    原子写: boolText(row.atomicWriteRequired),
    写MT5: boolText(row.wouldWriteToMt5RequestDirectory),
    ReleaseToken: releaseTokenRequired ? boolText(Boolean(releaseTokenProvided)) : '不需要',
    Release阻断: releaseTokenRequired && !releaseTokenProvided ? releaseBlocker : WAITING,
    Hash: row.serializedPayloadHash || WAITING,
  }));
}

function eaRequestConsumptionRows(payload) {
  const releaseGate = payload?.readerReleaseGate || {};
  const releaseTokenRequired = payload?.releaseTokenRequired ?? releaseGate.tokenRequired;
  const releaseTokenProvided = payload?.releaseTokenProvided ?? releaseGate.tokenProvided;
  const releaseBlocker = payload?.releaseTokenBlockerCode || releaseGate.blockerCode || WAITING;
  return toArray(payload?.consumptionPlans).map((row) => ({
    Request: row.requestId || WAITING,
    Request目录: row.requestDirectory || WAITING,
    Receipt目录: row.receiptDirectory || WAITING,
    默认动作: row.defaultAction || WAITING,
    读Request: boolText(row.wouldReadRequestFile),
    写Receipt: boolText(row.wouldWriteReceiptFile),
    ReleaseToken: releaseTokenRequired ? boolText(Boolean(releaseTokenProvided)) : '不需要',
    Release阻断: releaseTokenRequired && !releaseTokenProvided ? releaseBlocker : WAITING,
  }));
}

function brokerOrderSendRows(payload) {
  const releaseGate = payload?.brokerReleaseGate || {};
  const releaseTokenRequired = payload?.releaseTokenRequired ?? releaseGate.tokenRequired;
  const releaseTokenProvided = payload?.releaseTokenProvided ?? releaseGate.tokenProvided;
  const releaseBlocker = payload?.releaseTokenBlockerCode || releaseGate.blockerCode || WAITING;
  return toArray(payload?.brokerSendPlans).map((row) => ({
    Request: row.requestId || WAITING,
    Symbol: row.brokerSymbol || row.canonicalSymbol || WAITING,
    方向: row.side || WAITING,
    手数: row.volumeLots ?? WAITING,
    Broker调用: boolText(row.wouldCallBroker || row.brokerCallsMade),
    ReleaseToken: releaseTokenRequired
      ? boolText(Boolean(releaseTokenProvided || row.releaseTokenProvided))
      : '不需要',
    Release阻断:
      releaseTokenRequired && !(releaseTokenProvided || row.releaseTokenProvided)
        ? row.releaseTokenBlockerCode || releaseBlocker
        : WAITING,
    Fuse: boolText(row.requestFusesOk),
  }));
}

function profitTargetPayload(state = {}) {
  return state.profitTargetBuild || state.profitTarget || {};
}

function executionModeActivationGateChecklist(review = {}) {
  const packetSummary = review.executionReleaseReadinessPacket?.activationGateSummary || {};
  const dashboard = review.dashboardSnapshot || {};
  const diagnostics = dashboard.executionGateDiagnostics || {};
  const failedFields = toArray(packetSummary.failedGateFields);
  const candidateFields = failedFields.length
    ? failedFields
    : ['livePilotMode', 'readOnlyMode', 'executionEnabled', 'tradeAllowed'].filter(
        (field) =>
          Object.prototype.hasOwnProperty.call(dashboard, field) ||
          Object.prototype.hasOwnProperty.call(diagnostics, field),
      );
  const blockerByField = {
    livePilotMode: 'MT5_LIVE_PILOT_MODE_NOT_CONFIRMED',
    readOnlyMode: 'MT5_READ_ONLY_MODE_STILL_ACTIVE',
    executionEnabled: 'MT5_EXECUTION_NOT_ENABLED_FOR_PILOT',
    tradeAllowed: 'MT5_TRADE_ALLOWED_NOT_CONFIRMED',
  };
  const blockers = toArray(review.blockers);
  return candidateFields.map((field) => {
    const expected = field === 'readOnlyMode' ? false : true;
    const current = diagnostics[field]?.rawValue ?? dashboard[field];
    const blocker = blockers.find((row) => row.code === blockerByField[field]);
    return {
      field,
      layer: diagnostics[field]?.layer || 'MT5 execution mode',
      current,
      expected,
      passed: current === expected,
      blockerCode: blocker?.code || (current === expected ? '' : blockerByField[field]),
      reasonZh: blocker?.reasonZh || diagnostics[field]?.detailZh || WAITING,
      detailZh: diagnostics[field]?.detailZh || blocker?.reasonZh || WAITING,
    };
  });
}

function simToLiveDecisionPayload(profitTarget = {}) {
  const decision = profitTarget.simToLiveDecision || {};
  const review = profitTarget.liveExecutionReview || {};
  const cutoverGate = profitTarget.liveCutoverGate || {};
  if (!Object.keys(review).length && !Object.keys(cutoverGate).length) return decision;

  const activationGateChecklist =
    decision.activationGateChecklist ||
    decision.executionActivationGateChecklist ||
    review.activationGateChecklist ||
    review.executionActivationGateChecklist ||
    executionModeActivationGateChecklist(review);

  return {
    ...review,
    ...decision,
    status: decision.status || review.status || review.liveExecutionReviewStatus || cutoverGate.status,
    statusZh: decision.statusZh || review.statusZh || cutoverGate.statusZh,
    targetReached:
      decision.targetReached ??
      review.targetReached ??
      profitTarget.targetReached ??
      profitTarget.dualTargetReached ??
      cutoverGate.combinedTargetReached,
    dataPlaneReady:
      decision.dataPlaneReady ??
      review.dataPlaneCutoverReady ??
      review.executionReleaseReadinessPacket?.safeAutomationCanContinue,
    executionModeOnlyBlocked: decision.executionModeOnlyBlocked ?? review.cutoverExecutionModeOnlyBlocked,
    allActivationGatesPassed:
      decision.allActivationGatesPassed ??
      review.executionReleaseReadinessPacket?.activationGateSummary?.allPassed ??
      false,
    primaryActionableBlocker: decision.primaryActionableBlocker || review.primaryActionableBlocker,
    activationGateChecklist,
    executionActivationGateChecklist: decision.executionActivationGateChecklist || activationGateChecklist,
    executionReleaseGateChecklist:
      decision.executionReleaseGateChecklist || review.executionReleaseGateChecklist,
    requiredLaneSummaries: decision.requiredLaneSummaries || review.requiredLaneSummaries,
    orderSendAllowed: decision.orderSendAllowed ?? review.orderSendAllowed ?? cutoverGate.orderSendAllowed,
    mt5OrderSendAllowed: decision.mt5OrderSendAllowed ?? review.mt5OrderSendAllowed,
    writesMt5OrderRequest: decision.writesMt5OrderRequest ?? review.writesMt5OrderRequest,
    brokerCallsMade: decision.brokerCallsMade ?? review.brokerCallsMade,
    nextRequiredActionZh:
      decision.nextRequiredActionZh || review.nextRequiredActionZh || cutoverGate.reasonZh,
    implementationReadinessSummary:
      decision.implementationReadinessSummary || review.implementationReadinessSummary,
    disabledFirstImplementationWorkReady:
      decision.disabledFirstImplementationWorkReady ?? review.disabledFirstImplementationWorkReady,
    nextCodeWorkAllowedInReviewOnly:
      decision.nextCodeWorkAllowedInReviewOnly ?? review.nextCodeWorkAllowedInReviewOnly,
    liveExecutionStillForbidden: decision.liveExecutionStillForbidden ?? review.liveExecutionStillForbidden,
  };
}

function profitTargetLaneRows(profitTarget = {}) {
  const decision = simToLiveDecisionPayload(profitTarget);
  const laneSummaries = toArray(decision.requiredLaneSummaries);
  if (laneSummaries.length) {
    return laneSummaries.map((row) => ({
      Lane: row.laneId || WAITING,
      盈利USD: hasNumericValue(row.simulationVerifiedUsdProfit)
        ? Number(row.simulationVerifiedUsdProfit).toFixed(2)
        : WAITING,
      合计目标USD: row.combinedTargetUsd ?? row.targetUsd ?? profitTarget.target?.targetUsd ?? WAITING,
      达标: boolText(row.targetReached),
      状态: row.status || WAITING,
      证据数: row.evidenceCount ?? WAITING,
    }));
  }
  return Object.entries(profitTarget.laneTargets || {}).map(([laneId, row]) => ({
    Lane: row.labelZh || laneId,
    盈利USD: hasNumericValue(row.simulationVerifiedUsdProfit)
      ? Number(row.simulationVerifiedUsdProfit).toFixed(2)
      : WAITING,
    合计目标USD: row.combinedTargetUsd ?? row.targetUsd ?? profitTarget.target?.targetUsd ?? WAITING,
    达标: boolText(row.targetReached),
    状态: row.statusZh || row.status || WAITING,
    证据数: row.evidenceCount ?? WAITING,
  }));
}

function activationGateRows(profitTarget = {}) {
  const decision = simToLiveDecisionPayload(profitTarget);
  const checklist = decision.activationGateChecklist || decision.executionActivationGateChecklist;
  return toArray(checklist).map((row) => ({
    闸门: row.field || WAITING,
    层级: row.layer || WAITING,
    当前: boolText(Boolean(row.current)),
    期望: boolText(Boolean(row.expected)),
    通过: boolText(Boolean(row.passed)),
    阻塞码: row.blockerCode || WAITING,
    原因: row.reasonZh || row.reason || WAITING,
    细节: row.detailZh || row.reasonZh || row.reason || WAITING,
  }));
}

function profitTargetLaneLine(rows) {
  const forex = rows.find((row) => String(row.Lane || '').includes('forex'));
  const btc = rows.find((row) => String(row.Lane || '').includes('btc'));
  if (!forex && !btc) return WAITING;
  return `外币 ${forex?.盈利USD || '—'} / BTC ${btc?.盈利USD || '—'} USD`;
}

function activationGateSummary(rows) {
  if (!rows.length) return '等待执行闸门清单';
  const failed = rows.filter((row) => row.通过 !== '是').length;
  return failed ? `${failed}/${rows.length} 个执行闸门未通过` : '执行闸门全部通过';
}

function profitTargetTone(profitTarget = {}, decision = {}, gateRows = []) {
  if (decision.allActivationGatesPassed) return 'ok';
  if (profitTarget.dualTargetReached || decision.targetReached) return gateRows.length ? 'warn' : 'ok';
  return isObject(profitTarget) && Object.keys(profitTarget).length ? 'warn' : 'blocked';
}

function primaryExecutionBlocker(profitTarget = {}, releaseReadinessRefresh = {}) {
  const decision = simToLiveDecisionPayload(profitTarget);
  const review = profitTarget.liveExecutionReview || {};
  return (
    releaseReadinessRefresh.primaryActionableBlocker ||
    toArray(releaseReadinessRefresh.fileEvidenceBlockers)[0] ||
    toArray(releaseReadinessRefresh.executionModeFileEvidence?.blockingEvidence)[0] ||
    decision.primaryActionableBlocker ||
    review.primaryActionableBlocker ||
    toArray(decision.fileEvidenceBlockers)[0] ||
    toArray(review.fileEvidenceBlockers)[0] ||
    toArray(decision.executionModeBlockers)[0] ||
    toArray(review.runtimePreflightExecutionModeBlockers)[0] ||
    toArray(review.blockers)[0]
  );
}

function executionGateHint(profitTarget = {}, fallback = WAITING, releaseReadinessRefresh = {}) {
  const blocker = primaryExecutionBlocker(profitTarget, releaseReadinessRefresh);
  const reason = blocker?.reasonZh || blocker?.reason || '';
  if (reason) return `当前主 blocker：${reason}`;
  const decision = simToLiveDecisionPayload(profitTarget);
  if (releaseReadinessRefresh.nextRequiredActionZh) return releaseReadinessRefresh.nextRequiredActionZh;
  return decision.nextRequiredActionZh || profitTarget.liveCutoverGate?.reasonZh || fallback;
}

function profitExecutionConclusionLine(
  profitTarget = {},
  targetLaneLine = WAITING,
  releaseReadinessRefresh = {},
) {
  const decision = simToLiveDecisionPayload(profitTarget);
  const targetReached = Boolean(profitTarget.dualTargetReached || decision.targetReached);
  if (!targetReached) return targetLaneLine;
  if (decision.allActivationGatesPassed) return `收益已达标，执行闸门已通过：${targetLaneLine}`;
  return `收益已达标，但执行未释放：${executionGateHint(profitTarget, '等待执行闸门证据', releaseReadinessRefresh)}`;
}

function implementationReadinessPayload(profitTarget = {}, implementationSpec = {}) {
  const decision = simToLiveDecisionPayload(profitTarget);
  const review = profitTarget.liveExecutionReview || {};
  const summary =
    decision.implementationReadinessSummary ||
    review.implementationReadinessSummary ||
    implementationSpec.implementationReadinessSummary ||
    {};
  return {
    summary,
    disabledFirstImplementationWorkReady: Boolean(
      decision.disabledFirstImplementationWorkReady ||
      review.disabledFirstImplementationWorkReady ||
      implementationSpec.disabledFirstImplementationWorkReady,
    ),
    nextCodeWorkAllowedInReviewOnly: Boolean(
      decision.nextCodeWorkAllowedInReviewOnly ||
      review.nextCodeWorkAllowedInReviewOnly ||
      implementationSpec.nextCodeWorkAllowedInReviewOnly,
    ),
    liveExecutionStillForbidden:
      decision.liveExecutionStillForbidden ??
      review.liveExecutionStillForbidden ??
      implementationSpec.liveExecutionStillForbidden ??
      true,
  };
}

function implementationReadinessSummaryText(readiness = {}) {
  const summary = readiness.summary || {};
  if (readiness.disabledFirstImplementationWorkReady) return '可继续 disabled-first 实现';
  return summary.statusZh || summary.status || WAITING;
}

function implementationReadinessHint(readiness = {}) {
  const summary = readiness.summary || {};
  return (
    summary.nextRequiredActionZh ||
    summary.allowedWorkType ||
    (readiness.nextCodeWorkAllowedInReviewOnly ? '只允许代码和 review artifact，真实订单仍禁止' : WAITING)
  );
}

function mt5ExporterRows(payload) {
  const repoRows = toArray(payload?.repoEaSource?.markerChecks);
  return toArray(payload?.installedMt5Ea?.markerChecks).map((row) => ({
    标记: row.marker || WAITING,
    已安装EA包含: boolText(row.present),
    仓库EA包含: boolText(repoRows.find((item) => item.marker === row.marker)?.present),
  }));
}

function mt5UpgradeBundleRows(payload) {
  return toArray(payload?.manualSteps).map((step, index) => ({
    步骤: index + 1,
    操作: step,
  }));
}

function mt5ExporterDeployPlanRows(payload) {
  const checklist = toArray(payload?.operatorChecklist).map((row) => ({
    类型: '检查',
    项目: row.labelZh || row.id || WAITING,
    状态: row.passedByPlan === false ? '需复核' : row.required ? '必做' : '可选',
    人工: boolText(row.automated === false),
  }));
  const commands = toArray(payload?.commandsForHumanReview).map((row) => ({
    类型: '命令',
    项目: row.labelZh || WAITING,
    状态: row.manualOnly ? '人工执行' : '自动',
    人工: boolText(row.manualOnly),
  }));
  return [...checklist, ...commands];
}

function standaloneExporterBundleRows(payload) {
  const target = payload?.target || {};
  const output = payload?.output || {};
  const startup = payload?.startupConfig || {};
  const postRun = payload?.postRunRefreshPlan || {};
  const targetRows = [
    {
      类型: '状态',
      项目: 'EA已安装',
      状态: target.targetExpertExists ? '已安装' : '未安装',
      人工: boolText(true),
    },
    {
      类型: '状态',
      项目: 'EA已编译',
      状态: target.targetExpertCompiledExists ? '已编译' : '未编译',
      人工: boolText(true),
    },
    {
      类型: '状态',
      项目: '脚本已安装',
      状态: target.targetScriptExists ? '已安装' : '未安装',
      人工: boolText(true),
    },
    {
      类型: '状态',
      项目: '脚本已编译',
      状态: target.targetCompiledExists ? '已编译' : '未编译',
      人工: boolText(true),
    },
    {
      类型: '输出',
      项目: 'Specs JSON',
      状态: output.expectedSpecsExists
        ? `${output.expectedSpecsRowCount ?? 0} 行 / ${output.expectedSpecsReadable ? '可读' : '不可读'}`
        : '未生成',
      人工: boolText(true),
    },
    {
      类型: '启动包',
      项目: '只读启动配置',
      状态: startup.configExists ? '已生成' : '未生成',
      人工: boolText(startup.manualOnly ?? true),
    },
    {
      类型: '刷新计划',
      项目: 'Specs 后审查刷新',
      状态: `${toArray(postRun.refreshCommands).length} 步`,
      人工: boolText(postRun.manualOnly ?? true),
    },
  ];
  const checklist = toArray(payload?.operatorChecklist).map((row) => ({
    类型: '检查',
    项目: row.labelZh || row.id || WAITING,
    状态: row.required ? '必做' : '可选',
    人工: boolText(row.automated === false),
  }));
  const commands = toArray(payload?.commandsForHumanReview).map((row) => ({
    类型: '命令',
    项目: row.labelZh || WAITING,
    状态: row.manualOnly ? '人工执行' : '自动',
    人工: boolText(row.manualOnly),
  }));
  return [...targetRows, ...checklist, ...commands];
}

function mt5PostUpgradeRows(payload) {
  const checks = payload?.checks || {};
  return Object.entries(checks).map(([key, value]) => ({
    检查项: key,
    通过: boolText(Boolean(value)),
  }));
}

function postUpgradeControllerRows(payload) {
  return toArray(payload?.reviewArtifactRuns).map((row) => ({
    Artifact: row.artifactId || WAITING,
    状态: row.statusZh || row.status || WAITING,
    已写入: boolText(row.writtenByController),
  }));
}

function filledInputRows(payload) {
  return toArray(payload?.inputFiles).map((row) => ({
    输入: row.labelZh || row.id || WAITING,
    状态: row.exists ? '已存在' : '缺失',
    路径: row.path || WAITING,
    用途: row.reasonZh || WAITING,
  }));
}

function filledInputCheckRows(payload) {
  return toArray(payload?.checklist).map((row) => ({
    检查项: row.labelZh || row.id || WAITING,
    通过: boolText(row.passed),
    状态: row.status || WAITING,
    原因: row.reasonZh || WAITING,
  }));
}

function evidenceBootstrapDraftRows(payload) {
  return toArray(payload?.draftFiles).map((row) => ({
    草稿: row.labelZh || row.id || WAITING,
    已生成: boolText(row.draftExists),
    Filled存在: boolText(row.targetFilledExists),
    本次写入: boolText(row.writtenByThisRun),
    路径: row.draftPath || WAITING,
  }));
}

function mossMetrics(payload) {
  return payload?.mossBacktestProfile?.metrics || {};
}

function liveReadinessPayload(state = {}) {
  return state.liveBuild || state.liveReadiness || {};
}

function liveReviewPayload(state = {}) {
  return state.liveReviewBuild || state.liveReviewPacket || {};
}

function liveApprovalPayload(state = {}) {
  return state.liveApprovalBuild || state.liveApprovalDraft || {};
}

function liveApprovalEvidencePayload(state = {}) {
  return state.liveApprovalEvidenceBuild || state.liveApprovalEvidence || {};
}

function dryRunPlanPayload(state = {}) {
  return state.dryRunBuild || state.dryRunPlan || {};
}

function executionLaneSpecPayload(state = {}) {
  return state.executionLaneSpecBuild || state.executionLaneSpec || {};
}

function dryRunReplayPayload(state = {}) {
  return state.dryRunReplayBuild || state.dryRunReplay || {};
}

function runtimePreflightPayload(state = {}) {
  return state.runtimePreflightBuild || state.runtimePreflight || {};
}

function orderRequestContractPayload(state = {}) {
  return state.orderRequestContractBuild || state.orderRequestContract || {};
}

function simToLivePipelinePayload(state = {}) {
  return state.simToLivePipelineBuild || state.simToLivePipeline || {};
}

function executionAdapterReviewPayload(state = {}) {
  return state.executionAdapterReviewBuild || state.executionAdapterReview || {};
}

function liveEvidenceIntakePayload(state = {}) {
  return state.liveEvidenceIntakeBuild || state.liveEvidenceIntake || {};
}

function livePromotionCandidatesPayload(state = {}) {
  return state.livePromotionCandidatesBuild || state.livePromotionCandidates || {};
}

function livePromotionControllerPayload(state = {}) {
  return state.livePromotionControllerBuild || state.livePromotionController || {};
}

function adapterSandboxPayload(state = {}) {
  return state.adapterSandboxBuild || state.adapterSandbox || {};
}

function adapterContractValidatorPayload(state = {}) {
  return state.adapterContractValidatorBuild || state.adapterContractValidator || {};
}

function simToLiveOrchestratorPayload(state = {}) {
  return state.simToLiveOrchestratorBuild || state.simToLiveOrchestrator || {};
}

function executionAdapterHarnessPayload(state = {}) {
  return state.executionAdapterHarnessBuild || state.executionAdapterHarness || {};
}

function livePilotActivationReviewPayload(state = {}) {
  return state.livePilotActivationReviewBuild || state.livePilotActivationReview || {};
}

function receiptReconciliationReviewPayload(state = {}) {
  return state.receiptReconciliationReviewBuild || state.receiptReconciliationReview || {};
}

function eaRequestReaderReviewPayload(state = {}) {
  return state.eaRequestReaderReviewBuild || state.eaRequestReaderReview || {};
}

function liveExecutionCutoverReviewPayload(state = {}) {
  return state.liveExecutionCutoverReviewBuild || state.liveExecutionCutoverReview || {};
}

function liveExecutionImplementationSpecPayload(state = {}) {
  return state.liveExecutionImplementationSpecBuild || state.liveExecutionImplementationSpec || {};
}

function liveExecutionAdapterWriteReviewPayload(state = {}) {
  return state.liveExecutionAdapterWriteReviewBuild || state.liveExecutionAdapterWriteReview || {};
}

function eaRequestConsumptionReviewPayload(state = {}) {
  return state.eaRequestConsumptionReviewBuild || state.eaRequestConsumptionReview || {};
}

function brokerOrderSendReviewPayload(state = {}) {
  return state.brokerOrderSendReviewBuild || state.brokerOrderSendReview || {};
}

function executionSpecPayload(state = {}, payload = {}) {
  return state.executionSpecBuild || payload.executionSpecReview || state.executionSpec || {};
}

function contractSpecExportPayload(state = {}, payload = {}) {
  return state.contractSpecExportBuild || payload.contractSpecExport || state.contractSpecExport || {};
}

function simulationProfilePayload(state = {}, payload = {}) {
  return state.simulationProfileBuild || payload.simulationProfileReview || state.simulationProfile || {};
}

function evidenceKitPayload(state = {}) {
  return state.evidenceKitBuild || state.evidenceKit || {};
}

function evidenceBootstrapPayload(state = {}) {
  return state.evidenceBootstrapBuild || state.evidenceBootstrap || {};
}

function mt5ExporterReviewPayload(state = {}) {
  return state.mt5ExporterReviewBuild || state.mt5ExporterReview || {};
}

function mt5UpgradeBundlePayload(state = {}) {
  return state.mt5UpgradeBundleBuild || state.mt5UpgradeBundle || {};
}

function mt5ExporterDeployPlanPayload(state = {}) {
  return state.mt5ExporterDeployPlanBuild || state.mt5ExporterDeployPlan || {};
}

function standaloneExporterBundlePayload(state = {}) {
  return state.standaloneExporterBundleBuild || state.standaloneExporterBundle || {};
}

function mt5PostUpgradePayload(state = {}) {
  return state.mt5PostUpgradeVerifyBuild || state.mt5PostUpgradeVerify || {};
}

function postUpgradeControllerPayload(state = {}) {
  return state.postUpgradeControllerBuild || state.postUpgradeController || {};
}

function filledInputValidatorPayload(state = {}) {
  return state.filledInputValidatorBuild || state.filledInputValidator || {};
}

function firstBlockerReason(rows) {
  const items = toArray(rows);
  const first = items.find((item) => isObject(item));
  return first?.reasonZh || first?.reason || WAITING;
}

function executionReviewSummaryTone(summary = {}) {
  if (summary.liveExecutionAllowed || summary.canPromoteToLiveNow) return 'ok';
  if (summary.reviewReadyLaneIds?.length || summary.simulationQualifiedLaneIds?.length) return 'warn';
  return 'blocked';
}

function executionReviewSummaryHint(summary = {}) {
  return (
    summary.nextRequiredActionZh ||
    compactCodeList(summary.primaryBlockerCodes) ||
    compactCodeList(Object.values(summary.blockerCodesByLane || {}).flat())
  );
}

function executionReviewBlockerRows(summary = {}) {
  return Object.entries(summary.blockerCodesByLane || {}).flatMap(([laneId, codes]) =>
    toArray(codes).map((code) => ({
      Lane: laneId,
      阻塞码: code || WAITING,
      分组: laneId === 'global' ? '全局执行闸门' : '车道闸门',
    })),
  );
}

function runtimePreflightDataPlaneReady(payload = {}) {
  return Boolean(payload.dataPlaneReadyForLivePilotReview && payload.executionModeOnlyBlocked);
}

function orderContractDataPlaneReady(payload = {}) {
  return Boolean(
    payload.runtimePreflightDataPlaneReadyForReview && payload.runtimePreflightExecutionModeOnlyBlocked,
  );
}

function runtimePreflightSummary(payload = {}) {
  if (payload.runtimeProbePassed) {
    return {
      value: '预检通过',
      hint: 'live pilot 快照通过但不下单',
      status: 'warn',
    };
  }
  if (runtimePreflightDataPlaneReady(payload)) {
    return {
      value: payload.statusZh || '数据面已通过，等待执行模式闸门',
      hint: '数据、账号、BTC tick、价差、审批和 dry-run 已通过，仅剩执行模式闸门',
      status: 'warn',
    };
  }
  return {
    value: firstBlockerReason(payload.blockers),
    hint: '等待 livePilotMode / symbol / kill switch',
    status: 'blocked',
  };
}

function orderRequestContractSummary(payload = {}, runtimePreflight = {}) {
  if (payload.readyForAdapterCodeReview) {
    return {
      value: '可进入 adapter 评审',
      hint: '可进入 adapter 评审',
      status: 'warn',
    };
  }
  if (runtimePreflightDataPlaneReady(runtimePreflight) || orderContractDataPlaneReady(payload)) {
    return {
      value: payload.statusZh || '等待执行模式闸门',
      hint: 'runtime 数据面已通过，request 合约仍等待 livePilot/readOnly/execution/tradeAllowed',
      status: 'blocked',
    };
  }
  return {
    value: firstBlockerReason(payload.blockers),
    hint: '等待 runtime preflight',
    status: 'blocked',
  };
}

function executionReviewSummary(payload = {}, readyKey, dataPlaneKey, readyText, dataPlaneText) {
  if (payload?.[readyKey]) {
    return {
      value: readyText,
      hint: payload.statusZh || payload.status || readyText,
      status: 'warn',
    };
  }
  if (payload?.[dataPlaneKey] && payload?.executionModeOnlyBlocked) {
    return {
      value: payload.statusZh || dataPlaneText || '数据面已通过，等待执行模式闸门',
      hint: firstBlockerReason(payload.blockers),
      status: 'warn',
    };
  }
  return {
    value: firstBlockerReason(payload?.blockers),
    hint: payload?.statusZh || payload?.status || WAITING,
    status: 'blocked',
  };
}

function runtimeScopeLabel(runtimeScope = {}) {
  if (!isObject(runtimeScope) || (!runtimeScope.accountLabel && !runtimeScope.scope)) return WAITING;
  const label = runtimeScope.accountLabel || runtimeScope.scope;
  return runtimeScope.scope ? `${label} (${runtimeScope.scope})` : label;
}

function runtimeScopeHint(runtimeScope = {}) {
  if (!isObject(runtimeScope)) return WAITING;
  return runtimeScope.runtimeDir || runtimeScope.requestedScope || WAITING;
}

export function buildHfmCryptoModel(state = {}) {
  const payload = firstPayload(state);
  const live = liveReadinessPayload(state);
  const review = liveReviewPayload(state);
  const approval = liveApprovalPayload(state);
  const approvalEvidence = liveApprovalEvidencePayload(state);
  const dryRun = dryRunPlanPayload(state);
  const executionLaneSpec = executionLaneSpecPayload(state);
  const dryRunReplay = dryRunReplayPayload(state);
  const runtimePreflight = runtimePreflightPayload(state);
  const orderRequestContract = orderRequestContractPayload(state);
  const simToLivePipeline = simToLivePipelinePayload(state);
  const executionAdapterReview = executionAdapterReviewPayload(state);
  const liveEvidenceIntake = liveEvidenceIntakePayload(state);
  const livePromotionCandidates = livePromotionCandidatesPayload(state);
  const livePromotionController = livePromotionControllerPayload(state);
  const adapterSandbox = adapterSandboxPayload(state);
  const adapterContractValidator = adapterContractValidatorPayload(state);
  const simToLiveOrchestrator = simToLiveOrchestratorPayload(state);
  const executionAdapterHarness = executionAdapterHarnessPayload(state);
  const livePilotActivationReview = livePilotActivationReviewPayload(state);
  const receiptReconciliationReview = receiptReconciliationReviewPayload(state);
  const eaRequestReaderReview = eaRequestReaderReviewPayload(state);
  const liveExecutionCutoverReview = liveExecutionCutoverReviewPayload(state);
  const liveExecutionImplementationSpec = liveExecutionImplementationSpecPayload(state);
  const liveExecutionAdapterWriteReview = liveExecutionAdapterWriteReviewPayload(state);
  const eaRequestConsumptionReview = eaRequestConsumptionReviewPayload(state);
  const brokerOrderSendReview = brokerOrderSendReviewPayload(state);
  const profitTarget = profitTargetPayload(state);
  const simToLiveDecision = simToLiveDecisionPayload(profitTarget);
  const liveRuntimeScope = live.runtimeScope || profitTarget.runtimeScope || payload.runtimeScope || {};
  const contractSpecExport = contractSpecExportPayload(state, payload);
  const executionSpec = executionSpecPayload(state, payload);
  const simulationProfile = simulationProfilePayload(state, payload);
  const evidenceKit = evidenceKitPayload(state);
  const evidenceBootstrap = evidenceBootstrapPayload(state);
  const mt5ExporterReview = mt5ExporterReviewPayload(state);
  const mt5Snapshot = mt5SnapshotPayload(state);
  const mt5Freshness = mt5SnapshotFreshness(mt5Snapshot);
  const mt5SnapshotStale = mt5Freshness.stale === true || mt5Freshness.status === 'STALE_EA_SNAPSHOT';
  const mt5UpgradeBundle = mt5UpgradeBundlePayload(state);
  const mt5ExporterDeployPlan = mt5ExporterDeployPlanPayload(state);
  const standaloneExporterBundle = standaloneExporterBundlePayload(state);
  const mt5PostUpgradeVerify = mt5PostUpgradePayload(state);
  const postUpgradeController = postUpgradeControllerPayload(state);
  const filledInputValidator = filledInputValidatorPayload(state);
  const liveLanes = live?.lanes || {};
  const hfmLive = liveLanes.hfmCryptoCfd || {};
  const usdLive = liveLanes.usdjpyMt5 || {};
  const hfmLiveAvailability = hfmLive.accountCryptoAvailability || {};
  const executionSummary = live.executionReviewSummary || {};
  const executionSummaryBlockerRows = executionReviewBlockerRows(executionSummary);
  const executionSummaryHint = executionReviewSummaryHint(executionSummary);
  const liveExecutionAllowed = Boolean(live.liveExecutionAllowed || executionSummary.liveExecutionAllowed);
  const hfmExecutionBlockers = toArray(executionSummary.blockerCodesByLane?.hfmCryptoCfd);
  const globalExecutionBlockers = toArray(executionSummary.blockerCodesByLane?.global);
  const moss = mossMetrics(payload);
  const safety = payload.safety || HFM_CRYPTO_SAFETY_DEFAULTS;
  const symbolEvidence = payload.symbolEvidence || {};
  const targets = toArray(payload.targetSymbols);
  const symbolEvidenceCanonical = toArray(symbolEvidence.canonicalSymbols);
  const symbolEvidenceBroker = toArray(symbolEvidence.brokerSymbols);
  const findings = findingRows(payload);
  const symbolEvidenceSources = symbolEvidenceRows(payload);
  const candidates = candidateRows(payload);
  const blockers = blockerRows(payload);
  const operatorChecklistRaw = toArray(payload.operatorChecklist);
  const operatorChecklist = operatorChecklistRows(payload);
  const brokerDiagnostics = brokerSymbolDiagnostics(payload);
  const brokerSymbolSamples = brokerSymbolSampleRows(payload);
  const brokerSymbolTotalAll = brokerDiagnostics.brokerSymbolTotalAll;
  const brokerSymbolTotalMarketWatch = brokerDiagnostics.brokerSymbolTotalMarketWatch;
  const brokerCryptoLikeCountAll = brokerDiagnostics.brokerCryptoLikeCountAll;
  const brokerCryptoLikeCountMarketWatch = brokerDiagnostics.brokerCryptoLikeCountMarketWatch;
  const brokerDiagnosticsKnown =
    hasNumericValue(brokerSymbolTotalAll) || hasNumericValue(brokerSymbolTotalMarketWatch);
  const brokerHasCrypto =
    Number(brokerCryptoLikeCountAll || 0) > 0 || Number(brokerCryptoLikeCountMarketWatch || 0) > 0;
  const symbolEvidenceCount = evidenceSymbolCount(payload);
  const specRows = executionSpecRows(executionSpec);
  const specBlockers = executionSpecBlockerRows(executionSpec);
  const evidenceInputs = evidenceInputRows(liveEvidenceIntake);
  const promotionCandidates = promotionCandidateRows(livePromotionCandidates);
  const promotionControllerRuns = promotionControllerRows(livePromotionController);
  const adapterSandboxValidations = adapterSandboxRows(adapterSandbox);
  const adapterContractValidations = adapterContractValidatorRows(adapterContractValidator);
  const simToLivePipelineBlockerRowsData = simToLivePipelineBlockerRows(simToLivePipeline);
  const simToLivePipelineBlockerHint = simToLivePipelineHint(simToLivePipeline);
  const releaseReadinessRefresh = state.releaseReadinessRefresh || {};
  const postTargetExecutionSummary = releaseReadinessRefresh.postTargetExecutionSummary || {};
  const releaseUnblockPlan = releaseReadinessRefresh.releaseUnblockPlan || {};
  const releaseMinimalDiffReview = state.releaseMinimalDiffReview || {};
  const releaseTokenEvidenceReview = state.releaseTokenEvidenceReview || {};
  const releaseTokenSignoffDraft = state.releaseTokenSignoffDraft || {};
  const releaseTokenSignoffInputTemplate = state.releaseTokenSignoffInputTemplate || {};
  const releaseTokenSignoffInputReview = state.releaseTokenSignoffInputReview || {};
  const releaseTokenSignoffHandoff = state.releaseTokenSignoffHandoff || {};
  const releaseDiffReviewSummary = Object.keys(releaseMinimalDiffReview).length
    ? releaseMinimalDiffReview
    : releaseUnblockPlan;
  const releaseMinimalDiffChanges = releaseMinimalDiffChangeRows(releaseMinimalDiffReview);
  const releaseMinimalDiffTokens = releaseMinimalDiffTokenRows(releaseMinimalDiffReview);
  const releaseTokenEvidence = releaseTokenEvidenceRows(releaseTokenEvidenceReview);
  const releaseTokenSignoffDraftRowsData = releaseTokenSignoffDraftRows(releaseTokenSignoffDraft);
  const releaseTokenSignoffInputTemplateRowsData = releaseTokenSignoffInputTemplateRows(
    releaseTokenSignoffInputTemplate,
  );
  const releaseTokenSignoffInputRowsData = releaseTokenSignoffInputRows(releaseTokenSignoffInputReview);
  const releaseTokenSignoffHandoffRowsData = releaseTokenSignoffHandoffRows(releaseTokenSignoffHandoff);
  const postTargetReleaseAudit = executionLaneSpec.postTargetReleaseAudit || {};
  const authorizationBoundary =
    executionLaneSpec.authorizationBoundary || approvalEvidence.authorizationBoundary || {};
  const laneSelector = state.laneSelector || {};
  const laneSelectorBlocker = laneSelector.selectedLanePrimaryBlocker || {};
  const laneSelectorLine =
    laneSelector.selectedLaneLabelZh || laneSelector.selectedLaneId
      ? `${laneSelector.selectedLaneLabelZh || laneSelector.selectedLaneId}：${
          laneSelectorBlocker.reasonZh ||
          laneSelectorBlocker.reason ||
          laneSelector.selectedLaneNearestSafeActionZh ||
          WAITING
        }`
      : WAITING;
  const simToLiveOrchestratorStages = simToLiveOrchestratorRows(simToLiveOrchestrator);
  const executionReleaseGateRowsData = executionReleaseGateRows(
    releaseReadinessRefresh.executionReleaseGateChecklist ? releaseReadinessRefresh : simToLiveOrchestrator,
  );
  const executionAdapterHarnessPlans = executionAdapterHarnessRows(executionAdapterHarness);
  const livePilotActivationChecks = livePilotActivationRows(livePilotActivationReview);
  const livePilotPresetActivationRowsData = livePilotPresetActivationRows(livePilotActivationReview);
  const livePilotPresetCandidateRowsData = livePilotPresetCandidateRows(livePilotActivationReview);
  const livePilotCandidateFileRowsData = livePilotCandidateFileRows(livePilotActivationReview);
  const receiptReconciliationRowsData = receiptReconciliationRows(receiptReconciliationReview);
  const eaRequestReaderRowsData = eaRequestReaderRows(eaRequestReaderReview);
  const liveExecutionCutoverRowsData = liveExecutionCutoverRows(liveExecutionCutoverReview);
  const liveExecutionImplementationRowsData = liveExecutionImplementationRows(
    liveExecutionImplementationSpec,
  );
  const liveExecutionSafetyTraceabilityRowsData = liveExecutionSafetyTraceabilityRows(
    liveExecutionImplementationSpec,
  );
  const livePilotGateTransitionRowsData = livePilotGateTransitionRows(liveExecutionImplementationSpec);
  const liveExecutionAdapterWriteRowsData = liveExecutionAdapterWriteRows(liveExecutionAdapterWriteReview);
  const eaRequestConsumptionRowsData = eaRequestConsumptionRows(eaRequestConsumptionReview);
  const brokerOrderSendRowsData = brokerOrderSendRows(brokerOrderSendReview);
  const profitTargetLaneRowsData = profitTargetLaneRows(profitTarget);
  const activationGateChecklistRows = activationGateRows(profitTarget);
  const mt5ExporterMarkers = mt5ExporterRows(mt5ExporterReview);
  const mt5UpgradeBundleSteps = mt5UpgradeBundleRows(mt5UpgradeBundle);
  const mt5ExporterDeployPlanSteps = mt5ExporterDeployPlanRows(mt5ExporterDeployPlan);
  const standaloneExporterBundleSteps = standaloneExporterBundleRows(standaloneExporterBundle);
  const mt5PostUpgradeChecks = mt5PostUpgradeRows(mt5PostUpgradeVerify);
  const postUpgradeControllerRuns = postUpgradeControllerRows(postUpgradeController);
  const filledInputFiles = filledInputRows(filledInputValidator);
  const filledInputChecks = filledInputCheckRows(filledInputValidator);
  const evidenceBootstrapDrafts = evidenceBootstrapDraftRows(evidenceBootstrap);
  const executionSpecReady = Boolean(executionSpec.readyForExecutionSpecReview || hfmLive.executionSpecReady);
  const simulationQualified = Boolean(
    simulationProfile.simulationQualified || hfmLive.simulationProfileQualified,
  );
  const protection = payload.shadowPlan?.priceDiffProtectionPct;
  const mt5Account = mt5Snapshot.account || {};
  const mt5Runtime = mt5Snapshot.runtime || {};
  const mt5Market = mt5Snapshot.market || {};
  const mt5SymbolItems = toArray(mt5Snapshot.symbols?.items);
  const mt5Connected = Boolean(mt5Snapshot.ok && (mt5Account.server || mt5Runtime.server));
  const mt5Login = mt5Account.login ? `#${mt5Account.login}` : '账号未显示';
  const mt5Server = mt5Account.server || mt5Runtime.server || WAITING;
  const mt5Currency = mt5Account.currency || WAITING;
  const standaloneExporterOutput = standaloneExporterBundle.output || {};
  const mt5ExporterReviewLoaded = endpointLoaded(mt5ExporterReview);
  const standaloneExporterBundleLoaded = endpointLoaded(standaloneExporterBundle);
  const standaloneExporterReadyToRun = Boolean(
    standaloneExporterBundle.targetExpertInstalledAndCompiled ||
    standaloneExporterBundle.targetInstalledAndCompiled ||
    standaloneExporterOutput.expectedSpecsExists,
  );
  const specsEvidenceReady = Boolean(
    standaloneExporterOutput.expectedSpecsRowCount > 0 ||
    standaloneExporterOutput.expectedSpecsExists ||
    symbolEvidence.contractSpecExportReady ||
    symbolEvidence.executionSpecReady ||
    executionSpecReady ||
    symbolEvidenceCanonical.length ||
    symbolEvidenceBroker.length,
  );
  const independentCryptoEvidenceReady = Boolean(
    specsEvidenceReady || symbolEvidence.found || symbolEvidenceCount > 0,
  );
  const standaloneExporterNextAction =
    standaloneExporterBundle.nextRequiredActionZh ||
    standaloneExporterBundle.output?.expectedSpecsPath ||
    sourceFileHint(payload, 'contractSpecExport', '规格证据已由 Live16 runtime 提供');
  const accountCryptoAvailabilityStatus = brokerDiagnosticsKnown
    ? brokerHasCrypto
      ? '账号已下发 HFM crypto CFD symbol'
      : independentCryptoEvidenceReady
        ? `账号列表未显示 crypto；specs 已发现 ${symbolEvidenceCount || WAITING} 个 HFM crypto CFD`
        : '账号已连接，但未下发 HFM crypto CFD symbol'
    : independentCryptoEvidenceReady
      ? `等待账号 symbol 探测；specs 已发现 ${symbolEvidenceCount || WAITING} 个 HFM crypto CFD`
      : '等待 MT5 broker symbol 探测';
  const accountCryptoAvailabilityTone = brokerDiagnosticsKnown
    ? brokerHasCrypto
      ? 'ok'
      : independentCryptoEvidenceReady
        ? 'warn'
        : 'blocked'
    : 'warn';
  const cryptoExporterReady = Boolean(
    specsEvidenceReady || standaloneExporterReadyToRun || mt5ExporterReview.exporterReadyForEvidenceIntake,
  );
  const cryptoExporterBlocker = mt5ExporterReviewLoaded
    ? firstBlockerReason(mt5ExporterReview.blockers) || mt5ExporterReview.nextRequiredActionZh || WAITING
    : 'EA exporter 详情后台加载中，当前已使用 Live16 specs/runtime 证据。';
  const profitTargetLoaded = isObject(profitTarget) && Object.keys(profitTarget).length > 0;
  const targetDecisionTone = profitTargetTone(profitTarget, simToLiveDecision, activationGateChecklistRows);
  const targetDecisionStatus =
    simToLiveDecision.statusZh ||
    simToLiveDecision.status ||
    profitTarget.statusZh ||
    profitTarget.status ||
    'profit-target 未载入';
  const targetLaneLine = profitTargetLoaded
    ? profitTargetLaneLine(profitTargetLaneRowsData)
    : 'profit-target 未载入';
  const targetExecutionConclusion = profitTargetLoaded
    ? profitExecutionConclusionLine(profitTarget, targetLaneLine, releaseReadinessRefresh)
    : 'profit-target 未载入';
  const gateSummary = profitTargetLoaded
    ? activationGateSummary(activationGateChecklistRows)
    : 'profit-target 未载入';
  const livePilotActivationSummary = executionReviewSummary(
    livePilotActivationReview,
    'readyForLivePilotActivationReview',
    'dataPlaneActivationReady',
    '可进入单独实盘 adapter/EA 评审',
  );
  const receiptReconciliationSummary = executionReviewSummary(
    receiptReconciliationReview,
    'readyForReceiptReconciliationReview',
    'dataPlaneReconciliationReady',
    '对账规则可评审',
  );
  const eaRequestReaderSummary = executionReviewSummary(
    eaRequestReaderReview,
    'readyForEaRequestReaderImplementationReview',
    'dataPlaneEaRequestReaderReady',
    '可进入 EA 实现评审',
  );
  const liveCutoverSummary = executionReviewSummary(
    liveExecutionCutoverReview,
    'readyForSeparateLiveExecutionCutoverImplementationReview',
    'dataPlaneCutoverReady',
    '可进入单独 cutover 实现评审',
  );
  const liveImplementationSummary = executionReviewSummary(
    liveExecutionImplementationSpec,
    'readyForLiveExecutionImplementationSpecReview',
    'dataPlaneImplementationSpecReady',
    '实现合同可评审',
  );
  const implementationReadiness = implementationReadinessPayload(
    profitTarget,
    liveExecutionImplementationSpec,
  );
  const adapterWriterSummary = executionReviewSummary(
    liveExecutionAdapterWriteReview,
    'readyForLiveExecutionAdapterWriteReview',
    'dataPlaneAdapterWriteReady',
    'writer 序列化可评审',
  );
  const eaConsumptionSummary = executionReviewSummary(
    eaRequestConsumptionReview,
    'readyForEaRequestConsumptionReview',
    'dataPlaneEaRequestConsumptionReady',
    'EA 消费合同可评审',
  );
  const brokerOrderSendSummary = executionReviewSummary(
    brokerOrderSendReview,
    'readyForBrokerOrderSendReview',
    'dataPlaneBrokerOrderSendReady',
    'broker wrapper 合同可评审',
  );
  return {
    status: statusTone(payload.status),
    statusLabel: payload.statusZh || humanizeStatus(payload.status, '等待 HFM Crypto CFD 状态'),
    executionSpecReady,
    standaloneExporterReadyToRun,
    standaloneExporterNextAction,
    metrics: [
      {
        label: 'MT5 账号链路',
        value: mt5Connected ? `已连接 ${mt5Server}` : '未连上 MT5 快照',
        hint: `${mt5Login} / ${mt5Currency} / ${mt5FreshnessLine(mt5Freshness)}`,
        status: mt5SnapshotStale ? 'blocked' : mt5Connected ? 'ok' : 'warn',
      },
      {
        label: 'Crypto 接入卡点',
        value:
          brokerDiagnosticsKnown && !brokerHasCrypto && independentCryptoEvidenceReady
            ? 'Specs 已发现 crypto，Market Watch 未显示'
            : brokerDiagnosticsKnown && !brokerHasCrypto
              ? '当前账号无 crypto CFD'
              : specsEvidenceReady
                ? 'Live16 specs 证据已生成'
                : standaloneExporterOutput.expectedSpecsRowCount > 0
                  ? 'Specs 文件已生成'
                  : standaloneExporterReadyToRun
                    ? 'Specs 导出 EA 已安装编译'
                    : cryptoExporterReady
                      ? 'EA exporter 已安装'
                      : '等待 exporter 详情',
        hint:
          brokerDiagnosticsKnown && !brokerHasCrypto && independentCryptoEvidenceReady
            ? `本机/EA specs 已发现 ${symbolEvidenceCount || WAITING} 个 HFM crypto symbol；当前账号 inventory ${formatCount(brokerSymbolTotalAll)} 个、Market Watch ${formatCount(brokerSymbolTotalMarketWatch)} 个、crypto-like ${formatCount(brokerCryptoLikeCountAll)} 个。`
            : brokerDiagnosticsKnown && !brokerHasCrypto
              ? `${formatCount(brokerSymbolTotalAll)} 个 broker symbol，crypto-like ${formatCount(brokerCryptoLikeCountAll)} 个；不是账号没登录，是这个 HFM 账号/服务器没给 crypto CFD。`
              : specsEvidenceReady
                ? sourceFileHint(payload, 'contractSpecExport', 'Live16 已提供 HFM crypto symbol/spec 证据')
                : standaloneExporterOutput.expectedSpecsRowCount > 0
                  ? '下一步刷新合约规格审查与实盘准入档案'
                  : standaloneExporterReadyToRun
                    ? '只差用 Expert 启动一次 QuantGod_HFMCryptoSpecExporterEA'
                    : cryptoExporterReady
                      ? '可以继续采集 HFM crypto specs'
                      : cryptoExporterBlocker,
      },
      {
        label: '车道状态',
        value: payload.statusZh || payload.status || WAITING,
        hint: payload.schema || payload.runtimeScope?.accountLabel || 'Live16 HFM crypto shadow-only',
      },
      {
        label: '已发现 Symbol',
        value: symbolEvidenceCanonical.length || findings.length,
        hint: compactList(
          symbolEvidenceBroker.length ? symbolEvidenceBroker : payload.localEvidence?.brokerSymbols,
        ),
      },
      { label: '候选 Symbol', value: candidates.length, hint: compactList(targets) },
      { label: '价差保护', value: formatPercent(protection), hint: 'Moss 跟随资料按 3% 价差保护建模' },
      {
        label: 'Moss 回测',
        value: payload.mossBacktestProfile?.profileFound ? '已导入' : '未导入',
        hint:
          moss.agentId ||
          payload.mossBacktestProfile?.profileJsonPath ||
          '可选：导入 Moss/backtest profile 后再做跟随评审',
      },
      {
        label: '模拟验收',
        value: simulationProfile.statusZh || simulationProfile.status || WAITING,
        hint: simulationQualified
          ? `达到候选门槛 / ${simulationProfile.sourceSelection?.source || '显式输入'}`
          : '等待 ROI/Sharpe/回撤/样本',
      },
      {
        label: '合计 50 USD 目标',
        value:
          profitTarget.dualTargetReached || simToLiveDecision.targetReached ? '已达标' : targetDecisionStatus,
        hint: targetExecutionConclusion,
      },
      {
        label: '执行闸门',
        value: gateSummary,
        hint: executionGateHint(
          profitTarget,
          '目标达成后只展示闸门状态，不写 MT5 request 文件',
          releaseReadinessRefresh,
        ),
      },
      {
        label: '真实执行',
        value: liveExecutionAllowed ? '已开放' : '未开放',
        hint: executionSummary.statusZh || live.statusZh || executionSummaryHint,
      },
      {
        label: '择优车道',
        value: laneSelector.selectedLaneLabelZh || laneSelector.selectedLaneId || WAITING,
        hint: laneSelectorLine,
      },
      { label: '跟单比例', value: payload.riskBoundary?.followRatio ?? 0, hint: '当前强制只读' },
      {
        label: '规格导出',
        value: contractSpecExport.statusZh || contractSpecExport.status || WAITING,
        hint: `${contractSpecExport.validRowCount ?? 0} 个 MT5 registry 行可导入审查`,
      },
      {
        label: '合约规格',
        value: executionSpec.statusZh || executionSpec.status || WAITING,
        hint: `${executionSpec.validRowCount ?? 0} 个 symbol 可审查`,
      },
      {
        label: '证据采集包',
        value: evidenceKit.statusZh || evidenceKit.status || WAITING,
        hint: evidenceKit.outputFiles?.contractSpecTemplateJson || '等待模板',
      },
      {
        label: '证据Bootstrap',
        value: evidenceBootstrap.statusZh || evidenceBootstrap.status || WAITING,
        hint: `${evidenceBootstrapDrafts.length} 个草稿 / ${evidenceBootstrap.artifactSummary?.orchestrator?.currentStageZh || WAITING}`,
      },
      {
        label: 'MT5 EA导出器',
        value:
          mt5ExporterReview.statusZh ||
          mt5ExporterReview.status ||
          (specsEvidenceReady ? 'Live16 specs 证据已可用' : WAITING),
        hint: mt5ExporterReview.mt5EaUpgradeRequired
          ? '当前 MultiStrategy EA 可后续升级；Live16 独立 exporter/specs 已先接通'
          : mt5ExporterReview.dashboard?.path || sourceFileHint(payload, 'contractSpecExport'),
      },
      {
        label: 'EA升级包',
        value: mt5UpgradeBundle.statusZh || mt5UpgradeBundle.status || WAITING,
        hint: mt5UpgradeBundle.bundle?.stagedSourcePath || WAITING,
      },
      {
        label: '部署/回滚计划',
        value: mt5ExporterDeployPlan.statusZh || mt5ExporterDeployPlan.status || WAITING,
        hint: mt5ExporterDeployPlan.deployPlanReady
          ? mt5ExporterDeployPlan.backupPlan?.backupPath || '已生成部署前备份路径'
          : firstBlockerReason(mt5ExporterDeployPlan.blockers),
      },
      {
        label: '独立 Specs 导出',
        value:
          standaloneExporterBundle.statusZh ||
          standaloneExporterBundle.status ||
          (specsEvidenceReady ? 'Live16 specs 证据已生成' : WAITING),
        hint: standaloneExporterBundle.targetExpertInstalledAndCompiled
          ? 'EA 已安装并编译，等待用 Expert 启动一次'
          : standaloneExporterBundle.targetInstalledAndCompiled
            ? '脚本已安装并编译，等待在 MT5 Scripts 运行一次'
            : standaloneExporterBundle.standaloneExporterReady
              ? standaloneExporterBundle.bundle?.stagedExpertPath ||
                standaloneExporterBundle.bundle?.stagedScriptPath ||
                '可人工安装运行，不替换当前 EA'
              : specsEvidenceReady
                ? sourceFileHint(payload, 'contractSpecExport')
                : firstBlockerReason(standaloneExporterBundle.blockers),
      },
      {
        label: '升级后复核',
        value: mt5PostUpgradeVerify.statusZh || mt5PostUpgradeVerify.status || WAITING,
        hint: mt5PostUpgradeVerify.postUpgradeVerified
          ? '可继续模拟转实盘证据链'
          : firstBlockerReason(mt5PostUpgradeVerify.blockers),
      },
      {
        label: '升级总控',
        value: postUpgradeController.statusZh || postUpgradeController.status || WAITING,
        hint: postUpgradeController.postUpgradeReviewAutomated
          ? '已自动刷新 specs 审查'
          : firstBlockerReason(postUpgradeController.blockers),
      },
      {
        label: '评审输入校验',
        value: filledInputValidator.statusZh || filledInputValidator.status || WAITING,
        hint: filledInputValidator.reviewInputsValid
          ? `可刷新实盘评审候选 / ${filledInputValidator.inputSources?.contractSpecSource || WAITING}`
          : firstBlockerReason(filledInputValidator.blockers),
      },
      {
        label: '实盘准入',
        value: live.statusZh || live.status || WAITING,
        hint: live.canPromoteToLiveNow ? '需要复核' : '当前不会写订单',
      },
      {
        label: '执行审查包',
        value: review.statusZh || review.status || WAITING,
        hint: review.reviewCandidateCount ? '审查包已生成；当前卡点看执行模式闸门' : '证据还没齐',
      },
      {
        label: '审批证据',
        value:
          approvalEvidence.statusZh ||
          approvalEvidence.status ||
          approval.statusZh ||
          approval.status ||
          WAITING,
        hint: approvalEvidence.operatorApprovalProvided ? '证据已验收；不再等待用户确认' : '缺审批证据 JSON',
      },
      {
        label: 'Dry-run 计划',
        value: dryRun.statusZh || dryRun.status || WAITING,
        hint: `${dryRun.summary?.intentCount ?? 0} 个 dry-run intent`,
      },
      {
        label: '执行通道规格',
        value: executionLaneSpec.statusZh || executionLaneSpec.status || WAITING,
        hint: executionLaneSpec.readyForImplementationReview
          ? '可进入实现评审'
          : '等待审批证据与 dry-run intent',
      },
      {
        label: 'Dry-run 回放',
        value: dryRunReplay.statusZh || dryRunReplay.status || WAITING,
        hint: dryRunReplay.replayPassed ? '回放通过但不下单' : '等待 execution spec / intent',
      },
      {
        label: '运行时预检',
        value: runtimePreflight.statusZh || runtimePreflight.status || WAITING,
        hint: runtimePreflightSummary(runtimePreflight).hint,
      },
      {
        label: 'MT5请求合约',
        value: orderRequestContract.statusZh || orderRequestContract.status || WAITING,
        hint: orderRequestContractSummary(orderRequestContract, runtimePreflight).hint,
      },
      {
        label: '自动化流水线',
        value: simToLivePipeline.statusZh || simToLivePipeline.status || WAITING,
        hint: simToLivePipelineBlockerHint,
      },
      {
        label: 'Adapter评审',
        value: executionAdapterReview.statusZh || executionAdapterReview.status || WAITING,
        hint: executionAdapterReview.readyForExecutionAdapterCodeReview
          ? '可进入代码评审'
          : '等待 pipeline / request contract',
      },
      {
        label: '证据接入',
        value: liveEvidenceIntake.statusZh || liveEvidenceIntake.status || WAITING,
        hint: `${liveEvidenceIntake.fileInputSummary?.missingChecklistCount ?? 0} 个证据缺口 / ${liveEvidenceIntake.inputs?.effectiveContractSpecSource || '等待规格来源'}`,
      },
      {
        label: '候选选择',
        value: livePromotionCandidates.statusZh || livePromotionCandidates.status || WAITING,
        hint: `${livePromotionCandidates.reviewCandidateCount ?? 0} 个 lane 可进实盘评审`,
      },
      {
        label: '自动晋级',
        value: livePromotionController.statusZh || livePromotionController.status || WAITING,
        hint: livePromotionController.reviewAutomationRequested ? '已自动生成审查包' : '等待候选 lane',
      },
      {
        label: 'Adapter沙盒',
        value: adapterSandbox.statusZh || adapterSandbox.status || WAITING,
        hint: `${adapterSandbox.sampleRequestCount ?? 0} 个 review-only request 样本`,
      },
      {
        label: 'Adapter合同验证',
        value: adapterContractValidator.statusZh || adapterContractValidator.status || WAITING,
        hint: `${adapterContractValidator.requestCount ?? 0} 个 request / ${adapterContractValidator.receiptCount ?? 0} 个 receipt`,
      },
      {
        label: '总控状态机',
        value: simToLiveOrchestrator.statusZh || simToLiveOrchestrator.status || WAITING,
        hint: `${simToLiveOrchestrator.passedStageCount ?? 0}/${simToLiveOrchestrator.stageCount ?? 0} 阶段 / live ${simToLiveOrchestrator.liveExecutionPassedStageCount ?? 0}/${simToLiveOrchestrator.liveExecutionStageCount ?? 0} / ${simToLiveOrchestrator.currentLiveExecutionStageZh || simToLiveOrchestrator.currentStageZh || WAITING}`,
      },
      {
        label: 'Adapter Harness',
        value: executionAdapterHarness.statusZh || executionAdapterHarness.status || WAITING,
        hint: `${executionAdapterHarness.plannedWriteCount ?? 0} 个禁用态 request 写入计划`,
      },
      {
        label: 'Live Pilot激活审查',
        value: livePilotActivationSummary.value,
        hint: livePilotActivationSummary.hint,
      },
      {
        label: 'Receipt对账',
        value: receiptReconciliationSummary.value,
        hint: receiptReconciliationSummary.hint,
      },
      {
        label: 'EA Request Reader',
        value: eaRequestReaderSummary.value,
        hint: eaRequestReaderSummary.hint,
      },
      {
        label: 'Live Cutover审查',
        value: liveCutoverSummary.value,
        hint: liveCutoverSummary.hint,
      },
      {
        label: 'Live实现规格',
        value: liveImplementationSummary.value,
        hint: liveExecutionSafetyTraceabilityRowsData.length
          ? `${liveExecutionSafetyTraceabilityRowsData.length} 个执行安全缺口待单独评审：broker send / receipt / rollback`
          : liveExecutionImplementationSpec.readyForLiveExecutionImplementationSpecReview
            ? `${toArray(liveExecutionImplementationSpec.implementationSteps).length} 个实现 PR 合同`
            : liveImplementationSummary.hint,
      },
      {
        label: '实现工作包',
        value: implementationReadinessSummaryText(implementationReadiness),
        hint: implementationReadinessHint(implementationReadiness),
      },
      {
        label: 'Adapter Writer',
        value: adapterWriterSummary.value,
        hint: liveExecutionAdapterWriteReview.readyForLiveExecutionAdapterWriteReview
          ? `${liveExecutionAdapterWriteReview.writePlanCount ?? 0} 个 request 序列化计划`
          : adapterWriterSummary.hint,
      },
      {
        label: 'EA Request Consumption',
        value: eaConsumptionSummary.value,
        hint: eaRequestConsumptionReview.readyForEaRequestConsumptionReview
          ? `${eaRequestConsumptionReview.consumptionPlanCount ?? 0} 个 request 消费合同`
          : eaConsumptionSummary.hint,
      },
      {
        label: 'Broker Order Send',
        value: brokerOrderSendSummary.value,
        hint: brokerOrderSendReview.readyForBrokerOrderSendReview
          ? `${brokerOrderSendReview.brokerSendPlanCount ?? 0} 个 broker wrapper 合同`
          : brokerOrderSendSummary.hint,
      },
    ].filter(visibleKeyValueRow),
    endpoints: [
      {
        label: 'MT5 账号快照',
        endpoint: '/api/mt5-readonly-secondary/snapshot',
        description: '读取 Live16 MT5 dashboard 快照，确认 crypto CFD 账号、服务器、当前 symbol 和交易权限',
        status: mt5SnapshotStale ? 'blocked' : endpointStatus(state.mt5Snapshot),
      },
      {
        label: 'HFM Crypto 状态',
        endpoint: '/api/hfm-crypto/status?view=summary&scope=secondary',
        description: '读取 Live16 crypto CFD shadow-only 状态文件',
        status: endpointStatus(state.status),
      },
      {
        label: 'HFM Symbol 扫描',
        endpoint: '/api/hfm-crypto/symbols',
        description: '扫描本机 MT5 Bases 的 crypto tick/history 目录',
        status: endpointStatus(state.symbols),
      },
      {
        label: 'HFM 规格导出',
        endpoint: '/api/hfm-crypto/contract-spec-export',
        description: '把 MT5 symbol registry 或 EA 自动导出的规格转成审查输入',
        status: endpointStatus(state.contractSpecExport),
      },
      {
        label: 'HFM 合约规格',
        endpoint: '/api/hfm-crypto/execution-spec',
        description: '导入并审查 MT5/HFM crypto 合约规格字段',
        status: endpointStatus(state.executionSpec),
      },
      {
        label: 'HFM 模拟表现',
        endpoint: '/api/hfm-crypto/simulation-profile',
        description: '审查 ROI、Sharpe、回撤、交易笔数和爆仓次数',
        status: endpointStatus(state.simulationProfile),
      },
      {
        label: 'MT5 EA导出器',
        endpoint: '/api/hfm-crypto/mt5-exporter-review',
        description: '检查当前 MT5 安装目录 EA 是否能导出 HFM crypto symbol specs',
        status: endpointStatus(state.mt5ExporterReview),
      },
      {
        label: 'EA升级包',
        endpoint: '/api/hfm-crypto/mt5-upgrade-bundle',
        description: '生成 runtime 暂存升级包，不复制、不编译、不修改 MT5',
        status: endpointStatus(state.mt5UpgradeBundle),
      },
      {
        label: '部署/回滚计划',
        endpoint: '/api/hfm-crypto/mt5-exporter-deploy-plan',
        description: '生成人工部署、备份和回滚计划；不执行复制、不编译、不改 MT5',
        status: endpointStatus(state.mt5ExporterDeployPlan),
      },
      {
        label: '独立 Specs 导出',
        endpoint: '/api/hfm-crypto/standalone-exporter-bundle',
        description: '生成只读 MT5 Expert/Script 导出包，不替换当前 EA、不下单',
        status: endpointStatus(state.standaloneExporterBundle),
      },
      {
        label: '升级后复核',
        endpoint: '/api/hfm-crypto/mt5-post-upgrade-verify',
        description: '复核 EA 源码、ex5、dashboard specs，并推进 contract-spec 审查',
        status: endpointStatus(state.mt5PostUpgradeVerify),
      },
      {
        label: '升级总控',
        endpoint: '/api/hfm-crypto/post-upgrade-controller',
        description: '串联 exporter、升级包、post-upgrade verify 和 contract-spec 审查刷新',
        status: endpointStatus(state.postUpgradeController),
      },
      {
        label: '评审输入校验',
        endpoint: '/api/hfm-crypto/filled-input-validator',
        description: '独立校验人工 filled 或自动 review artifact 是否可进入实盘评审链',
        status: endpointStatus(state.filledInputValidator),
      },
      {
        label: '实盘准入档案',
        endpoint: '/api/live-automation/status?scope=secondary',
        description: '汇总 Live16 HFM crypto 的模拟转实盘审查条件',
        status: endpointStatus(state.liveReadiness),
      },
      {
        label: '执行审查包',
        endpoint: '/api/live-automation/review-packet',
        description: '展示未来执行通道的 dry-run 订单意图合约和风控清单',
        status: endpointStatus(state.liveReviewPacket),
      },
      {
        label: '审批草案',
        endpoint: '/api/live-automation/approval-draft',
        description: '列出审批证据字段；已验收后当前卡点转为执行模式闸门',
        status: endpointStatus(state.liveApprovalDraft),
      },
      {
        label: '审批证据',
        endpoint: '/api/live-automation/approval-evidence',
        description: '校验审批 JSON 与 review packet hash；通过后不再等待用户确认',
        status: endpointStatus(state.liveApprovalEvidence),
      },
      {
        label: 'Dry-run 计划',
        endpoint: '/api/live-automation/dry-run-plan',
        description: '只生成审查用 intent，不写 MT5 pending order 文件',
        status: endpointStatus(state.dryRunPlan),
      },
      {
        label: '执行通道规格',
        endpoint: '/api/live-automation/execution-lane-spec',
        description: '定义未来 MT5 执行 adapter 的输入输出和闸门，不写订单',
        status: endpointStatus(state.executionLaneSpec),
      },
      {
        label: 'Dry-run 回放审查',
        endpoint: '/api/live-automation/dry-run-replay',
        description: '回放 dry-run intent 字段和 lane 映射，不写订单',
        status: endpointStatus(state.dryRunReplay),
      },
      {
        label: '运行时预检',
        endpoint: '/api/live-automation/runtime-preflight',
        description: '核对 MT5 dashboard 新鲜度、账户、symbol、价差和 kill switch，不写订单',
        status: endpointStatus(state.runtimePreflight),
      },
      {
        label: 'MT5请求合约',
        endpoint: '/api/live-automation/order-request-contract',
        description: '定义未来 MT5 请求文件与回执字段，不生成请求文件',
        status: endpointStatus(state.orderRequestContract),
      },
      {
        label: '自动化流水线',
        endpoint: '/api/live-automation/pipeline',
        description: '串联模拟准入、审批、dry-run、预检和请求合约，不下单',
        status: endpointStatus(state.simToLivePipeline),
      },
      {
        label: 'Adapter评审',
        endpoint: '/api/live-automation/adapter-review',
        description: '验证未来 execution adapter 的请求/回执合同，只读评审',
        status: endpointStatus(state.executionAdapterReview),
      },
      {
        label: '证据接入',
        endpoint: '/api/live-automation/evidence-intake',
        description: '汇总 HFM crypto 实盘前缺失文件、审查状态和只读刷新命令',
        status: endpointStatus(state.liveEvidenceIntake),
      },
      {
        label: '候选选择',
        endpoint: '/api/live-automation/promotion-candidates',
        description: '把模拟达标 lane 自动挑选为实盘评审候选，不生成订单',
        status: endpointStatus(state.livePromotionCandidates),
      },
      {
        label: '自动晋级',
        endpoint: '/api/live-automation/promotion-controller',
        description: '有候选时自动生成 review packet、approval draft、dry-run plan 和 pipeline',
        status: endpointStatus(state.livePromotionController),
      },
      {
        label: 'Adapter沙盒',
        endpoint: '/api/live-automation/adapter-sandbox',
        description: '验证未来 request/receipt 序列化和幂等 hash，只写本地审查 bundle',
        status: endpointStatus(state.adapterSandbox),
      },
      {
        label: 'Adapter合同验证',
        endpoint: '/api/live-automation/adapter-contract-validator',
        description: '离线验证 future adapter request JSON 与 request/receipt 合同，不写 MT5 Files',
        status: endpointStatus(state.adapterContractValidator),
      },
      {
        label: '总控状态机',
        endpoint: '/api/live-automation/orchestrator',
        description: '串联证据、候选、审批、dry-run、预检、request contract 与 adapter review',
        status: endpointStatus(state.simToLiveOrchestrator),
      },
      {
        label: 'Adapter Harness',
        endpoint: '/api/live-automation/adapter-harness',
        description: '生成禁用态 request/receipt 写入计划，校验幂等、原子写和回执，不写 MT5 Files',
        status: endpointStatus(state.executionAdapterHarness),
      },
      {
        label: 'Live Pilot激活审查',
        endpoint: '/api/live-automation/live-pilot-activation-review',
        description: '汇总总控、preflight、adapter harness 和上线 runbook，只做激活评审不下单',
        status: endpointStatus(state.livePilotActivationReview),
      },
      {
        label: 'Receipt对账审查',
        endpoint: '/api/live-automation/receipt-reconciliation-review',
        description: '校验 review-only receipts 与 planned request 对账、自动暂停规则，不写文件不调用 broker',
        status: endpointStatus(state.receiptReconciliationReview),
      },
      {
        label: 'EA Request Reader审查',
        endpoint: '/api/live-automation/ea-request-reader-review',
        description: '检查 EA request reader 安全标记和前置对账/合约状态，不读取 request 文件不下单',
        status: endpointStatus(state.eaRequestReaderReview),
      },
      {
        label: 'Live Cutover审查',
        endpoint: '/api/live-automation/live-execution-cutover-review',
        description:
          '汇总总控、activation、receipt、EA reader、preflight 和人工审批，作为单独实盘切换实现评审入口',
        status: endpointStatus(state.liveExecutionCutoverReview),
      },
      {
        label: 'Live实现规格',
        endpoint: '/api/live-automation/live-execution-implementation-spec',
        description: '把实盘实现拆成 adapter、EA reader、broker send、receipt 和 rollback 的单独 PR 合同',
        status: endpointStatus(state.liveExecutionImplementationSpec),
      },
      {
        label: 'Adapter Writer审查',
        endpoint: '/api/live-automation/live-execution-adapter-write-review',
        description: '校验 request writer 的稳定序列化、幂等 hash 和原子写计划，不写 MT5 request 文件',
        status: endpointStatus(state.liveExecutionAdapterWriteReview),
      },
      {
        label: 'EA Request Consumption审查',
        endpoint: '/api/live-automation/ea-request-consumption-review',
        description: '对齐 adapter request 计划与 EA reader 合同，审查拒绝回执路径，不读取 request 文件',
        status: endpointStatus(state.eaRequestConsumptionReview),
      },
      {
        label: 'Broker Order Send审查',
        endpoint: '/api/live-automation/broker-order-send-review',
        description: '绑定账户、symbol、lot、spread、kill switch 和 receipt 合同，只做 broker wrapper 审查',
        status: endpointStatus(state.brokerOrderSendReview),
      },
    ].filter(visibleKeyValueRow),
    readinessItems: [
      {
        label: '状态',
        value: payload.statusZh || payload.status || WAITING,
        status: statusTone(payload.status),
      },
      {
        label: '账号 Crypto 可用性',
        value: accountCryptoAvailabilityStatus,
        hint: brokerDiagnosticsKnown
          ? `总 symbols ${formatCount(brokerSymbolTotalAll)} / Market Watch ${formatCount(brokerSymbolTotalMarketWatch)} / crypto-like ${formatCount(brokerCryptoLikeCountAll)}`
          : '等待 QuantGod_HFMCryptoSymbolSpecs.json 中的 brokerSymbolDiagnostics',
        status: accountCryptoAvailabilityTone,
      },
      {
        label: '目标 Symbol',
        value: compactList(targets),
        hint: '先确认 HFM 真实 broker symbol，再进入任何执行设计。',
      },
      {
        label: '本地证据',
        value: symbolEvidence.found ? '已发现 HFM crypto symbol/spec 证据' : '尚未发现 HFM crypto 证据',
        status: symbolEvidence.found ? 'ok' : 'warn',
      },
      {
        label: '主要阻塞',
        value: blockers[0]?.原因 || '没有新增阻塞',
        status: blockers.length ? 'warn' : 'ok',
      },
      {
        label: '规格导出',
        value: contractSpecExport.readyForContractSpecReviewInput
          ? 'MT5 registry 已转成规格输入'
          : firstBlockerReason(contractSpecExport.blockers),
        status: contractSpecExport.readyForContractSpecReviewInput ? 'warn' : 'blocked',
      },
      {
        label: 'MT5 EA导出器',
        value: cryptoExporterReady ? '规格证据可用' : firstBlockerReason(mt5ExporterReview.blockers),
        hint: specsEvidenceReady
          ? sourceFileHint(payload, 'contractSpecExport')
          : mt5ExporterReview.installedMt5Ea?.sourcePath || mt5ExporterReview.nextRequiredActionZh || WAITING,
        status: cryptoExporterReady ? 'ok' : mt5ExporterReviewLoaded ? 'blocked' : 'warn',
      },
      {
        label: 'EA升级包',
        value: mt5UpgradeBundle.bundleReadyForManualUpgrade
          ? '已生成，可人工升级'
          : firstBlockerReason(mt5UpgradeBundle.blockers),
        status: mt5UpgradeBundle.bundleReadyForManualUpgrade ? 'warn' : 'blocked',
      },
      {
        label: '部署/回滚计划',
        value: mt5ExporterDeployPlan.deployPlanReady
          ? '已生成，等待人工执行'
          : firstBlockerReason(mt5ExporterDeployPlan.blockers),
        hint: mt5ExporterDeployPlan.rollbackPlanReady ? '回滚路径已规划' : '回滚路径未就绪',
        status:
          mt5ExporterDeployPlan.deployPlanReady && mt5ExporterDeployPlan.rollbackPlanReady
            ? 'warn'
            : 'blocked',
      },
      {
        label: '独立 Specs 导出',
        value: specsEvidenceReady
          ? 'Specs 文件/审查证据已生成'
          : standaloneExporterBundle.output?.expectedSpecsRowCount > 0
            ? 'Specs 文件已生成，等待刷新审查'
            : standaloneExporterBundle.targetExpertInstalledAndCompiled
              ? 'EA 已安装并编译，等待运行'
              : standaloneExporterBundle.targetInstalledAndCompiled
                ? '脚本已安装并编译，等待运行'
                : standaloneExporterBundle.standaloneExporterReady
                  ? '已生成，可人工运行'
                  : firstBlockerReason(standaloneExporterBundle.blockers),
        hint:
          standaloneExporterBundle.output?.expectedSpecsPath || sourceFileHint(payload, 'contractSpecExport'),
        status: specsEvidenceReady
          ? 'ok'
          : standaloneExporterBundle.standaloneExporterReady
            ? 'warn'
            : standaloneExporterBundleLoaded
              ? 'blocked'
              : 'warn',
      },
      {
        label: '升级后复核',
        value: mt5PostUpgradeVerify.postUpgradeVerified
          ? '已通过'
          : firstBlockerReason(mt5PostUpgradeVerify.blockers),
        status: mt5PostUpgradeVerify.postUpgradeVerified ? 'warn' : 'blocked',
      },
      {
        label: '升级总控',
        value: postUpgradeController.postUpgradeReviewAutomated
          ? '已自动推进审查'
          : firstBlockerReason(postUpgradeController.blockers),
        status: postUpgradeController.postUpgradeReviewAutomated ? 'warn' : 'blocked',
      },
      {
        label: '评审输入校验',
        value: filledInputValidator.filledInputsValid
          ? 'specs/profile 评审输入已通过'
          : firstBlockerReason(filledInputValidator.blockers),
        status: filledInputValidator.filledInputsValid ? 'warn' : 'blocked',
      },
      {
        label: '证据Bootstrap',
        value: evidenceBootstrap.filledInputsValid
          ? 'filled 输入已通过'
          : firstBlockerReason(evidenceBootstrap.blockers),
        status: evidenceBootstrap.filledInputsValid ? 'warn' : 'blocked',
      },
      {
        label: '合约规格',
        value: executionSpecReady ? '已有可审查规格' : specBlockers[0]?.原因 || '等待导入',
        status: executionSpecReady ? 'warn' : 'blocked',
      },
      {
        label: '模拟表现',
        value: simulationQualified ? '达到模拟候选线' : firstBlockerReason(simulationProfile.blockers),
        status: simulationQualified ? 'warn' : 'blocked',
      },
    ].filter(visibleKeyValueRow),
    accountCryptoAvailabilityItems: [
      {
        label: '结论',
        value: accountCryptoAvailabilityStatus,
        hint: payload.nextRequiredActionZh || standaloneExporterNextAction,
        status: accountCryptoAvailabilityTone,
      },
      {
        label: 'MT5 账号',
        value: mt5Connected ? `${mt5Login} / ${mt5Server}` : 'MT5 快照未连上',
        hint: `${mt5Currency} / ${mt5FreshnessLine(mt5Freshness)}`,
        status: mt5SnapshotStale ? 'blocked' : mt5Connected ? 'ok' : 'blocked',
      },
      {
        label: 'Broker symbols',
        value: formatCount(brokerSymbolTotalAll),
        hint: '账号/服务器实际下发的全部 symbol 数',
        status: brokerDiagnosticsKnown ? 'ok' : 'warn',
      },
      {
        label: 'Market Watch symbols',
        value: formatCount(brokerSymbolTotalMarketWatch),
        hint: '当前 Market Watch 可见/已选 symbol 数',
        status: brokerDiagnosticsKnown ? 'ok' : 'warn',
      },
      {
        label: 'Crypto-like symbols',
        value: formatCount(brokerCryptoLikeCountAll),
        hint: '按 BTC/ETH/SOL 等 crypto token 与路径/描述匹配出的 HFM crypto CFD 数',
        status: brokerHasCrypto ? 'ok' : brokerDiagnosticsKnown ? 'blocked' : 'warn',
      },
      {
        label: 'Market Watch crypto-like',
        value: formatCount(brokerCryptoLikeCountMarketWatch),
        hint: '已选 symbol 里匹配到的 crypto CFD 数',
        status:
          Number(brokerCryptoLikeCountMarketWatch || 0) > 0
            ? 'ok'
            : brokerDiagnosticsKnown
              ? 'blocked'
              : 'warn',
      },
      {
        label: '样本数量',
        value: formatCount(brokerDiagnostics.brokerSymbolSampleCount ?? brokerSymbolSamples.length),
        hint: brokerSymbolSamples.length ? '下方表格展示账号下发 symbol 样本' : '没有 broker symbol 样本',
        status: brokerSymbolSamples.length ? 'ok' : 'warn',
      },
    ].filter(visibleKeyValueRow),
    operatorChecklistItems: operatorChecklistRaw.slice(0, 6).map((row) => ({
      label: row.labelZh || row.id || WAITING,
      value: row.statusZh || row.status || WAITING,
      hint: row.nextActionZh || row.reasonZh || WAITING,
      status: checklistTone(row),
    })),
    accountItems: [
      {
        label: 'MT5 快照',
        value: mt5SnapshotStale ? '快照过期' : mt5Snapshot.status || mt5Snapshot.bridgeStatus || WAITING,
        hint:
          mt5Freshness.nextActionZh ||
          mt5Freshness.nextAction ||
          mt5FreshnessLine(mt5Freshness) ||
          mt5Snapshot.source?.file ||
          'MT5 dashboard 新鲜度待确认',
        status: mt5SnapshotStale ? 'blocked' : mt5Snapshot.ok ? 'ok' : 'blocked',
      },
      {
        label: '服务器',
        value: mt5Account.server || mt5Runtime.server || WAITING,
        status: mt5Account.server || mt5Runtime.server ? 'ok' : 'blocked',
      },
      {
        label: '账户币种',
        value: mt5Account.currency || WAITING,
        status: mt5Account.currency ? 'ok' : 'blocked',
      },
      {
        label: 'Trade allowed',
        value: boolText(Boolean(mt5Account.tradeAllowed || mt5Runtime.tradeAllowed)),
        status: mt5Account.tradeAllowed || mt5Runtime.tradeAllowed ? 'ok' : 'blocked',
      },
      {
        label: 'Expert allowed',
        value: boolText(Boolean(mt5Account.tradeExpert || mt5Runtime.accountExpertTradeAllowed)),
        status: mt5Account.tradeExpert || mt5Runtime.accountExpertTradeAllowed ? 'ok' : 'blocked',
      },
      {
        label: '当前 EA Symbol',
        value: mt5Market.symbol || compactList(mt5SymbolItems.map((row) => row.name)),
        status: mt5Market.symbol || mt5SymbolItems.length ? 'ok' : 'blocked',
      },
      {
        label: 'Tick 年龄',
        value: mt5Runtime.tickAgeSeconds ?? mt5Snapshot.source?.ageSeconds ?? WAITING,
        hint: mt5FreshnessLine(mt5Freshness),
        status: mt5SnapshotStale ? 'blocked' : mt5Snapshot.snapshotFresh ? 'ok' : 'warn',
      },
      {
        label: 'Crypto exporter',
        value: cryptoExporterReady ? '规格证据已接通' : '等待 exporter 证据',
        hint: specsEvidenceReady
          ? sourceFileHint(payload, 'contractSpecExport')
          : mt5ExporterReview.installedMt5Ea?.sourcePath || mt5ExporterReview.nextRequiredActionZh || WAITING,
        status: cryptoExporterReady ? 'ok' : mt5ExporterReviewLoaded ? 'blocked' : 'warn',
      },
      {
        label: 'HFM Crypto CFD',
        value: accountCryptoAvailabilityStatus,
        hint: `broker symbols ${formatCount(brokerSymbolTotalAll)} / crypto-like ${formatCount(brokerCryptoLikeCountAll)}`,
        status: accountCryptoAvailabilityTone,
      },
    ],
    mossItems: payload.mossBacktestProfile?.profileFound
      ? [
          { label: 'Agent ID', value: moss.agentId || WAITING },
          { label: '策略名', value: moss.strategyName || WAITING },
          { label: 'ROI', value: formatPercent(moss.roiPct) },
          { label: 'Sharpe', value: moss.sharpe ?? WAITING },
          { label: '最大回撤', value: formatPercent(moss.maxDrawdownPct) },
          { label: '爆仓次数', value: moss.liquidationCount ?? WAITING },
          { label: '交易笔数', value: moss.tradeCount ?? WAITING },
          { label: '回测区间', value: moss.backtestDateRange || WAITING },
        ].filter(visibleKeyValueRow)
      : [
          {
            label: '资料状态',
            value: '未导入 Moss/backtest profile',
            hint: '可选：导入 ROI、Sharpe、最大回撤、交易笔数后再做跟随评审。',
            status: 'warn',
          },
        ],
    profitTargetItems: (profitTargetLoaded
      ? [
          {
            label: '合计模拟目标',
            value:
              profitTarget.dualTargetReached || simToLiveDecision.targetReached
                ? '已达成'
                : targetDecisionStatus,
            hint: targetExecutionConclusion,
            status: targetDecisionTone,
          },
          {
            label: 'Sim-to-live 决策',
            value: targetDecisionStatus,
            hint: executionGateHint(profitTarget, WAITING, releaseReadinessRefresh),
            status: targetDecisionTone,
          },
          {
            label: '实现工作包',
            value: implementationReadinessSummaryText(implementationReadiness),
            hint: implementationReadinessHint(implementationReadiness),
            status: implementationReadiness.disabledFirstImplementationWorkReady ? 'warn' : 'blocked',
          },
          {
            label: '数据面',
            value: boolText(Boolean(simToLiveDecision.dataPlaneReady)),
            hint: simToLiveDecision.executionModeOnlyBlocked
              ? 'HFM/BTC 数据、账号、dry-run 与预检已通过，只剩执行模式闸门'
              : '等待 profit-target tracker 回灌 sim-to-live decision',
            status: simToLiveDecision.dataPlaneReady ? 'ok' : 'warn',
          },
          {
            label: '执行模式闸门',
            value: gateSummary,
            hint: activationGateChecklistRows[0]?.原因 || WAITING,
            status: simToLiveDecision.allActivationGatesPassed ? 'ok' : 'blocked',
          },
          {
            label: 'MT5 orderSendAllowed',
            value: boolText(
              Boolean(simToLiveDecision.orderSendAllowed || simToLiveDecision.mt5OrderSendAllowed),
            ),
            hint: '这里必须保持否，直到另有已审查 execution lane',
            status: 'blocked',
          },
          {
            label: '写 MT5 request',
            value: boolText(Boolean(simToLiveDecision.writesMt5OrderRequest)),
            hint: '当前只展示禁用态合约和审查结果',
            status: 'blocked',
          },
          {
            label: 'Broker 调用',
            value: boolText(Boolean(simToLiveDecision.brokerCallsMade)),
            hint: '没有真实 broker order_send 调用',
            status: 'blocked',
          },
        ]
      : []
    ).filter(visibleKeyValueRow),
    safetyItems: [
      { label: '只读模式', value: boolText(safetyValue(safety, 'readOnly')), status: 'ok' },
      { label: 'Shadow-only', value: boolText(safetyValue(safety, 'shadowOnly')), status: 'ok' },
      { label: 'MT5 下单', value: boolText(safetyValue(safety, 'mt5OrderSendAllowed')), status: 'blocked' },
      { label: 'Moss 执行', value: boolText(safetyValue(safety, 'mossExecutionAllowed')), status: 'blocked' },
      {
        label: '钱包授权',
        value: boolText(safetyValue(safety, 'walletAuthorizationAllowed')),
        status: 'blocked',
      },
      {
        label: '实盘预设改写',
        value: boolText(safetyValue(safety, 'livePresetMutationAllowed')),
        status: 'blocked',
      },
      {
        label: 'Receipt写入',
        value: boolText(safetyValue(safety, 'receiptWritesAllowed')),
        status: 'blocked',
      },
      {
        label: '自动暂停改写',
        value: boolText(safetyValue(safety, 'autoDisableMutationAllowed')),
        status: 'blocked',
      },
      {
        label: 'EA读取Request',
        value: boolText(safetyValue(safety, 'eaRequestFilesRead')),
        status: 'blocked',
      },
    ].filter(visibleKeyValueRow),
    liveReadinessItems: [
      { label: '准入状态', value: live.statusZh || live.status || WAITING, status: statusTone(live.status) },
      ...(Object.keys(executionSummary).length
        ? [
            {
              label: '执行评审摘要',
              value: executionSummary.statusZh || executionSummary.status || WAITING,
              hint: executionSummaryHint,
              status: executionReviewSummaryTone(executionSummary),
            },
          ]
        : []),
      {
        label: '审查账号',
        value: runtimeScopeLabel(liveRuntimeScope),
        hint: runtimeScopeHint(liveRuntimeScope),
        status: liveRuntimeScope.accountLabel || liveRuntimeScope.scope ? 'ok' : 'warn',
      },
      ...(Object.keys(postTargetExecutionSummary).length
        ? [
            {
              label: '达标后执行摘要',
              value: postTargetExecutionSummary.statusZh || postTargetExecutionSummary.status || WAITING,
              hint:
                postTargetExecutionSummary.primaryActionableBlocker?.reasonZh ||
                compactList(postTargetExecutionSummary.blockedReleaseTokenCodes),
              status: postTargetExecutionSummary.canReleaseExecutionNow ? 'warn' : 'blocked',
            },
          ]
        : []),
      ...(Object.keys(releaseDiffReviewSummary).length
        ? [
            {
              label: '实盘释放计划',
              value: releaseDiffReviewSummary.statusZh || releaseDiffReviewSummary.status || WAITING,
              hint:
                releaseDiffReviewSummary.nextRequiredActionZh ||
                releaseDiffReviewSummary.nextSafeActionZh ||
                compactList(releaseDiffReviewSummary.forbiddenUntilSeparateReleaseReview),
              status: releaseDiffReviewSummary.canReleaseExecutionNow ? 'warn' : 'blocked',
            },
          ]
        : []),
      ...(Object.keys(releaseTokenEvidenceReview).length
        ? [
            {
              label: 'Release Token 证据',
              value: releaseTokenEvidenceReview.statusZh || releaseTokenEvidenceReview.status || WAITING,
              hint: releaseTokenEvidenceProgress(releaseTokenEvidenceReview),
              status: releaseTokenEvidenceReview.canReleaseExecutionNow ? 'warn' : 'blocked',
            },
          ]
        : []),
      ...(Object.keys(releaseTokenSignoffDraft).length
        ? [
            {
              label: 'Release Token 签收草案',
              value: releaseTokenSignoffDraft.statusZh || releaseTokenSignoffDraft.status || WAITING,
              hint: releaseTokenSignoffDraftProgress(releaseTokenSignoffDraft),
              status: releaseTokenSignoffDraft.canReleaseExecutionNow ? 'warn' : 'blocked',
            },
          ]
        : []),
      ...(Object.keys(releaseTokenSignoffInputTemplate).length
        ? [
            {
              label: 'Release Token 签收模板',
              value:
                releaseTokenSignoffInputTemplate.statusZh ||
                releaseTokenSignoffInputTemplate.status ||
                WAITING,
              hint: releaseTokenSignoffInputTemplateProgress(releaseTokenSignoffInputTemplate),
              status: releaseTokenSignoffInputTemplate.canReleaseExecutionNow ? 'warn' : 'blocked',
            },
          ]
        : []),
      ...(Object.keys(releaseTokenSignoffInputReview).length
        ? [
            {
              label: 'Release Token 签收输入',
              value:
                releaseTokenSignoffInputReview.statusZh || releaseTokenSignoffInputReview.status || WAITING,
              hint: releaseTokenSignoffInputProgress(releaseTokenSignoffInputReview),
              status: releaseTokenSignoffInputReview.canReleaseExecutionNow ? 'warn' : 'blocked',
            },
          ]
        : []),
      ...(Object.keys(releaseTokenSignoffHandoff).length
        ? [
            {
              label: 'Release Token 签收交接',
              value: releaseTokenSignoffHandoff.statusZh || releaseTokenSignoffHandoff.status || WAITING,
              hint: releaseTokenSignoffHandoffProgress(releaseTokenSignoffHandoff),
              status: releaseTokenSignoffHandoff.canReleaseExecutionNow ? 'warn' : 'blocked',
            },
          ]
        : []),
      ...(Object.keys(postTargetReleaseAudit).length
        ? [
            {
              label: 'Execution release 审计',
              value: postTargetReleaseAudit.statusZh || postTargetReleaseAudit.status || WAITING,
              hint:
                postTargetReleaseAudit.primaryActionableBlocker?.reasonZh ||
                compactList(postTargetReleaseAudit.blockedReleaseTokenCodes) ||
                compactList(postTargetReleaseAudit.executionModeBlockerCodes),
              status: postTargetReleaseAudit.canReleaseExecutionNow ? 'warn' : 'blocked',
            },
          ]
        : []),
      ...(Object.keys(authorizationBoundary).length
        ? [
            {
              label: '授权边界',
              value: authorizationBoundary.chatAuthorizationAcknowledged
                ? '聊天授权已记录，执行 release 未释放'
                : '等待授权边界证据',
              hint: authorizationBoundary.reasonZh || '聊天授权不能单独打开真实下单。',
              status: authorizationBoundary.canReleaseExecutionNow ? 'warn' : 'blocked',
            },
          ]
        : []),
      ...(profitTargetLoaded
        ? [
            { label: '合计目标决策', value: targetDecisionStatus, status: targetDecisionTone },
            {
              label: '执行闸门清单',
              value: gateSummary,
              hint: executionGateHint(
                profitTarget,
                'livePilotMode / readOnlyMode / executionEnabled / tradeAllowed',
                releaseReadinessRefresh,
              ),
              status: simToLiveDecision.allActivationGatesPassed ? 'ok' : 'blocked',
            },
          ]
        : []),
      {
        label: '可直接实盘',
        value: boolText(Boolean(live.canPromoteToLiveNow && liveExecutionAllowed)),
        hint: liveExecutionAllowed
          ? '执行闸门已开放'
          : executionSummary.statusZh || '当前仍保持 orderSendAllowed=false',
        status: live.canPromoteToLiveNow && liveExecutionAllowed ? 'ok' : 'blocked',
      },
      {
        label: 'HFM Crypto',
        value: hfmLive.accountNoCryptoSymbols
          ? hfmLiveAvailability.statusZh || '当前账号/服务器没有 crypto CFD symbols'
          : hfmLive.reviewCandidate && !liveExecutionAllowed
            ? '可评审，不能下单'
            : hfmLive.reviewCandidate
              ? '可进入执行审查'
              : '继续补证据',
        hint: hfmLive.accountNoCryptoSymbols
          ? hfmLiveAvailability.nextRequiredActionZh || firstBlockerReason(hfmLive.reviewBlockers)
          : hfmLive.reviewCandidate
            ? compactCodeList(
                hfmExecutionBlockers,
                hfmLiveAvailability.statusZh || 'HFM crypto CFD 证据链已进入评审候选',
              )
            : firstBlockerReason(hfmLive.reviewBlockers),
        status: hfmLive.reviewCandidate ? 'warn' : 'blocked',
      },
      {
        label: 'USDJPY MT5',
        value: usdLive.reviewCandidate ? '可进入执行审查' : '继续 mirror/验证',
        status: usdLive.reviewCandidate ? 'warn' : 'blocked',
      },
      {
        label: '主要缺口',
        value:
          review.nextRequiredActionZh ||
          executionSummary.nextRequiredActionZh ||
          compactCodeList(globalExecutionBlockers) ||
          firstBlockerReason(hfmLive.reviewBlockers) ||
          firstBlockerReason(live.globalBlockers),
        status: 'warn',
      },
      {
        label: '订单意图',
        value: `${dryRun.summary?.intentCount ?? 0} 个 dry-run intent`,
        status: 'blocked',
      },
      {
        label: '执行规格',
        value: executionLaneSpec.readyForImplementationReview ? '可进入实现评审' : '未达到实现评审',
        status: executionLaneSpec.readyForImplementationReview ? 'warn' : 'blocked',
      },
      {
        label: '实现工作包',
        value: implementationReadinessSummaryText(implementationReadiness),
        hint: implementationReadinessHint(implementationReadiness),
        status: implementationReadiness.disabledFirstImplementationWorkReady ? 'warn' : 'blocked',
      },
      {
        label: '回放审查',
        value: dryRunReplay.replayPassed ? '回放通过' : '等待回放',
        status: dryRunReplay.replayPassed ? 'warn' : 'blocked',
      },
      {
        label: '运行时预检',
        value: runtimePreflightSummary(runtimePreflight).value,
        status: runtimePreflightSummary(runtimePreflight).status,
      },
      {
        label: '请求合约',
        value: orderRequestContractSummary(orderRequestContract, runtimePreflight).value,
        status: orderRequestContractSummary(orderRequestContract, runtimePreflight).status,
      },
      {
        label: '流水线阶段',
        value: simToLivePipeline.autoStage || WAITING,
        hint: simToLivePipelineBlockerHint,
        status: simToLivePipeline.readyForSeparateExecutionAdapterReview ? 'warn' : 'blocked',
      },
      {
        label: 'Adapter评审',
        value: executionAdapterReview.readyForExecutionAdapterCodeReview
          ? '可评审'
          : firstBlockerReason(executionAdapterReview.blockers),
        status: executionAdapterReview.readyForExecutionAdapterCodeReview ? 'warn' : 'blocked',
      },
      {
        label: '证据接入',
        value: liveEvidenceIntake.statusZh || firstBlockerReason(liveEvidenceIntake.blockers),
        status: liveEvidenceIntake.status === 'HFM_REVIEW_INPUTS_PRESENT' ? 'warn' : 'blocked',
      },
      {
        label: '候选选择',
        value: livePromotionCandidates.readyForOperatorReviewPacket
          ? '可生成实盘评审包'
          : firstBlockerReason(livePromotionCandidates.blockers),
        status: livePromotionCandidates.readyForOperatorReviewPacket ? 'warn' : 'blocked',
      },
      {
        label: '自动晋级',
        value: livePromotionController.reviewAutomationRequested
          ? '审查包自动生成'
          : firstBlockerReason(livePromotionController.blockers),
        status: livePromotionController.reviewAutomationRequested ? 'warn' : 'blocked',
      },
      {
        label: 'Adapter沙盒',
        value: adapterSandbox.sandboxReadyForCodeReview
          ? '沙盒校验通过'
          : firstBlockerReason(adapterSandbox.blockers),
        status: adapterSandbox.sandboxReadyForCodeReview ? 'warn' : 'blocked',
      },
      {
        label: 'Adapter合同验证',
        value: adapterContractValidator.validationPassed
          ? 'request 合同验证通过'
          : firstBlockerReason(adapterContractValidator.blockers),
        status: adapterContractValidator.validationPassed ? 'warn' : 'blocked',
      },
      {
        label: '总控状态机',
        value: simToLiveOrchestrator.readyForLiveExecutionImplementationReview
          ? '可进入 live execution 实现评审'
          : simToLiveOrchestrator.currentLiveExecutionStageZh ||
            simToLiveOrchestrator.currentStageZh ||
            firstBlockerReason(simToLiveOrchestrator.blockers),
        status: simToLiveOrchestrator.readyForLiveExecutionImplementationReview ? 'warn' : 'blocked',
      },
      {
        label: 'Release Tokens',
        value:
          releaseReadinessRefresh.executionReleaseGateSummary?.statusZh ||
          simToLiveOrchestrator.executionReleaseGateSummary?.statusZh ||
          WAITING,
        hint: compactList(
          releaseReadinessRefresh.executionReleaseGateSummary?.blockerCodes ||
            simToLiveOrchestrator.executionReleaseGateSummary?.blockerCodes,
        ),
        status:
          releaseReadinessRefresh.canReleaseExecutionNow ||
          simToLiveOrchestrator.allExecutionReleaseTokensProvided
            ? 'warn'
            : 'blocked',
      },
      {
        label: 'Adapter Harness',
        value: executionAdapterHarness.readyForDisabledAdapterImplementationReview
          ? '禁用态 harness 可评审'
          : firstBlockerReason(executionAdapterHarness.blockers),
        status: executionAdapterHarness.readyForDisabledAdapterImplementationReview ? 'warn' : 'blocked',
      },
      {
        label: 'Live Pilot激活',
        value: livePilotActivationSummary.value,
        status: livePilotActivationSummary.status,
      },
      {
        label: 'Receipt对账',
        value: receiptReconciliationSummary.value,
        status: receiptReconciliationSummary.status,
      },
      {
        label: 'EA Request Reader',
        value: eaRequestReaderSummary.value,
        status: eaRequestReaderSummary.status,
      },
      {
        label: 'Live Cutover',
        value: liveCutoverSummary.value,
        status: liveCutoverSummary.status,
      },
      {
        label: 'Live实现规格',
        value: liveImplementationSummary.value,
        status: liveImplementationSummary.status,
      },
      {
        label: 'Adapter Writer',
        value: adapterWriterSummary.value,
        status: adapterWriterSummary.status,
      },
      {
        label: 'EA Request Consumption',
        value: eaConsumptionSummary.value,
        status: eaConsumptionSummary.status,
      },
      {
        label: 'Broker Order Send',
        value: brokerOrderSendSummary.value,
        status: brokerOrderSendSummary.status,
      },
      {
        label: '人工审批',
        value: approvalEvidence.operatorApprovalProvided ? '审批证据已验收' : '未提交审批证据',
        status: 'blocked',
      },
    ].filter(visibleKeyValueRow),
    tables: {
      mt5FreshnessRows: mt5FreshnessRows(mt5Freshness, mt5Snapshot),
      findings,
      symbolEvidenceSources,
      operatorChecklist,
      brokerSymbolSamples,
      candidates,
      blockers,
      specExportRows: executionSpecRows({ reviewedRows: contractSpecExport.symbols }),
      specRows,
      specBlockers,
      evidenceInputs,
      promotionCandidates,
      promotionControllerRuns,
      adapterSandboxValidations,
      adapterContractValidations,
      simToLivePipelineBlockerRows: simToLivePipelineBlockerRowsData,
      simToLiveOrchestratorStages,
      executionReleaseGateRows: executionReleaseGateRowsData,
      releaseMinimalDiffChanges,
      releaseMinimalDiffTokens,
      releaseTokenEvidence,
      releaseTokenSignoffDraftRows: releaseTokenSignoffDraftRowsData,
      releaseTokenSignoffInputTemplateRows: releaseTokenSignoffInputTemplateRowsData,
      releaseTokenSignoffInputRows: releaseTokenSignoffInputRowsData,
      releaseTokenSignoffHandoffRows: releaseTokenSignoffHandoffRowsData,
      executionReviewSummaryBlockers: executionSummaryBlockerRows,
      executionAdapterHarnessPlans,
      livePilotActivationChecks,
      livePilotPresetActivationRows: livePilotPresetActivationRowsData,
      livePilotPresetCandidateRows: livePilotPresetCandidateRowsData,
      livePilotCandidateFileRows: livePilotCandidateFileRowsData,
      receiptReconciliationRows: receiptReconciliationRowsData,
      eaRequestReaderRows: eaRequestReaderRowsData,
      liveExecutionCutoverRows: liveExecutionCutoverRowsData,
      liveExecutionImplementationRows: liveExecutionImplementationRowsData,
      liveExecutionSafetyTraceabilityRows: liveExecutionSafetyTraceabilityRowsData,
      livePilotGateTransitionRows: livePilotGateTransitionRowsData,
      liveExecutionAdapterWriteRows: liveExecutionAdapterWriteRowsData,
      eaRequestConsumptionRows: eaRequestConsumptionRowsData,
      brokerOrderSendRows: brokerOrderSendRowsData,
      profitTargetLanes: profitTargetLaneRowsData,
      activationGateChecklist: activationGateChecklistRows,
      mt5ExporterMarkers,
      mt5UpgradeBundleSteps,
      mt5ExporterDeployPlanSteps,
      standaloneExporterBundleSteps,
      mt5PostUpgradeChecks,
      postUpgradeControllerRuns,
      filledInputFiles,
      filledInputChecks,
      evidenceBootstrapDrafts,
    },
    rawPayload: payload,
  };
}
