import { formatDisplayValue, humanizeStatus } from '../../utils/displayText.js';

const FOCUS_SYMBOL = 'USDJPYc';
const NON_FOCUS_SYMBOL_RE = /\b(EURUSD|EURUSDc|XAUUSD|XAUUSDc)\b/i;

const PATH_SETS = {
  runtimeState: [
    'latest.runtime_state',
    'latest.state',
    'state.runtime_state',
    'state.status',
    'state.data.runtime_state',
    'state.data.status',
  ],
  updatedAt: [
    'latest.timestamp',
    'latest.updated_at',
    'latest._file.mtimeIso',
    'latest._freshness.checkedAtIso',
    'state.timestamp',
    'state.updated_at',
    'state.source.mtimeIso',
    'state._freshness.checkedAtIso',
    'state.data._file.mtimeIso',
    'state.data.timestamp',
    'state.data.updated_at',
  ],
  killSwitch: [
    'latest.kill_switch',
    'latest.killSwitch',
    'state.kill_switch',
    'state.killSwitch',
    'state.data.kill_switch',
    'state.data.killSwitch',
  ],
  dryRun: [
    'latest.dry_run',
    'latest.dryRun',
    'state.dry_run',
    'state.dryRun',
    'state.data.dry_run',
    'state.data.dryRun',
  ],
  activeRoute: [
    'latest.active_route',
    'latest.route',
    'state.active_route',
    'state.route',
    'state.data.active_route',
    'state.data.route',
  ],
  dailyPnl: [
    'latest.daily_pnl',
    'latest.pnl.daily',
    'state.daily_pnl',
    'state.pnl.daily',
    'state.data.daily_pnl',
    'state.data.pnl.daily',
  ],
};

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function getPath(source, path) {
  return String(path)
    .split('.')
    .reduce((cursor, part) => (cursor == null ? undefined : cursor[part]), source);
}

function firstValue(source, paths, fallback = null) {
  for (const path of paths) {
    const value = getPath(source, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data?.rows)) return value.data.rows;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function present(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== '';
}

function endpointUnavailable(payload) {
  return isObject(payload) && payload.ok === false;
}

function endpointAvailable(payload) {
  return present(payload) && !endpointUnavailable(payload);
}

function endpointUnavailableDescription(payload, fallback) {
  if (!endpointUnavailable(payload)) return fallback;
  const error = payload.error;
  if (typeof error === 'string' && error.trim()) return error;
  if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  if (typeof payload.statusZh === 'string' && payload.statusZh.trim()) return payload.statusZh;
  if (typeof payload.status === 'string' && payload.status.trim()) return humanizeStatus(payload.status);
  return '后端返回 ok=false，当前证据不可用。';
}

function latestFreshness(raw = {}) {
  const freshness =
    raw?.latest?._freshness ||
    raw?.state?._freshness ||
    raw?.state?.data?._freshness ||
    raw?._freshness ||
    {};
  if (!isObject(freshness) || !present(freshness)) return {};
  const latestSource = isObject(raw?.latest?.source) ? raw.latest.source : {};
  const stateSource = isObject(raw?.state?.source) ? raw.state.source : {};
  return {
    ...freshness,
    sourceFile: freshness.sourceFile || latestSource.file || stateSource.filePath || stateSource.file || '',
    mtimeIso: freshness.mtimeIso || latestSource.mtimeIso || stateSource.mtimeIso || '',
  };
}

function latestFreshnessLine(freshness = {}) {
  if (!present(freshness)) return '';
  const ageSeconds = Number(freshness.ageSeconds);
  const ageText = Number.isFinite(ageSeconds) ? `${Math.round(ageSeconds)}s` : '未知时长';
  return (
    freshness.statusZh ||
    freshness.nextActionZh ||
    (freshness.stale ? `MT5 dashboard 已过期 ${ageText}` : 'MT5 dashboard 新鲜')
  );
}

function formatFreshnessAgeSeconds(value) {
  const ageSeconds = Number(value);
  if (!Number.isFinite(ageSeconds)) return '待确认';
  if (ageSeconds < 60) return `${Math.round(ageSeconds)} 秒`;
  if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)} 分钟`;
  if (ageSeconds < 86400) return `${(ageSeconds / 3600).toFixed(1)} 小时`;
  return `${(ageSeconds / 86400).toFixed(1)} 天`;
}

function dashboardFreshnessHint(snapshot = {}) {
  return (
    snapshot.latestFreshnessLine ||
    snapshot.latestFreshness?.nextActionZh ||
    '按 /api/latest dashboard mtime 判定'
  );
}

function readonlyFreshness(payload = {}) {
  if (!isObject(payload)) return {};
  if (isObject(payload._freshness) && present(payload._freshness)) {
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
        (stale ? '恢复对应 MT5/EA 进程并刷新 QuantGod_Dashboard.json；不要把旧快照当成当前实盘状态。' : ''),
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
    mode: 'MT5_READONLY_EA_SNAPSHOT_MTIME_WATCH',
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
    blockers: stale ? ['live_dashboard_snapshot_stale'] : [],
    nextActionZh: stale
      ? '恢复对应 MT5/EA 进程并刷新 QuantGod_Dashboard.json；不要把旧快照当成当前实盘状态。'
      : '',
  };
}

function freshnessStatusValue(freshness = {}) {
  if (freshness.stale === true || freshness.status === 'STALE_EA_SNAPSHOT') return '快照过期';
  if (freshness.status === 'STALE_DASHBOARD_SNAPSHOT') return '快照过期';
  if (freshness.fresh === true) return '新鲜';
  return '待确认';
}

function freshnessRow(label, endpoint, freshness = {}, fallbackAction = '') {
  const stale =
    freshness.stale === true ||
    freshness.status === 'STALE_DASHBOARD_SNAPSHOT' ||
    freshness.status === 'STALE_EA_SNAPSHOT';
  const fresh = freshness.fresh === true;
  return {
    数据源: label,
    端点: endpoint,
    状态: freshnessStatusValue(freshness),
    年龄: formatFreshnessAgeSeconds(freshness.ageSeconds),
    阈值: formatFreshnessAgeSeconds(freshness.maxAgeSeconds),
    源文件: freshness.sourceFile || freshness.mtimeIso || '等待源文件',
    动作:
      freshness.nextActionZh ||
      freshness.nextAction ||
      fallbackAction ||
      (stale
        ? '恢复对应 MT5/EA dashboard writer 后再把账户、持仓或执行状态当成当前值。'
        : fresh
          ? '数据源新鲜，可以继续只读观察。'
          : '等待后端返回新鲜度证据。'),
  };
}

function processAwareFreshnessRow(label, endpoint, freshness = {}, processMissing = false, fallbackAction = '') {
  const row = freshnessRow(label, endpoint, freshness, fallbackAction);
  if (!processMissing) return row;
  return {
    ...row,
    状态: 'writer 未运行',
    动作:
      fallbackAction ||
      '未检测到对应 terminal64/wine 进程；先恢复 MT5 终端和 EA dashboard writer，再读取当前账号状态。',
  };
}

function freshnessIsStale(freshness = {}) {
  return (
    freshness.stale === true ||
    freshness.status === 'STALE_DASHBOARD_SNAPSHOT' ||
    freshness.status === 'STALE_EA_SNAPSHOT'
  );
}

function hostProcess(payload = {}) {
  const terminal = isObject(payload.terminal) ? payload.terminal : {};
  const process = isObject(payload.hostProcess) ? payload.hostProcess : {};
  return {
    status: process.status || terminal.hostProcessStatus || '',
    terminalProcessDetected:
      process.terminalProcessDetected ??
      terminal.hostProcessDetected ??
      terminal.terminalProcessDetected ??
      null,
    targetProcessDetected:
      process.targetProcessDetected ??
      terminal.targetHostProcessDetected ??
      terminal.targetProcessDetected ??
      null,
    matchingProcessCount: numberValue(process.matchingProcessCount, null),
  };
}

function hostProcessMissing(payload = {}) {
  const process = hostProcess(payload);
  return process.terminalProcessDetected === false || String(process.status).toUpperCase() === 'MISSING';
}

function hostProcessLine(payload = {}) {
  const process = hostProcess(payload);
  if (process.terminalProcessDetected === true) {
    const count = process.matchingProcessCount === null ? '' : ` ${process.matchingProcessCount} 个`;
    return `检测到 MT5/Wine 进程${count}`;
  }
  if (process.terminalProcessDetected === false || String(process.status).toUpperCase() === 'MISSING') {
    return '未检测到 terminal64/wine 进程';
  }
  if (process.status) return humanizeStatus(process.status);
  return '进程状态待确认';
}

function liveLoopFreshness(payload = {}) {
  if (!isObject(payload) || !present(payload)) return {};
  const runtime = isObject(payload.runtime) ? payload.runtime : {};
  const tier = String(runtime.freshnessTier || payload.runtimeFreshnessTier || '').toUpperCase();
  const ready = payload.runtimeReady === true || runtime.ready === true;
  const sourceFile = runtime.source || payload.source?.file || payload.sourceFile || '';
  const ageSeconds = numberValue(
    runtime.ageSeconds ?? payload.runtimeAgeSeconds ?? runtime.runtimeAgeSeconds,
    null,
  );
  const reasons = toArray(runtime.reasons || payload.runtimeReasons)
    .map((item) => String(item))
    .filter(Boolean);
  const hardStale = tier === 'HARD_STALE';
  const softStale = tier === 'SOFT_STALE';
  const fresh = tier === 'FRESH';
  const stale = hardStale || softStale;
  const statusZh = hardStale
    ? 'USDJPY live-loop 依赖的运行快照严重过期'
    : softStale
      ? 'USDJPY live-loop 依赖的运行快照轻微陈旧'
      : fresh
        ? 'USDJPY live-loop 运行快照新鲜'
        : payload.stateZh ||
          payload.statusZh ||
          humanizeStatus(payload.state || payload.status, '等待 live-loop');
  const nextActionZh = hardStale
    ? '恢复 MT5/EA dashboard writer，让 runtime snapshot 重新写入；live-loop 在此之前只能作为旧证据诊断。'
    : softStale
      ? '只允许只读观察或降级复核，等待下一次 MT5 runtime snapshot 刷新。'
      : payload.nextRequiredActionZh || toArray(payload.nextActions)[0]?.summaryZh || '';
  return {
    status: tier || (ready ? 'READY' : payload.state || payload.status || ''),
    statusZh,
    fresh,
    stale,
    hardStale,
    softStale,
    ready,
    ageSeconds,
    maxAgeSeconds: hardStale || softStale ? 90 : undefined,
    sourceFile,
    reasons,
    reasonLine: reasons.join('；') || payload.stateZh || '',
    nextActionZh,
  };
}

function liveLoopStatusValue(freshness = {}) {
  if (freshness.hardStale) return '严重过期';
  if (freshness.softStale) return '轻微陈旧';
  if (freshness.fresh) return '新鲜';
  if (freshness.ready) return '就绪';
  if (freshness.statusZh) return freshness.statusZh;
  return '待确认';
}

function snapshotRecovery(raw = {}) {
  const latest = latestFreshness(raw);
  const primary = readonlyFreshness(raw.mt5Snapshot);
  const secondary = readonlyFreshness(raw.secondaryMt5Snapshot);
  const liveLoop = liveLoopFreshness(raw.usdJpyLiveLoop);
  const staleLatest = freshnessIsStale(latest);
  const stalePrimary = freshnessIsStale(primary);
  const staleSecondary = freshnessIsStale(secondary);
  const staleLiveLoop = liveLoop.hardStale === true;
  const primaryProcessMissing = hostProcessMissing(raw.mt5Snapshot);
  const secondaryProcessMissing = hostProcessMissing(raw.secondaryMt5Snapshot);
  const staleSources = [
    staleLatest ? '总览 MT5 dashboard' : '',
    stalePrimary ? '主账号只读桥' : '',
    staleSecondary ? 'Live16 只读桥' : '',
    staleLiveLoop ? 'USDJPY live-loop' : '',
  ].filter(Boolean);
  const hfmCryptoReady = endpointAvailable(raw.hfmCrypto);
  const hfmStatus = raw.hfmCrypto?.statusZh || humanizeStatus(raw.hfmCrypto?.status, '等待 HFM Crypto CFD');
  const hfmEvidenceCount = hfmCryptoEvidenceSymbolCount(raw);
  const hfmLine = hfmCryptoReady
    ? `${hfmStatus}${hfmEvidenceCount ? ` / ${hfmEvidenceCount} 条 crypto/spec 证据` : ''}`
    : '等待 HFM Crypto shadow 证据';
  const profitTargetReady = endpointAvailable(raw.profitTarget);
  const processMissing = primaryProcessMissing || secondaryProcessMissing;
  const status = processMissing ? 'blocked' : staleSources.length ? 'warn' : 'ok';
  const label = processMissing
    ? 'MT5/EA dashboard writer 未运行'
    : staleSources.length
      ? '实时快照过期'
      : '实时快照新鲜';
  const nextAction = processMissing
    ? '先恢复对应 MT5 终端和 EA dashboard writer，让 QuantGod_Dashboard.json 重新写入；恢复前不要把账户、持仓或执行状态当成当前实盘。'
    : staleSources.length
      ? latest.nextActionZh ||
        primary.nextActionZh ||
        primary.nextAction ||
        secondary.nextActionZh ||
        secondary.nextAction ||
        '刷新 MT5/EA dashboard writer 后再读取实时账户状态。'
      : '运行快照可用于只读观察。';
  return {
    status,
    label,
    staleSources,
    processMissing,
    primaryProcessLine: hostProcessLine(raw.mt5Snapshot),
    secondaryProcessLine: hostProcessLine(raw.secondaryMt5Snapshot),
    realtimeUsable: !staleSources.length && !processMissing,
    liveLoopUsable: Boolean(liveLoop.ready) && !liveLoop.hardStale,
    liveLoopLine: liveLoop.statusZh || '等待 USDJPY live-loop 证据',
    liveLoopNextAction: liveLoop.nextActionZh,
    liveLoopFreshness: liveLoop,
    hfmShadowUsable: hfmCryptoReady,
    hfmLine,
    profitTargetLine: profitTargetReady
      ? profitTargetLine(raw) || profitTargetStatusLabel(raw)
      : '等待合计目标证据',
    nextAction,
  };
}

function boolStatus(value, truthyLabel = 'active', falseLabel = 'inactive') {
  if (value === true || value === 'true' || value === '1' || value === 1 || value === 'ACTIVE')
    return truthyLabel;
  if (value === false || value === 'false' || value === '0' || value === 0 || value === 'INACTIVE')
    return falseLabel;
  return 'unknown';
}

function formatCompact(value) {
  return formatDisplayValue(value);
}

function boolText(value) {
  return value ? '是' : '否';
}

function numberValue(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatMoney(value, currency = 'USC') {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${numeric.toFixed(2)} ${currency || 'USC'}`;
}

function staleDashboardAccountMetric(snapshot, value, currency, label) {
  const formatted = value === null ? '—' : formatMoney(value, currency);
  if (!snapshot.latestDashboardStale) {
    return { value: formatted };
  }
  const processMissing = snapshot.snapshotRecovery?.processMissing === true;
  const freshnessHint = processMissing
    ? snapshot.snapshotRecovery?.nextAction || dashboardFreshnessHint(snapshot)
    : dashboardFreshnessHint(snapshot);
  const historicalHint = formatted === '—' ? '' : `历史${label}: ${formatted}，仅作参考`;
  return {
    value: processMissing ? '不可确认' : '快照过期',
    hint: [freshnessHint, historicalHint].filter(Boolean).join('；'),
    status: processMissing ? 'blocked' : 'warn',
  };
}

function mt5BridgeValue({ stale, fresh, processMissing }) {
  if (processMissing) return 'writer 未运行';
  if (stale) return '快照过期';
  if (fresh) return '新鲜';
  return '待确认';
}

function mt5BridgeStatus({ stale, fresh, processMissing }) {
  if (processMissing) return 'blocked';
  if (stale) return 'warn';
  if (fresh) return 'ok';
  return 'warn';
}

function mt5BridgeHint({ line, freshness = {}, processLine = '', processMissing = false, fallback = '' }) {
  if (processMissing) {
    return [
      processLine || '未检测到 terminal64/wine 进程',
      freshness.nextActionZh || freshness.nextAction || fallback,
    ]
      .filter(Boolean)
      .join('；');
  }
  return line || freshness.sourceFile || fallback;
}

function formatIsoMinute(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('zh-CN', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTopicCounts(counts) {
  if (!counts || typeof counts !== 'object') return '—';
  const entries = Object.entries(counts)
    .filter(([, count]) => Number(count || 0) > 0)
    .sort(([left], [right]) => String(left).localeCompare(String(right)));
  if (!entries.length) return '—';
  return entries
    .slice(0, 3)
    .map(([topic, count]) => `${topicLabel(topic)} ${count}`)
    .join(' / ');
}

function topicLabel(topic) {
  const mapping = {
    DAILY_AUTOPILOT_V2_REPORT: '日报',
    GA_EVOLUTION_REPORT: 'GA',
    USDJPY_AUTONOMOUS_AGENT_REPORT: 'Agent',
    HFM_CRYPTO_CFD_REPORT: 'HFM Crypto',
  };
  return mapping[topic] || String(topic || '未知');
}

function deliveryReasonLabel(reason) {
  const mapping = {
    duplicate_suppressed: '重复去重',
    rate_limited: '限频抑制',
    send_not_requested: '只生成未发送',
    'QG_TELEGRAM_PUSH_ALLOWED is not 1': '推送未开启',
    'Telegram token/chat_id missing': '缺少 Telegram 配置',
  };
  return mapping[reason] || reason || '—';
}

function rowsFromObjectList(value) {
  return toArray(value).filter((row) => row && typeof row === 'object');
}

function jstTodayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function dateKey(value) {
  if (!value) return '';
  const text = String(value).trim();
  const match = text.match(/(\d{4})[./-](\d{2})[./-](\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(parsed));
}

function dailyReviewDateKeys(payload = {}) {
  return [
    payload.generatedAtIso,
    payload.generatedAt,
    payload.timestamp,
    payload.summary?.dailyReviewGeneratedAtIso,
    payload.summary?.generatedAtIso,
    payload.dailyPnl?.date,
    payload.summary?.dailyReviewDateJst,
  ]
    .map(dateKey)
    .filter(Boolean);
}

function dailyReviewIsFresh(payload = {}) {
  if (!present(payload)) return true;
  const keys = dailyReviewDateKeys(payload);
  if (!keys.length) return true;
  return keys.includes(jstTodayKey());
}

function rowSymbol(row = {}) {
  return (
    row.Symbol ||
    row.symbol ||
    row.BrokerSymbol ||
    row.brokerSymbol ||
    row.CanonicalSymbol ||
    row.canonicalSymbol ||
    ''
  );
}

function normalizeSymbol(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function focusSymbolRoot() {
  return normalizeSymbol(FOCUS_SYMBOL).replace(/C$/, '');
}

function rowMentionsNonFocusSymbol(row = {}) {
  const text = [
    row.candidateId,
    row.candidateVersionId,
    row.presetName,
    row.reportPath,
    row.existingReportPath,
    row.reportPathHint,
    row.testerOnlyCommand,
    row.configOnlyCommand,
    row.task,
    row.title,
    row.summary,
    row.detail,
  ]
    .filter(Boolean)
    .join(' ');
  return NON_FOCUS_SYMBOL_RE.test(text);
}

function isFocusOrUnscopedRow(row) {
  if (!isObject(row)) return false;
  const symbol = rowSymbol(row);
  if (symbol) return normalizeSymbol(symbol).startsWith(focusSymbolRoot());
  return !rowMentionsNonFocusSymbol(row);
}

function focusScopedRows(rows) {
  return rowsFromObjectList(rows).filter(isFocusOrUnscopedRow);
}

function dailySummary(raw) {
  if (dailyReviewIsFresh(raw?.dailyReview))
    return raw?.dailyReview?.summary || raw?.dailyAutopilot?.dailyReviewSummary || {};
  return raw?.dailyAutopilot?.dailyReviewSummary || {};
}

function dailyPnl(raw) {
  return dailyReviewIsFresh(raw?.dailyReview) ? raw?.dailyReview?.dailyPnl || {} : {};
}

function historyProductionStatus(raw = {}) {
  const freshnessReview = historyFreshnessPromotionReview(raw);
  const candidates = [
    raw?.dailyAutopilotV2?.historyProductionStatus,
    raw?.dailyAutopilotV2?.gaReview?.historyProductionStatus,
    raw?.dailyAutopilotV2?.dailyTodo?.historyProductionStatus,
    raw?.dailyAutopilotV2?.dailyReview?.historyProductionStatus,
    raw?.dailyAutopilot?.historyProductionStatus,
    raw?.dailyAutopilot?.gaReview?.historyProductionStatus,
    raw?.backtest?.historyProductionStatus,
    raw?.backtest?.qualityReport?.historyProductionStatus,
    raw?.backtest?.data?.historyProductionStatus,
    raw?.state?.historyProductionStatus,
  ];
  const production = candidates.find((candidate) => isObject(candidate)) || {};
  if (!present(freshnessReview)) return production;

  const blocksPromotion = historyFreshnessBlocksPromotion(freshnessReview);
  const reviewStatus = String(freshnessReview.status || '').toUpperCase();
  const reviewPass = !blocksPromotion && reviewStatus === 'HISTORY_FRESHNESS_PASS';
  const blockers = [
    ...toArray(production.blockers),
    ...toArray(freshnessReview.blockers),
  ].filter(Boolean);
  return {
    ...production,
    promotionGateStatus: blocksPromotion
      ? 'BLOCKED'
      : production.promotionGateStatus || (reviewPass ? 'PASS' : undefined),
    status:
      production.status ||
      (blocksPromotion
        ? 'WARN'
        : reviewPass
          ? 'PASS'
          : freshnessReview.status),
    statusZh:
      blocksPromotion
        ? '历史 freshness 阻断晋级'
        : production.statusZh || (reviewPass ? '历史 freshness 已通过' : undefined),
    reasonZh: freshnessReview.reasonZh || production.reasonZh,
    blockers,
    historyFreshnessStatus: freshnessReview.status,
    historyFreshnessBlocksPromotion: blocksPromotion,
    historyFreshnessReview: freshnessReview,
    failedTimeframes: toArray(freshnessReview.failedTimeframes),
    staleTimeframes: toArray(freshnessReview.staleTimeframes),
    latestLagHoursByTimeframe: freshnessReview.latestLagHoursByTimeframe || {},
  };
}

function historyFreshnessPromotionReview(raw = {}) {
  const candidates = [
    raw?.championPromotionGate?.historyFreshnessPromotionReview,
    raw?.championPromotionGate?.historyFreshnessReview,
    raw?.dailyAutopilotV2?.championPromotionGate?.historyFreshnessPromotionReview,
    raw?.dailyAutopilot?.championPromotionGate?.historyFreshnessPromotionReview,
    raw?.backtest?.historyFreshnessPromotionReview,
    raw?.backtest?.historyFreshnessGate,
    raw?.backtest?.runtimeDataset?.latest?.historyFreshnessGate,
    raw?.backtest?.data?.runtimeDataset?.latest?.historyFreshnessGate,
    raw?.state?.historyFreshnessPromotionReview,
    raw?.state?.historyFreshnessGate,
    raw?.state?.data?.historyFreshnessGate,
  ];
  return candidates.find((candidate) => isObject(candidate)) || {};
}

function historyFreshnessBlocksPromotion(review = {}) {
  if (!present(review)) return false;
  const status = String(review.status || '').toUpperCase();
  return Boolean(
    review.blocksLivePromotion === true ||
      review.passed === false ||
      status === 'HISTORY_FRESHNESS_BLOCKED' ||
      status === 'HISTORY_PRODUCTION_STATUS_MISSING' ||
      status === 'BLOCKED' ||
      toArray(review.blockers).length > 0,
  );
}

function latestAccount(raw) {
  return raw?.latest?.account || raw?.mt5Snapshot?.account || {};
}

function mt5Positions(raw) {
  const direct = rowsFromObjectList(raw?.latest?.openTrades);
  if (direct.length) return direct;
  return rowsFromObjectList(raw?.mt5Snapshot?.positions);
}

function hfmCryptoRows(raw) {
  const hfmCrypto = raw?.hfmCrypto || {};
  const findings = rowsFromObjectList(raw?.hfmCrypto?.localEvidence?.findings);
  if (findings.length) return findings;
  const candidates = rowsFromObjectList(raw?.hfmCrypto?.brokerSymbolCandidates);
  if (candidates.length) return candidates;
  const diagnostics = hfmCryptoDiagnostics(raw);
  if (!present(diagnostics)) return [];
  return [
    {
      code: hfmCrypto.blockers?.[0]?.code || hfmCrypto.status || 'HFM_CRYPTO_ACCOUNT_SCAN',
      status: hfmCrypto.statusZh || hfmCrypto.status || '账号 symbol 探测',
      reasonZh:
        hfmCrypto.blockers?.[0]?.reasonZh ||
        hfmCrypto.nextRequiredActionZh ||
        '等待 HFM crypto CFD symbol 证据。',
      brokerSymbolTotalAll: diagnostics.brokerSymbolTotalAll ?? 0,
      brokerSymbolTotalMarketWatch: diagnostics.brokerSymbolTotalMarketWatch ?? 0,
      brokerCryptoLikeCountAll: diagnostics.brokerCryptoLikeCountAll ?? 0,
      brokerCryptoLikeCountMarketWatch: diagnostics.brokerCryptoLikeCountMarketWatch ?? 0,
      compactView: Boolean(hfmCrypto.compactView),
    },
  ];
}

function hfmCryptoDiagnostics(raw) {
  const hfmCrypto = raw?.hfmCrypto || {};
  return (
    hfmCrypto?.symbolEvidence?.brokerSymbolDiagnostics ||
    hfmCrypto?.brokerSymbolDiagnostics ||
    hfmCrypto?.localEvidence?.brokerSymbolDiagnostics ||
    {}
  );
}

function hfmCryptoEvidenceSymbolCount(raw = {}) {
  const hfmCrypto = raw?.hfmCrypto || {};
  const symbolEvidence = hfmCrypto.symbolEvidence || {};
  return Math.max(
    toArray(symbolEvidence.canonicalSymbols).length,
    toArray(symbolEvidence.brokerSymbols).length,
    toArray(hfmCrypto.brokerSymbolCandidates).length,
    toArray(hfmCrypto.localEvidence?.findings).length,
  );
}

function hfmCryptoCountLine(diagnostics = {}) {
  const total = numberValue(diagnostics.brokerSymbolTotalAll, null);
  const marketWatch = numberValue(diagnostics.brokerSymbolTotalMarketWatch, null);
  const cryptoLike = numberValue(diagnostics.brokerCryptoLikeCountAll, null);
  if (total === null && cryptoLike === null) return '';
  return `${cryptoLike ?? 0} crypto / ${total ?? 0} broker / ${marketWatch ?? 0} Market Watch`;
}

function hfmCryptoSummaryLine(raw = {}) {
  const diagnostics = hfmCryptoDiagnostics(raw);
  const diagnosticLine = hfmCryptoCountLine(diagnostics);
  const cryptoLike = numberValue(diagnostics.brokerCryptoLikeCountAll, null);
  const evidenceCount = hfmCryptoEvidenceSymbolCount(raw);
  const symbolEvidenceFound = Boolean(raw?.hfmCrypto?.symbolEvidence?.found);
  if ((cryptoLike === null || cryptoLike === 0) && symbolEvidenceFound && evidenceCount > 0) {
    const total = numberValue(diagnostics.brokerSymbolTotalAll, 0);
    const marketWatch = numberValue(diagnostics.brokerSymbolTotalMarketWatch, 0);
    return `${evidenceCount} specs crypto / ${total} broker / ${marketWatch} Market Watch`;
  }
  return diagnosticLine;
}

function hfmCryptoRuntimeProbeLine(raw = {}) {
  const bundle = raw?.hfmCrypto?.standaloneExporterBundle || {};
  if (!present(bundle)) return '';
  if (bundle.runtimeProbeTickDetected)
    return `${bundle.startupSymbol || '#BTCUSD'} runtime probe 已输出实时 tick`;
  if (bundle.runtimeProbeMissingAfterSpecs) {
    const symbol = bundle.startupSymbol || '#BTCUSD';
    const status = bundle.statusZh || bundle.status || '等待 runtime probe';
    const reason =
      bundle.targetExpertInstalledMatchesBundle === false
        ? '当前 MT5 Experts 里的 exporter EA 不是最新版'
        : status;
    return `${symbol} runtime probe 缺失：${reason}`;
  }
  return bundle.statusZh || bundle.status || '';
}

function profitTargetPayload(raw = {}) {
  return raw?.profitTarget || {};
}

function liveExecutionReviewPayload(raw = {}) {
  return profitTargetPayload(raw)?.liveExecutionReview || {};
}

function simToLiveDecisionPayload(raw = {}) {
  return profitTargetPayload(raw)?.simToLiveDecision || {};
}

function authorizationVsExecutionPayload(raw = {}) {
  return simToLiveDecisionPayload(raw)?.authorizationVsExecution || {};
}

function liveAutomationOrchestratorPayload(raw = {}) {
  return raw?.liveAutomationOrchestrator || raw?.simToLiveOrchestrator || {};
}

function liveAutomationReleaseReadinessPayload(raw = {}) {
  return raw?.liveAutomationReleaseReadiness || raw?.releaseReadinessRefresh || {};
}

function releaseTokenEvidencePayload(raw = {}) {
  return raw?.releaseTokenEvidenceReview || {};
}

function releaseTokenSignoffDraftPayload(raw = {}) {
  return raw?.releaseTokenSignoffDraft || {};
}

function releaseTokenSignoffInputTemplatePayload(raw = {}) {
  return raw?.releaseTokenSignoffInputTemplate || {};
}

function releaseTokenSignoffInputReviewPayload(raw = {}) {
  return raw?.releaseTokenSignoffInputReview || {};
}

function releaseTokenSignoffHandoffPayload(raw = {}) {
  return raw?.releaseTokenSignoffHandoff || {};
}

function liveExecutionLaneSelectorPayload(raw = {}) {
  return raw?.liveExecutionLaneSelector || raw?.laneSelector || {};
}

function forexLive12RuntimeHandoffPayload(raw = {}) {
  return raw?.forexLive12RuntimeHandoff || {};
}

function forexLive12CapacityExpansionReviewPayload(raw = {}) {
  return raw?.forexLive12CapacityExpansionReview || {};
}

function forexLive12CapacityExpansionRoadmapPayload(raw = {}) {
  return raw?.forexLive12CapacityExpansionRoadmap || {};
}

function forexLive12MicroExpansionReviewPayload(raw = {}) {
  return raw?.forexLive12MicroExpansionReview || {};
}

function forexLive12RsiRepairPlanPayload(raw = {}) {
  return raw?.forexLive12RsiRepairPlan || {};
}

function forexLive12RsiShadowCandidatePayload(raw = {}) {
  return raw?.forexLive12RsiShadowCandidate || {};
}

function forexLive12RsiTesterRequestPayload(raw = {}) {
  return raw?.forexLive12RsiTesterRequest || {};
}

function profitTargetLane(raw = {}, laneId) {
  return profitTargetPayload(raw)?.laneTargets?.[laneId] || {};
}

function formatUsdShort(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return numeric.toFixed(2);
}

function profitTargetLine(raw = {}) {
  const forex = profitTargetLane(raw, 'forexMt5');
  const btc = profitTargetLane(raw, 'btcCryptoCfd');
  if (!present(forex) && !present(btc)) return '';
  return `外币 ${formatUsdShort(forex.simulationVerifiedUsdProfit)} / BTC ${formatUsdShort(
    btc.simulationVerifiedUsdProfit,
  )} USD`;
}

function profitTargetStatusLabel(raw = {}) {
  const payload = profitTargetPayload(raw);
  if (!present(payload)) return '等待合计 50 USD 目标证据';
  if (payload.executionTargetReached || payload.dualTargetReached) return '收益目标已达成';
  return payload.statusZh || payload.status || '等待所有模拟目标';
}

function profitTargetUiStatus(raw = {}) {
  const payload = profitTargetPayload(raw);
  if (payload.executionTargetReached || payload.dualTargetReached) return 'ok';
  if (payload.status === 'TARGET_REACHED') return 'ok';
  if (payload.blockers?.length) return 'warn';
  return present(payload) ? 'warn' : 'blocked';
}

function profitTargetRows(raw = {}) {
  const payload = profitTargetPayload(raw);
  if (!present(payload)) return [];
  const lanes = payload.laneTargets || {};
  return Object.entries(lanes).map(([laneId, lane]) => ({
    laneId,
    labelZh: lane.labelZh || laneId,
    status: lane.status || payload.status || 'WAITING',
    statusZh: lane.statusZh || payload.statusZh || '等待目标',
    simulationVerifiedUsdProfit: numberValue(lane.simulationVerifiedUsdProfit, 0),
    targetUsd: numberValue(lane.targetUsd ?? payload.target?.targetUsd, 50),
    targetReached: Boolean(lane.targetReached),
  }));
}

function activationGateRows(raw = {}) {
  const decision = simToLiveDecisionPayload(raw);
  const checklist = decision.activationGateChecklist || decision.executionActivationGateChecklist;
  return rowsFromObjectList(checklist).map((row) => ({
    闸门: row.field || '执行闸门',
    层级: row.layer || '—',
    当前: boolText(Boolean(row.current)),
    期望: boolText(Boolean(row.expected)),
    通过: boolText(Boolean(row.passed)),
    阻塞码: row.blockerCode || '—',
    原因: row.reasonZh || row.reason || '—',
    细节: row.detailZh || row.reasonZh || row.reason || '—',
  }));
}

function releaseGateSummary(raw = {}) {
  const tokenEvidence = releaseTokenEvidencePayload(raw);
  const releaseReadiness = liveAutomationReleaseReadinessPayload(raw);
  const orchestrator = liveAutomationOrchestratorPayload(raw);
  const decision = simToLiveDecisionPayload(raw);
  return (
    tokenEvidence.executionReleaseGateSummary ||
    releaseReadiness.executionReleaseGateSummary ||
    orchestrator.executionReleaseGateSummary ||
    decision.executionReleaseGateSummary ||
    {}
  );
}

function releaseGateRows(raw = {}) {
  const tokenEvidence = releaseTokenEvidencePayload(raw);
  const signoffRowsByGate = Object.fromEntries(
    rowsFromObjectList(tokenEvidence.manualReleaseReviewRows).map((row) => [row.gateId, row]),
  );
  const releaseReadiness = liveAutomationReleaseReadinessPayload(raw);
  const orchestrator = liveAutomationOrchestratorPayload(raw);
  const decision = simToLiveDecisionPayload(raw);
  const checklist =
    tokenEvidence.evidenceRows ||
    releaseReadiness.executionReleaseGateChecklist ||
    orchestrator.executionReleaseGateChecklist ||
    decision.executionReleaseGateChecklist;
  return rowsFromObjectList(checklist).map((row) => ({
    闸门: row.labelZh || row.gateId || 'Release Token',
    副作用: row.sideEffectZh || '—',
    数据面: boolText(Boolean(row.dataPlaneReady)),
    ReleaseToken: row.tokenRequired === false ? '不需要' : boolText(Boolean(row.tokenProvided)),
    证据完成: row.evidenceComplete === undefined ? '—' : boolText(Boolean(row.evidenceComplete)),
    无副作用证据:
      row.noSideEffectEvidenceComplete === undefined
        ? '—'
        : boolText(Boolean(row.noSideEffectEvidenceComplete)),
    签收评审: signoffRowsByGate[row.gateId]?.statusZh || '—',
    阻塞码: row.tokenRequired === false || row.tokenProvided ? '—' : row.blockerCode || '—',
  }));
}

function releaseReadinessPacket(raw = {}) {
  const releaseReadiness = liveAutomationReleaseReadinessPayload(raw);
  const orchestrator = liveAutomationOrchestratorPayload(raw);
  const decision = simToLiveDecisionPayload(raw);
  return (
    releaseReadiness.executionReleaseReadinessPacket ||
    orchestrator.executionReleaseReadinessPacket ||
    decision.executionReleaseReadinessPacket ||
    {}
  );
}

function releaseTokenEvidenceProgressLine(payload = {}) {
  if (!present(payload)) return '';
  const total = Number(payload.releaseTokenCount);
  if (!Number.isFinite(total) || total <= 0) return payload.statusZh || payload.status || '';
  const evidenceDone = Number(
    payload.noSideEffectEvidenceCompleteCount ?? payload.evidenceCompleteCount ?? 0,
  );
  const tokenDone = Number(payload.tokenProvidedCount ?? 0);
  const missing = Number(payload.tokenMissingCount ?? Math.max(total - tokenDone, 0));
  return `无副作用证据 ${evidenceDone}/${total} / Token ${tokenDone}/${total} / 缺 ${missing}`;
}

function releaseTokenSignoffDraftProgressLine(payload = {}) {
  if (!present(payload)) return '';
  const total = Number(payload.releaseTokenCount);
  const ready = Number(payload.readyForSeparateSignoffCount ?? 0);
  if (!Number.isFinite(total) || total <= 0) return payload.statusZh || payload.status || '';
  return `签收草案 ${ready}/${total} / 不能在此签收`;
}

function releaseTokenSignoffInputTemplateProgressLine(payload = {}) {
  if (!present(payload)) return '';
  const total = Number(payload.releaseTokenCount);
  const ready = Number(payload.readyForInputCount ?? 0);
  if (!Number.isFinite(total) || total <= 0) return payload.statusZh || payload.status || '';
  return `签收模板 ${ready}/${total} / 等待外部填写`;
}

function releaseTokenSignoffInputProgressLine(payload = {}) {
  if (!present(payload)) return '';
  const total = Number(payload.releaseTokenCount);
  const complete = Number(payload.completeSignoffCount ?? 0);
  if (!Number.isFinite(total) || total <= 0) return payload.statusZh || payload.status || '';
  return `签收输入 ${complete}/${total} / 当前仍不放行`;
}

function releaseTokenSignoffHandoffProgressLine(payload = {}) {
  if (!present(payload)) return '';
  const total = Number(payload.releaseTokenCount);
  const complete = Number(payload.completeSignoffCount ?? 0);
  const missing = Number(payload.missingSignoffCount ?? Math.max(total - complete, 0));
  if (!Number.isFinite(total) || total <= 0) return payload.statusZh || payload.status || '';
  return `签收交接 ${complete}/${total} / 缺 ${missing} / 当前仍不放行`;
}

function codeListLine(codes = []) {
  const rows = toArray(codes).filter((code) => code !== undefined && code !== null && code !== '');
  if (!rows.length) return '';
  if (rows.length <= 3) return rows.join(' / ');
  return `${rows.slice(0, 3).join(' / ')} +${rows.length - 3}`;
}

function primaryExecutionBlocker(raw = {}) {
  const releaseReadiness = liveAutomationReleaseReadinessPayload(raw);
  const decision = simToLiveDecisionPayload(raw);
  const review = liveExecutionReviewPayload(raw);
  return (
    releaseReadiness.primaryActionableBlocker ||
    toArray(releaseReadiness.fileEvidenceBlockers)[0] ||
    toArray(releaseReadiness.executionModeFileEvidence?.blockingEvidence)[0] ||
    decision.primaryActionableBlocker ||
    review.primaryActionableBlocker ||
    toArray(decision.fileEvidenceBlockers)[0] ||
    toArray(review.fileEvidenceBlockers)[0] ||
    toArray(decision.executionModeBlockers)[0] ||
    toArray(review.runtimePreflightExecutionModeBlockers)[0] ||
    (Array.isArray(review.blockers)
      ? review.blockers.find((row) => String(row?.code || '').startsWith('MT5_SYMBOL_')) || review.blockers[0]
      : null)
  );
}

function liveExecutionBlockerLine(raw = {}) {
  const releaseReadiness = liveAutomationReleaseReadinessPayload(raw);
  const decision = simToLiveDecisionPayload(raw);
  const authorization = authorizationVsExecutionPayload(raw);
  const review = liveExecutionReviewPayload(raw);
  if (!present(review) && !present(decision) && !present(releaseReadiness)) return '';
  const intent = review.dryRunIntent || decision.dryRunIntent || {};
  const symbol = intent.brokerSymbol || intent.canonicalSymbol || 'BTCUSD';
  if (review.runtimeProbePassed || decision.runtimeProbePassed) return `${symbol} 运行时预检已通过`;
  const blocker = primaryExecutionBlocker(raw);
  const blockerReason = blocker?.reasonZh || blocker?.reason || '';
  if (present(releaseReadiness) && releaseReadiness.canReleaseExecutionNow === false) {
    const status = String(
      releaseReadiness.statusZh ||
        releaseReadiness.executionReleaseReadinessPacket?.statusZh ||
        '收益达标后仍未释放真实执行',
    ).replace(/[。；;]+$/u, '');
    return blockerReason ? `${symbol}：${status}；当前主 blocker：${blockerReason}` : `${symbol}：${status}`;
  }
  if (decision.dataPlaneReady && decision.executionModeOnlyBlocked) {
    const status = String(
      authorization.whyNotLiveNowZh || decision.statusZh || '模拟目标已达成，等待执行模式闸门',
    ).replace(/[。；;]+$/u, '');
    return blockerReason ? `${symbol}：${status}；当前主 blocker：${blockerReason}` : `${symbol}：${status}`;
  }
  if (review.runtimePreflightDataPlaneReadyForReview && review.runtimePreflightExecutionModeOnlyBlocked) {
    const status = review.statusZh || '数据面已通过，等待执行模式闸门';
    return blockerReason ? `${symbol}：${status}；当前主 blocker：${blockerReason}` : `${symbol}：${status}`;
  }
  const reason =
    blockerReason ||
    decision.nextRequiredActionZh ||
    decision.statusZh ||
    review.summaryZh ||
    review.statusZh ||
    review.status;
  return reason ? `${symbol}：${reason}` : '';
}

function profitExecutionConclusionLine(raw = {}) {
  const targetReached = Boolean(
    profitTargetPayload(raw)?.executionTargetReached || profitTargetPayload(raw)?.dualTargetReached,
  );
  const blockerLine = liveExecutionBlockerLine(raw);
  if (targetReached && blockerLine) return `收益已达标，但执行未释放：${blockerLine}`;
  if (targetReached) return '收益已达标，等待 execution release gate';
  return blockerLine;
}

function selectedExecutionLaneLine(raw = {}) {
  const selector = liveExecutionLaneSelectorPayload(raw);
  if (!present(selector)) return '';
  const selectedLaneId = selector.selectedLaneId || '';
  const selectedLane = toArray(selector.lanes).find((lane) => lane?.laneId === selectedLaneId) || {};
  const noEntry = selectedLane.noEntryDiagnostics || {};
  const guards = noEntry.guards || {};
  const rsi = noEntry.rsi || {};
  const blocker = selector.selectedLanePrimaryBlocker || {};
  const reason = blocker.reasonZh || blocker.reason || selector.selectedLaneNearestSafeActionZh || '';
  const label = selector.selectedLaneLabelZh || selector.selectedLaneId || '最接近车道';
  const details = [];
  if (guards.spreadAllowed === false) {
    const spread = guards.spreadPips ?? '—';
    const maxSpread = guards.maxSpreadPips ?? guards.hardMaxSpreadPips ?? '—';
    details.push(`点差 ${spread}/${maxSpread}`);
  }
  if (rsi.evalCode && rsi.evalCode !== 'NONE') {
    const direction = rsi.signalDirection && rsi.signalDirection !== 'NONE' ? ` ${rsi.signalDirection}` : '';
    details.push(`RSI ${rsi.evalCode}${direction}`);
  }
  const detailLine = details.join('；');
  if (reason && detailLine) return `${label}：${reason}；${detailLine}`;
  return reason ? `${label}：${reason}` : label;
}

function chooseRoutes(raw) {
  const candidates = [
    raw?.latest?.routes,
    raw?.latest?.route_watchlist,
    raw?.state?.routes,
    raw?.state?.route_watchlist,
    raw?.state?.data?.routes,
    raw?.state?.data?.route_watchlist,
    raw?.backtest?.routes,
    raw?.backtest?.data?.routes,
  ];
  for (const candidate of candidates) {
    const rows = toArray(candidate);
    if (rows.length) return rows;
  }
  return [];
}

export function normalizeDashboardSnapshot(raw = {}) {
  const reviewFresh = dailyReviewIsFresh(raw.dailyReview);
  const dashboardFreshness = latestFreshness(raw);
  const mt5SnapshotFreshness = readonlyFreshness(raw.mt5Snapshot);
  const secondaryMt5SnapshotFreshness = readonlyFreshness(raw.secondaryMt5Snapshot);
  const usdJpyLiveLoopFreshness = liveLoopFreshness(raw.usdJpyLiveLoop);
  const dashboardStale =
    dashboardFreshness.stale === true || dashboardFreshness.status === 'STALE_DASHBOARD_SNAPSHOT';
  const recovery = snapshotRecovery(raw);
  const runtimeState = dashboardStale
    ? 'STALE_DASHBOARD_SNAPSHOT'
    : firstValue(
        raw,
        PATH_SETS.runtimeState,
        present(raw.latest) || present(raw.state) ? 'available' : 'missing',
      );
  const killSwitch = firstValue(raw, PATH_SETS.killSwitch, null);
  const dryRun = firstValue(raw, PATH_SETS.dryRun, null);
  const activeRoute = firstValue(raw, PATH_SETS.activeRoute, '—');
  return {
    runtimeState,
    updatedAt: firstValue(raw, PATH_SETS.updatedAt, '—'),
    killSwitchStatus: boolStatus(killSwitch, 'blocked', 'ok'),
    killSwitchLabel: killSwitch === null ? 'unknown' : formatCompact(killSwitch),
    dryRunStatus: boolStatus(dryRun, 'locked', 'ok'),
    dryRunLabel: dryRun === null ? 'unknown' : formatCompact(dryRun),
    activeRoute,
    dailyPnl: firstValue(raw, PATH_SETS.dailyPnl, '—'),
    backtestAvailable: present(raw.backtest),
    dailyReviewAvailable: present(raw.dailyReview) && reviewFresh,
    dailyAutopilotAvailable: endpointAvailable(raw.dailyAutopilot),
    latestFreshness: dashboardFreshness,
    latestFreshnessLine: latestFreshnessLine(dashboardFreshness),
    latestDashboardFresh: dashboardFreshness.fresh === true,
    latestDashboardStale: dashboardStale,
    mt5SnapshotFreshness,
    mt5SnapshotFreshnessLine: latestFreshnessLine(mt5SnapshotFreshness),
    mt5SnapshotStale:
      mt5SnapshotFreshness.stale === true || mt5SnapshotFreshness.status === 'STALE_EA_SNAPSHOT',
    mt5HostProcessMissing: hostProcessMissing(raw.mt5Snapshot),
    secondaryMt5SnapshotFreshness,
    secondaryMt5SnapshotFreshnessLine: latestFreshnessLine(secondaryMt5SnapshotFreshness),
    secondaryMt5SnapshotStale:
      secondaryMt5SnapshotFreshness.stale === true ||
      secondaryMt5SnapshotFreshness.status === 'STALE_EA_SNAPSHOT',
    secondaryMt5HostProcessMissing: hostProcessMissing(raw.secondaryMt5Snapshot),
    usdJpyLiveLoop: raw?.usdJpyLiveLoop || {},
    usdJpyLiveLoopFreshness,
    usdJpyLiveLoopStale: usdJpyLiveLoopFreshness.hardStale === true,
    snapshotRecovery: recovery,
    routes: chooseRoutes(raw),
    account: latestAccount(raw),
    positions: mt5Positions(raw),
    dailySummary: dailySummary(raw),
    dailyPnlEvidence: dailyPnl(raw),
    historyProductionStatus: historyProductionStatus(raw),
    historyFreshnessPromotionReview: historyFreshnessPromotionReview(raw),
    hfmCrypto: raw?.hfmCrypto || {},
    hfmCryptoRows: hfmCryptoRows(raw),
    hfmCryptoStatus: raw?.hfmCrypto?.status || '',
    hfmCryptoStatusZh: raw?.hfmCrypto?.statusZh || '',
    hfmCryptoDiagnostics: hfmCryptoDiagnostics(raw),
    hfmCryptoRuntimeProbeLine: hfmCryptoRuntimeProbeLine(raw),
    profitTarget: profitTargetPayload(raw),
    profitTargetRows: profitTargetRows(raw),
    profitTargetLine: profitTargetLine(raw),
    profitTargetStatusLabel: profitTargetStatusLabel(raw),
    profitTargetStatus: profitTargetUiStatus(raw),
    dualTargetReached: Boolean(
      profitTargetPayload(raw)?.executionTargetReached || profitTargetPayload(raw)?.dualTargetReached,
    ),
    liveCutoverGate: profitTargetPayload(raw)?.liveCutoverGate || {},
    liveExecutionReview: liveExecutionReviewPayload(raw),
    simToLiveDecision: simToLiveDecisionPayload(raw),
    authorizationVsExecution: authorizationVsExecutionPayload(raw),
    activationGateRows: activationGateRows(raw),
    liveAutomationOrchestrator: liveAutomationOrchestratorPayload(raw),
    liveExecutionLaneSelector: liveExecutionLaneSelectorPayload(raw),
    releaseTokenEvidenceReview: releaseTokenEvidencePayload(raw),
    releaseTokenEvidenceProgressLine: releaseTokenEvidenceProgressLine(releaseTokenEvidencePayload(raw)),
    releaseTokenSignoffDraft: releaseTokenSignoffDraftPayload(raw),
    releaseTokenSignoffDraftProgressLine: releaseTokenSignoffDraftProgressLine(
      releaseTokenSignoffDraftPayload(raw),
    ),
    releaseTokenSignoffInputTemplate: releaseTokenSignoffInputTemplatePayload(raw),
    releaseTokenSignoffInputTemplateProgressLine: releaseTokenSignoffInputTemplateProgressLine(
      releaseTokenSignoffInputTemplatePayload(raw),
    ),
    releaseTokenSignoffInputReview: releaseTokenSignoffInputReviewPayload(raw),
    releaseTokenSignoffInputProgressLine: releaseTokenSignoffInputProgressLine(
      releaseTokenSignoffInputReviewPayload(raw),
    ),
    releaseTokenSignoffHandoff: releaseTokenSignoffHandoffPayload(raw),
    releaseTokenSignoffHandoffProgressLine: releaseTokenSignoffHandoffProgressLine(
      releaseTokenSignoffHandoffPayload(raw),
    ),
    selectedExecutionLaneLine: selectedExecutionLaneLine(raw),
    forexLive12RuntimeHandoff: forexLive12RuntimeHandoffPayload(raw),
    forexLive12CapacityExpansionReview: forexLive12CapacityExpansionReviewPayload(raw),
    forexLive12CapacityExpansionRoadmap: forexLive12CapacityExpansionRoadmapPayload(raw),
    forexLive12MicroExpansionReview: forexLive12MicroExpansionReviewPayload(raw),
    forexLive12RsiRepairPlan: forexLive12RsiRepairPlanPayload(raw),
    forexLive12RsiShadowCandidate: forexLive12RsiShadowCandidatePayload(raw),
    forexLive12RsiTesterRequest: forexLive12RsiTesterRequestPayload(raw),
    executionReleaseGateSummary: releaseGateSummary(raw),
    executionReleaseGateRows: releaseGateRows(raw),
    executionReleaseReadinessPacket: releaseReadinessPacket(raw),
    liveExecutionBlockerLine: liveExecutionBlockerLine(raw),
    profitExecutionConclusionLine: profitExecutionConclusionLine(raw),
    autopilotStatus: raw?.dailyAutopilot?.status || '—',
  };
}

export function buildDashboardMetrics(snapshot) {
  const currency = snapshot.account?.currency || 'USC';
  const balance = numberValue(snapshot.account?.balance ?? snapshot.account?.equity, null);
  const equity = numberValue(snapshot.account?.equity, null);
  const staleDashboardHint = snapshot.latestDashboardStale ? dashboardFreshnessHint(snapshot) : '';
  const equityMetric = staleDashboardAccountMetric(snapshot, equity, currency, '净值');
  const balanceMetric = staleDashboardAccountMetric(snapshot, balance, currency, '余额');
  const positionsCount = snapshot.positions?.length || 0;
  const latestDashboardProcessMissing = snapshot.snapshotRecovery?.processMissing === true;
  const positionsMetric = snapshot.latestDashboardStale
    ? {
        value: '不可确认',
        hint: [staleDashboardHint, `旧快照持仓 ${positionsCount} 笔，仅作历史参考`]
          .filter(Boolean)
          .join('；'),
        status: latestDashboardProcessMissing ? 'blocked' : 'warn',
      }
    : {
        value: positionsCount,
        hint: 'MT5 实盘快照',
      };
  const hfmCryptoCount = snapshot.hfmCryptoRows?.length || 0;
  const hfmCryptoDiagnosticLine = hfmCryptoSummaryLine(snapshot);
  const hfmCryptoLikeCount = numberValue(snapshot.hfmCryptoDiagnostics?.brokerCryptoLikeCountAll, null);
  const hfmCryptoEvidenceCount = hfmCryptoEvidenceSymbolCount(snapshot);
  const hfmCryptoMetricCount =
    hfmCryptoLikeCount && hfmCryptoLikeCount > 0
      ? hfmCryptoLikeCount
      : hfmCryptoEvidenceCount > 0
        ? hfmCryptoEvidenceCount
        : (hfmCryptoLikeCount ?? hfmCryptoCount);
  const forexLive12Handoff = snapshot.forexLive12RuntimeHandoff || {};
  const forexCapacityReview = snapshot.forexLive12CapacityExpansionReview || {};
  const forexCapacityRoadmap = snapshot.forexLive12CapacityExpansionRoadmap || {};
  const forexMicroReview = snapshot.forexLive12MicroExpansionReview || {};
  const forexRsiRepair = snapshot.forexLive12RsiRepairPlan || {};
  const forexRsiCandidate = snapshot.forexLive12RsiShadowCandidate || {};
  const forexRsiTester = snapshot.forexLive12RsiTesterRequest || {};
  return [
    {
      label: '账户净值',
      value: equityMetric.value,
      hint: equityMetric.hint || snapshot.account?.server || 'HFM MT5',
      status: equityMetric.status,
    },
    {
      label: '账户余额',
      value: balanceMetric.value,
      hint: balanceMetric.hint || snapshot.account?.number || snapshot.account?.login || '实时快照',
      status: balanceMetric.status,
    },
    {
      label: 'MT5 快照新鲜度',
      value: latestDashboardProcessMissing
        ? 'writer 未运行'
        : snapshot.latestDashboardStale
          ? '过期'
          : snapshot.latestDashboardFresh
            ? '新鲜'
            : '待确认',
      hint:
        (latestDashboardProcessMissing ? snapshot.snapshotRecovery?.nextAction : '') ||
        snapshot.latestFreshnessLine ||
        snapshot.latestFreshness?.nextActionZh ||
        '按 /api/latest dashboard mtime 判定',
      status: latestDashboardProcessMissing
        ? 'blocked'
        : snapshot.latestDashboardStale
          ? 'warn'
          : snapshot.latestDashboardFresh
            ? 'ok'
            : 'warn',
    },
    {
      label: '主 MT5 只读桥',
      value: mt5BridgeValue({
        stale: snapshot.mt5SnapshotStale,
        fresh: snapshot.mt5SnapshotFreshness?.fresh,
        processMissing: snapshot.mt5HostProcessMissing,
      }),
      hint: mt5BridgeHint({
        line: snapshot.mt5SnapshotFreshnessLine,
        freshness: snapshot.mt5SnapshotFreshness,
        processLine: snapshot.snapshotRecovery?.primaryProcessLine,
        processMissing: snapshot.mt5HostProcessMissing,
        fallback: '按 /api/mt5-readonly/snapshot source 判定',
      }),
      status: mt5BridgeStatus({
        stale: snapshot.mt5SnapshotStale,
        fresh: snapshot.mt5SnapshotFreshness?.fresh,
        processMissing: snapshot.mt5HostProcessMissing,
      }),
    },
    {
      label: 'Live16 快照',
      value: mt5BridgeValue({
        stale: snapshot.secondaryMt5SnapshotStale,
        fresh: snapshot.secondaryMt5SnapshotFreshness?.fresh,
        processMissing: snapshot.secondaryMt5HostProcessMissing,
      }),
      hint: mt5BridgeHint({
        line: snapshot.secondaryMt5SnapshotFreshnessLine,
        freshness: snapshot.secondaryMt5SnapshotFreshness,
        processLine: snapshot.snapshotRecovery?.secondaryProcessLine,
        processMissing: snapshot.secondaryMt5HostProcessMissing,
        fallback: '按 /api/mt5-readonly-secondary/snapshot source 判定',
      }),
      status: mt5BridgeStatus({
        stale: snapshot.secondaryMt5SnapshotStale,
        fresh: snapshot.secondaryMt5SnapshotFreshness?.fresh,
        processMissing: snapshot.secondaryMt5HostProcessMissing,
      }),
    },
    {
      label: 'USDJPY Live Loop',
      value: liveLoopStatusValue(snapshot.usdJpyLiveLoopFreshness),
      hint:
        snapshot.usdJpyLiveLoopFreshness?.reasonLine ||
        snapshot.usdJpyLiveLoopFreshness?.nextActionZh ||
        '读取 /api/usdjpy-strategy-lab/live-loop',
      status: snapshot.usdJpyLiveLoopFreshness?.hardStale
        ? 'blocked'
        : snapshot.usdJpyLiveLoopFreshness?.fresh
          ? 'ok'
          : 'warn',
    },
    {
      label: '当前持仓',
      value: positionsMetric.value,
      hint: positionsMetric.hint,
      status: positionsMetric.status,
    },
    {
      label: '今日净值',
      value: formatMoney(snapshot.dailyPnlEvidence?.netUSC ?? snapshot.dailyPnl, 'USC'),
      hint: '每日复盘',
    },
    {
      label: '今日待办',
      value: snapshot.dailySummary?.todayTodoStatus === 'DONE_OR_NO_ACTIONS' ? '已完成' : '待处理',
      hint: `${snapshot.dailySummary?.paramReadyToRunCount || 0} 可运行 / HFM Crypto ${
        hfmCryptoDiagnosticLine || `${hfmCryptoCount} 条证据`
      }`,
    },
    {
      label: '合计模拟目标',
      value: snapshot.dualTargetReached ? '达标' : '等待',
      hint:
        snapshot.profitExecutionConclusionLine ||
        snapshot.liveExecutionBlockerLine ||
        snapshot.profitTargetLine ||
        snapshot.profitTargetStatusLabel ||
        '外币或 BTC 任一 lane 达标，或多 lane 净合计 50 USD',
    },
    {
      label: '最接近实盘车道',
      value:
        snapshot.liveExecutionLaneSelector?.selectedLaneLabelZh ||
        snapshot.liveExecutionLaneSelector?.selectedLaneId ||
        '等待',
      hint: snapshot.selectedExecutionLaneLine || '等待双车道择优证据',
    },
    ...(present(forexLive12Handoff)
      ? [
          {
            label: '外币 Live12 实盘',
            value: forexLive12Handoff.statusZh || forexLive12Handoff.status || '等待 Live12 交接',
            hint:
              forexLive12Handoff.capacityReleaseWatch?.capacityLineZh ||
              forexLive12Handoff.nextRequiredActionZh ||
              `${forexLive12Handoff.positionSummary?.openPositionCount ?? 0}/${
                forexLive12Handoff.positionSummary?.maxTotalTrades ?? 0
              } 仓位`,
          },
        ]
      : []),
    ...(present(forexCapacityReview)
      ? [
          {
            label: '扩仓请求',
            value: forexCapacityReview.statusZh || forexCapacityReview.status || '等待扩仓评审',
            hint:
              forexCapacityReview.decision?.nextRequiredActionZh ||
              `请求 ${forexCapacityReview.request?.requestedMaxTotalTrades ?? 10} / 当前 ${
                forexCapacityReview.request?.currentMaxTotalTrades ?? '—'
              }`,
          },
        ]
      : []),
    ...(present(forexCapacityRoadmap)
      ? [
          {
            label: '扩仓路线',
            value: forexCapacityRoadmap.statusZh || forexCapacityRoadmap.status || '等待扩仓路线',
            hint:
              forexCapacityRoadmap.decision?.nextRequiredActionZh ||
              `下一档 ${forexCapacityRoadmap.nextPhase?.toMaxTotalTrades ?? '—'} / 目标 ${
                forexCapacityRoadmap.request?.requestedMaxTotalTrades ?? 10
              }`,
          },
        ]
      : []),
    ...(present(forexMicroReview)
      ? [
          {
            label: '2→3 微仓评审',
            value: forexMicroReview.statusZh || forexMicroReview.status || '等待微仓评审',
            hint:
              forexMicroReview.decision?.nextRequiredActionZh ||
              `${forexMicroReview.evidence?.metrics?.naturalClosedTrades ?? 0}/${
                forexMicroReview.evidence?.required?.minNaturalClosedTrades ?? 5
              } 自然平仓样本`,
          },
        ]
      : []),
    ...(present(forexRsiRepair)
      ? [
          {
            label: 'RSI 修复计划',
            value: forexRsiRepair.statusZh || forexRsiRepair.status || '等待 RSI 修复计划',
            hint:
              forexRsiRepair.decision?.nextRequiredActionZh ||
              forexRsiRepair.repairActions?.[0]?.reasonZh ||
              '等待 RSI_Reversal 亏损聚类分析',
          },
        ]
      : []),
    ...(present(forexRsiCandidate)
      ? [
          {
            label: 'RSI 影子候选',
            value: forexRsiCandidate.statusZh || forexRsiCandidate.status || '等待 RSI 影子候选',
            hint:
              forexRsiCandidate.decision?.nextRequiredActionZh ||
              `${forexRsiCandidate.proxyReplay?.keptTradeCount ?? 0} 保留 / ${
                forexRsiCandidate.proxyReplay?.blockedTradeCount ?? 0
              } 过滤`,
          },
        ]
      : []),
    ...(present(forexRsiTester)
      ? [
          {
            label: 'RSI Tester 请求',
            value: forexRsiTester.statusZh || forexRsiTester.status || '等待 Tester 请求',
            hint:
              forexRsiTester.materializationStatus?.statusZh ||
              forexRsiTester.decision?.nextRequiredActionZh ||
              `${forexRsiTester.summary?.queueCount ?? 0} 个 tester-only 任务`,
          },
        ]
      : []),
    {
      label: 'HFM Crypto',
      value: hfmCryptoMetricCount,
      hint:
        snapshot.hfmCryptoRuntimeProbeLine ||
        hfmCryptoDiagnosticLine ||
        snapshot.hfmCryptoStatusZh ||
        'Crypto CFD symbol 与 Moss 资料',
    },
  ];
}

export function buildEndpointHealth(raw = {}) {
  const freshness = latestFreshness(raw);
  const primaryProcessMissing = hostProcessMissing(raw.mt5Snapshot);
  const secondaryProcessMissing = hostProcessMissing(raw.secondaryMt5Snapshot);
  const endpoints = [
    ['MT5 实时快照', '/api/latest', raw.latest, '账户、行情、策略运行状态'],
    ['每日复盘', '/api/daily-review', raw.dailyReview, 'MT5 与 HFM Crypto 的日终结论'],
    ['今日自动闭环', '/api/daily-autopilot', raw.dailyAutopilot, '今日待办执行、报告回灌和复盘'],
    [
      'Agent 日报 v2',
      '/api/usdjpy-strategy-lab/autonomous-agent/daily-autopilot-v2?scope=secondary',
      raw.dailyAutopilotV2,
      'GA 历史样本与三车道 Agent 日报',
    ],
    [
      'Agent 自动化健康',
      '/api/usdjpy-strategy-lab/agent-ops-health/status?scope=secondary',
      raw.agentOpsHealth,
      'Daily Autopilot、HFM Crypto shadow 和 Telegram Gateway',
    ],
    [
      'Telegram Gateway',
      '/api/usdjpy-strategy-lab/telegram-gateway/status',
      raw.telegramGateway,
      '日报、GA、回滚和 HFM Crypto shadow 的 push-only 投递状态',
    ],
    ['MT5 只读桥', '/api/mt5-readonly/snapshot', raw.mt5Snapshot, '持仓、报价、账户只读快照'],
    [
      'Live16 只读桥',
      '/api/mt5-readonly-secondary/snapshot',
      raw.secondaryMt5Snapshot,
      '第二账号 HFM Live16 的账户、报价、symbol 只读快照',
    ],
    [
      'USDJPY Live Loop',
      '/api/usdjpy-strategy-lab/live-loop',
      raw.usdJpyLiveLoop,
      'USDJPY 策略 live-loop、EA 干跑和入场阻断诊断',
    ],
    [
      'HFM Crypto CFD',
      '/api/hfm-crypto/status?view=summary&scope=secondary',
      raw.hfmCrypto,
      'Crypto CFD symbol 与 Moss 回测资料',
    ],
    [
      '合计 50 USD 目标',
      '/api/profit-target/status?scope=secondary&targetUsd=50',
      raw.profitTarget,
      '外币 MT5 与 BTC crypto CFD 正收益且合计达标证据',
    ],
    [
      'Sim-to-live 编排器',
      '/api/live-automation/orchestrator?scope=secondary',
      raw.liveAutomationOrchestrator,
      '执行模式、release token 和订单副作用总闸门',
    ],
    [
      '冠军长期记忆晋级闸',
      '/api/live-automation/champion-promotion-gate?scope=secondary',
      raw.championPromotionGate,
      'longTermMemoryPromotionReview、memoryBlocksLivePromotion 和 tester-only 下一步',
    ],
    [
      '执行释放包',
      '/api/live-automation/release-readiness-refresh?scope=secondary',
      raw.liveAutomationReleaseReadiness,
      '轻量读取 execution release token 与 MT5 执行闸门状态',
    ],
    [
      'Release Token 证据',
      '/api/live-automation/release-token-evidence-review?scope=secondary',
      raw.releaseTokenEvidenceReview,
      '逐项展示 release token 的无副作用证据与 token 缺口',
    ],
    [
      'Release Token 签收草案',
      '/api/live-automation/release-token-signoff-draft?scope=secondary',
      raw.releaseTokenSignoffDraft,
      '把 release token 缺口转换成单独签收输入模板，但不在此处放行',
    ],
    [
      'Release Token 签收模板',
      '/api/live-automation/release-token-signoff-input-template?scope=secondary',
      raw.releaseTokenSignoffInputTemplate,
      '导出可填写的签收输入模板；不签收、不铸 token、不下单',
    ],
    [
      'Release Token 签收输入',
      '/api/live-automation/release-token-signoff-input-review?scope=secondary',
      raw.releaseTokenSignoffInputReview,
      '校验外部签收输入是否完整；当前页不签收、不铸 token、不下单',
    ],
    [
      'Release Token 签收交接',
      '/api/live-automation/release-token-signoff-handoff?scope=secondary',
      raw.releaseTokenSignoffHandoff,
      '汇总证据、模板、签收输入和缺失项；只能交给独立 release lane 复核',
    ],
    [
      '双车道择优',
      '/api/live-automation/lane-selector?scope=secondary',
      raw.liveExecutionLaneSelector,
      '外币 Live12 与 BTC Live16 哪条最接近执行',
    ],
    [
      '外币 Live12 实盘交接',
      '/api/live-automation/forex-live12-runtime-handoff?scope=secondary',
      raw.forexLive12RuntimeHandoff,
      '只读展示 Live12 EA pilot、当前仓位容量和为何不再进场',
    ],
    ['策略回测摘要', '/api/dashboard/backtest-summary', raw.backtest, '候选策略研究结果'],
  ];
  return endpoints.map(([label, endpoint, payload, description]) => {
    const staleLatest =
      endpoint === '/api/latest' &&
      (freshness.stale === true || freshness.status === 'STALE_DASHBOARD_SNAPSHOT');
    const endpointFreshness = readonlyFreshness(payload);
    const loopFreshness = endpoint === '/api/usdjpy-strategy-lab/live-loop' ? liveLoopFreshness(payload) : {};
    const staleReadonly =
      endpoint !== '/api/latest' &&
      (endpointFreshness.stale === true || endpointFreshness.status === 'STALE_EA_SNAPSHOT');
    const staleLiveLoop = loopFreshness.hardStale === true;
    const processMissing =
      (endpoint === '/api/latest' && (primaryProcessMissing || secondaryProcessMissing)) ||
      (endpoint === '/api/mt5-readonly/snapshot' && primaryProcessMissing) ||
      (endpoint === '/api/mt5-readonly-secondary/snapshot' && secondaryProcessMissing);
    const hasPayload = present(payload);
    const unavailable = endpointUnavailable(payload);
    return {
      label,
      endpoint,
      description: processMissing
        ? '未检测到对应 terminal64/wine 进程；先恢复 MT5 终端和 EA dashboard writer，再把账号状态当成当前值。'
        : staleLiveLoop
          ? loopFreshness.nextActionZh || loopFreshness.reasonLine || description
          : staleLatest || staleReadonly
            ? freshness.nextActionZh ||
              endpointFreshness.nextActionZh ||
              endpointFreshness.nextAction ||
              description
            : unavailable
              ? endpointUnavailableDescription(payload, description)
              : description,
      status: processMissing
        ? 'blocked'
        : staleLiveLoop
          ? 'blocked'
          : staleLatest || staleReadonly
            ? 'warn'
            : hasPayload && !unavailable
              ? 'ok'
              : 'warn',
      statusLabel: processMissing
        ? 'writer 未运行'
        : staleLiveLoop
          ? '运行快照严重过期'
          : staleLatest || staleReadonly
            ? '快照过期'
            : unavailable
              ? '不可用'
              : hasPayload
                ? '正常'
                : '缺失',
    };
  });
}

export function buildRuntimeSourceDiagnosticRows(raw = {}) {
  const latest = latestFreshness(raw);
  const primary = readonlyFreshness(raw.mt5Snapshot);
  const secondary = readonlyFreshness(raw.secondaryMt5Snapshot);
  const liveLoop = liveLoopFreshness(raw.usdJpyLiveLoop);
  const hfmCrypto = raw.hfmCrypto || {};
  const primaryProcessMissing = hostProcessMissing(raw.mt5Snapshot);
  const secondaryProcessMissing = hostProcessMissing(raw.secondaryMt5Snapshot);
  const secondaryStale = secondary.stale === true || secondary.status === 'STALE_EA_SNAPSHOT';
  const hfmStatus = hfmCrypto.statusZh || humanizeStatus(hfmCrypto.status, '等待 HFM Crypto CFD 状态');
  return [
    processAwareFreshnessRow(
      '总览 MT5 dashboard',
      '/api/latest',
      latest,
      primaryProcessMissing || secondaryProcessMissing,
      '恢复主 MT5/EA 进程并刷新 QuantGod_Dashboard.json。',
    ),
    processAwareFreshnessRow(
      '主账号只读桥',
      '/api/mt5-readonly/snapshot',
      primary,
      primaryProcessMissing,
      '恢复主账号 MT5/EA dashboard writer。',
    ),
    processAwareFreshnessRow(
      'Live16 只读桥',
      '/api/mt5-readonly-secondary/snapshot',
      secondary,
      secondaryProcessMissing,
      '恢复 Live16 MT5/EA dashboard writer，HFM Crypto 当前状态才可作为实时账号证据。',
    ),
    {
      数据源: 'USDJPY Live Loop',
      端点: '/api/usdjpy-strategy-lab/live-loop',
      状态: liveLoopStatusValue(liveLoop),
      年龄: formatFreshnessAgeSeconds(liveLoop.ageSeconds),
      阈值: liveLoop.hardStale || liveLoop.softStale ? '90 秒 hard / 30 秒 soft' : 'live-loop runtime',
      源文件: liveLoop.sourceFile || '等待 live-loop runtime source',
      动作:
        liveLoop.nextActionZh ||
        liveLoop.reasonLine ||
        '读取 USDJPY live-loop，确认策略闭环是否依赖新鲜 MT5 runtime snapshot。',
    },
    {
      数据源: 'HFM Crypto CFD',
      端点: '/api/hfm-crypto/status?view=summary&scope=secondary',
      状态: secondaryStale ? '依赖快照过期' : hfmStatus,
      年龄: secondaryStale ? formatFreshnessAgeSeconds(secondary.ageSeconds) : '见状态文件',
      阈值: secondaryStale ? formatFreshnessAgeSeconds(secondary.maxAgeSeconds) : 'shadow 证据',
      源文件:
        hfmCrypto.sourceFiles?.state || hfmCrypto.sourceFiles?.contractSpecExport || '等待 HFM Crypto 源文件',
      动作: secondaryStale
        ? 'HFM Crypto shadow 资料可读，但 Live16 EA 快照过期；先恢复 Live16 dashboard writer，再判断当前账号与 BTC/crypto 执行准备度。'
        : hfmStatus,
    },
  ];
}

export function buildChampionMemoryItems(raw = {}) {
  const gate = raw?.championPromotionGate || {};
  const review = gate.longTermMemoryPromotionReview || {};
  if (!present(gate) && !present(review)) return [];
  const decision = gate.promotionDecision || {};
  const selected = gate.selectedChampion || review.candidate || {};
  const route = review.matchedRoute || {};
  const profile = review.qualityProfile || {};
  const dataGaps = toArray(profile.dataGaps);
  const appliedRules = toArray(review.appliedRules);
  const blockers = toArray(gate.blockers);
  const firstGap = dataGaps[0] || {};
  const firstRule = appliedRules[0] || {};
  const sampleCount = profile.sampleCount ?? review.sampleCount ?? route.sampleCount ?? '—';
  const gapValue = firstGap.gap
    ? `${firstGap.gap} ${firstGap.count ?? 0}/${sampleCount}`
    : profile.status || '等待画像';
  const memoryPenalty = Number(route.memoryPenalty);
  const blocksLivePromotion = Boolean(review.blocksLivePromotion || decision.memoryBlocksLivePromotion);
  const rawAvg = formatCompact(route.rawAvgScoreR);
  const avg = formatCompact(route.avgScoreR);
  const nextBlocker =
    blockers[0]?.reasonZh ||
    blockers[0]?.code ||
    decision.reasonZh ||
    gate.statusZh ||
    '只允许继续 tester-only/forward 证据';
  return [
    {
      label: '冠军候选',
      value: selected.seedId || selected.strategyId || gate.statusZh || '等待王牌',
      hint: gate.statusZh || gate.status || 'champion-promotion-gate',
      status: selected.seedId || selected.strategyId ? 'warn' : 'blocked',
    },
    {
      label: '长期记忆晋级闸',
      value: review.status || '等待 longTermMemoryPromotionReview',
      hint: review.reasonZh || '读取 longTermMemoryPromotionReview / memoryBlocksLivePromotion',
      status: blocksLivePromotion ? 'blocked' : present(review) ? 'warn' : 'blocked',
    },
    {
      label: '记忆扣分',
      value: Number.isFinite(memoryPenalty) ? memoryPenalty.toFixed(2) : formatCompact(route.memoryPenalty),
      hint: `${route.state || 'route'} · ${rawAvg} → ${avg}`,
      status: memoryPenalty >= 0.15 ? 'blocked' : memoryPenalty > 0 ? 'warn' : 'ok',
    },
    {
      label: '低覆盖/逆风证据',
      value: gapValue,
      hint: firstRule.reasonZh || firstGap.reasonZh || 'dataGap/adverseFactor 会进入晋级闸',
      status: firstGap.count ? 'blocked' : 'warn',
    },
    {
      label: '下一步',
      value: decision.canRunIsolatedTesterForwardNext ? 'tester/forward' : '等待证据',
      hint: nextBlocker,
      status: decision.canRunIsolatedTesterForwardNext ? 'warn' : 'blocked',
    },
  ];
}

export function buildProfitTargetItems(snapshot = {}) {
  const decision = snapshot.simToLiveDecision || {};
  const authorization = snapshot.authorizationVsExecution || {};
  const gates = snapshot.activationGateRows || [];
  const releaseSummary = snapshot.executionReleaseGateSummary || {};
  const releaseRows = snapshot.executionReleaseGateRows || [];
  const releaseEvidence = snapshot.releaseTokenEvidenceReview || {};
  const releaseEvidenceProgress = snapshot.releaseTokenEvidenceProgressLine || '';
  const releaseSignoffDraft = snapshot.releaseTokenSignoffDraft || {};
  const releaseSignoffDraftProgress = snapshot.releaseTokenSignoffDraftProgressLine || '';
  const releaseSignoffInputTemplate = snapshot.releaseTokenSignoffInputTemplate || {};
  const releaseSignoffInputTemplateProgress = snapshot.releaseTokenSignoffInputTemplateProgressLine || '';
  const releaseSignoffInput = snapshot.releaseTokenSignoffInputReview || {};
  const releaseSignoffInputProgress = snapshot.releaseTokenSignoffInputProgressLine || '';
  const releaseSignoffHandoff = snapshot.releaseTokenSignoffHandoff || {};
  const releaseSignoffHandoffProgress = snapshot.releaseTokenSignoffHandoffProgressLine || '';
  const releasePacket = snapshot.executionReleaseReadinessPacket || {};
  const failedGateCount = gates.filter((row) => row.通过 !== '是').length;
  const gateSummary = gates.length
    ? failedGateCount
      ? `${failedGateCount}/${gates.length} 个执行闸门未通过`
      : '执行闸门全部通过'
    : '等待执行闸门清单';
  const releaseBlocked = Number(
    releaseSummary.blocked ?? releaseRows.filter((row) => row.ReleaseToken === '否').length,
  );
  const releaseTotal = Number(releaseSummary.total ?? releaseRows.length);
  const releaseGateLabel = releaseTotal
    ? releaseBlocked
      ? `${releaseBlocked}/${releaseTotal} 个 release token 未提供`
      : 'Release token 已齐'
    : '等待 release token 清单';
  const releaseCodes = codeListLine(
    releaseSummary.blockerCodes ||
      releaseRows.map((row) => row.阻塞码).filter((code) => code && code !== '—'),
  );
  const packetBlocked = Number(releasePacket.blockedGateCount ?? releaseBlocked);
  const packetActivationBlocked = Number(releasePacket.activationGateSummary?.blocked ?? failedGateCount);
  const packetCodes = codeListLine(
    releasePacket.blockedReleaseTokenCodes || releaseSummary.blockerCodes || [],
  );
  const remainingGateFields = toArray(authorization.remainingGateFields).join(' / ');
  if (!present(snapshot.profitTarget) && !present(decision)) return [];
  return [
    {
      label: '合计模拟目标',
      value: snapshot.dualTargetReached ? '已达成' : snapshot.profitTargetStatusLabel,
      hint: snapshot.profitTargetLine || '外币或 BTC 任一 lane 达标，或多 lane 净合计 50 USD',
      status: snapshot.dualTargetReached ? 'ok' : 'warn',
    },
    {
      label: 'Sim-to-live 决策',
      value: decision.statusZh || decision.status || snapshot.profitTargetStatusLabel,
      hint:
        snapshot.profitExecutionConclusionLine ||
        snapshot.liveExecutionBlockerLine ||
        decision.nextRequiredActionZh ||
        '数据面通过后检查 MT5 执行模式闸门',
      status: decision.allActivationGatesPassed ? 'ok' : 'warn',
    },
    {
      label: '授权证据',
      value: boolText(
        Boolean(
          authorization.chatAuthorizationAcknowledged || authorization.operatorApprovalEvidenceAccepted,
        ),
      ),
      hint: authorization.whyNotLiveNowZh || '等待操作员授权证据与执行闸门拆分状态',
      status:
        authorization.chatAuthorizationAcknowledged || authorization.operatorApprovalEvidenceAccepted
          ? 'ok'
          : 'warn',
    },
    {
      label: '可开始执行',
      value: boolText(Boolean(authorization.executionCanStartNow)),
      hint: remainingGateFields || '真实执行必须由独立 execution lane 证明',
      status: authorization.executionCanStartNow ? 'ok' : 'blocked',
    },
    {
      label: '数据面',
      value: boolText(Boolean(decision.dataPlaneReady)),
      hint: decision.executionModeOnlyBlocked ? '数据面已通过；当前只剩执行模式闸门' : '等待数据面预检证据',
      status: decision.dataPlaneReady ? 'ok' : 'warn',
    },
    {
      label: '执行模式闸门',
      value: gateSummary,
      hint: gates[0]?.原因 || 'livePilotMode / readOnlyMode / executionEnabled / tradeAllowed',
      status: decision.allActivationGatesPassed ? 'ok' : 'blocked',
    },
    {
      label: 'Release Tokens',
      value: releaseEvidence.statusZh || releaseSummary.statusZh || releaseGateLabel,
      hint:
        releaseEvidenceProgress ||
        releaseCodes ||
        'request writer / EA reader / broker send / receipt / rollback',
      status: releaseBlocked ? 'blocked' : releaseTotal ? 'warn' : 'warn',
    },
    ...(present(releaseSignoffDraft)
      ? [
          {
            label: 'Release Token 签收草案',
            value: releaseSignoffDraft.statusZh || releaseSignoffDraft.status || '等待签收草案',
            hint:
              releaseSignoffDraftProgress ||
              releaseSignoffDraft.nextRequiredActionZh ||
              '草案不可作为 release token 使用',
            status: releaseSignoffDraft.canReleaseExecutionNow ? 'warn' : 'blocked',
          },
        ]
      : []),
    ...(present(releaseSignoffInputTemplate)
      ? [
          {
            label: 'Release Token 签收模板',
            value:
              releaseSignoffInputTemplate.statusZh || releaseSignoffInputTemplate.status || '等待签收模板',
            hint:
              releaseSignoffInputTemplateProgress ||
              releaseSignoffInputTemplate.nextRequiredActionZh ||
              '模板不可作为 release token 使用',
            status: releaseSignoffInputTemplate.canReleaseExecutionNow ? 'warn' : 'blocked',
          },
        ]
      : []),
    ...(present(releaseSignoffInput)
      ? [
          {
            label: 'Release Token 签收输入',
            value: releaseSignoffInput.statusZh || releaseSignoffInput.status || '等待签收输入校验',
            hint:
              releaseSignoffInputProgress ||
              releaseSignoffInput.nextRequiredActionZh ||
              '当前校验器不放行真实执行',
            status: releaseSignoffInput.canReleaseExecutionNow ? 'warn' : 'blocked',
          },
        ]
      : []),
    ...(present(releaseSignoffHandoff)
      ? [
          {
            label: 'Release Token 签收交接',
            value: releaseSignoffHandoff.statusZh || releaseSignoffHandoff.status || '等待签收交接包',
            hint:
              releaseSignoffHandoffProgress ||
              releaseSignoffHandoff.nextRequiredActionZh ||
              '交接包不放行真实执行',
            status: releaseSignoffHandoff.canReleaseExecutionNow ? 'warn' : 'blocked',
          },
        ]
      : []),
    {
      label: '执行释放包',
      value: releasePacket.statusZh || releasePacket.status || '等待执行释放包',
      hint:
        packetCodes ||
        (packetBlocked || packetActivationBlocked
          ? `${packetBlocked} release / ${packetActivationBlocked} MT5 gates`
          : releasePacket.nextRequiredActionZh || '只读展示 release 前置证据'),
      status: releasePacket.canReleaseExecutionNow ? 'ok' : 'blocked',
    },
    {
      label: 'MT5订单写入',
      value: boolText(Boolean(decision.writesMt5OrderRequest || decision.orderSendAllowed)),
      hint: '保持否；总览页只读展示，不触发订单',
      status: 'blocked',
    },
    {
      label: 'Broker调用',
      value: boolText(Boolean(decision.brokerCallsMade)),
      hint: '没有真实 broker order_send 调用',
      status: 'blocked',
    },
  ];
}

export function buildActivationGateRows(snapshot = {}) {
  return snapshot.activationGateRows || [];
}

export function buildReleaseGateRows(snapshot = {}) {
  return snapshot.executionReleaseGateRows || [];
}

export function buildSnapshotRecoveryItems(snapshot = {}) {
  const recovery = snapshot.snapshotRecovery || {};
  return [
    {
      label: '当前结论',
      value: recovery.label || '等待快照诊断',
      status: recovery.status || 'warn',
      hint: recovery.nextAction || '等待 /api/latest 与 MT5 只读桥返回 freshness。',
    },
    {
      label: '实时账号状态',
      value: recovery.realtimeUsable ? '可作为当前状态' : '不可作为当前状态',
      status: recovery.realtimeUsable ? 'ok' : 'blocked',
      hint: recovery.staleSources?.length
        ? `${recovery.staleSources.join(' / ')} 已过期`
        : '账户、持仓与执行状态必须依赖新鲜 MT5/EA 快照。',
    },
    {
      label: '主账号进程',
      value: recovery.primaryProcessLine || '待确认',
      status: recovery.primaryProcessLine?.includes('未检测到') ? 'blocked' : 'warn',
    },
    {
      label: 'Live16 进程',
      value: recovery.secondaryProcessLine || '待确认',
      status: recovery.secondaryProcessLine?.includes('未检测到') ? 'blocked' : 'warn',
    },
    {
      label: 'USDJPY Live Loop',
      value: recovery.liveLoopUsable ? '可用于只读诊断' : liveLoopStatusValue(recovery.liveLoopFreshness),
      status: recovery.liveLoopFreshness?.hardStale ? 'blocked' : recovery.liveLoopUsable ? 'ok' : 'warn',
      hint: recovery.liveLoopNextAction || recovery.liveLoopLine,
    },
    {
      label: 'HFM Crypto 研究证据',
      value: recovery.hfmShadowUsable ? '仍可用于 shadow 研究' : '等待证据',
      status: recovery.hfmShadowUsable ? 'ok' : 'warn',
      hint: recovery.hfmLine,
    },
    {
      label: '合计模拟目标',
      value: snapshot.dualTargetReached ? '达标证据已读到' : '继续等待/复核',
      status: snapshot.dualTargetReached ? 'ok' : snapshot.profitTargetStatus || 'warn',
      hint: recovery.profitTargetLine || snapshot.profitTargetStatusLabel,
    },
  ];
}

export function buildSnapshotRecoveryRows(snapshot = {}) {
  const recovery = snapshot.snapshotRecovery || {};
  return [
    {
      区域: '总览账户/持仓',
      状态: recovery.realtimeUsable ? '可读当前状态' : '实时状态不可确认',
      影响: recovery.realtimeUsable
        ? '净值、持仓、执行状态可以按当前快照展示'
        : '净值、持仓、执行状态只能作为历史参考',
      下一步: recovery.nextAction || '等待新鲜 MT5 dashboard',
    },
    {
      区域: '主 MT5 Live12',
      状态: snapshot.mt5HostProcessMissing
        ? 'writer 未运行'
        : snapshot.mt5SnapshotStale
          ? '快照过期'
          : snapshot.mt5SnapshotFreshness?.fresh
            ? '新鲜'
            : '待确认',
      影响:
        snapshot.mt5HostProcessMissing || snapshot.mt5SnapshotStale
          ? '外币/RSI 当前执行状态不可确认'
          : '可继续只读观察',
      下一步:
        (snapshot.mt5HostProcessMissing ? recovery.primaryProcessLine : '') ||
        snapshot.mt5SnapshotFreshness?.nextActionZh ||
        snapshot.mt5SnapshotFreshness?.nextAction ||
        recovery.primaryProcessLine ||
        '等待主账号只读桥',
    },
    {
      区域: 'Live16 / HFM Crypto',
      状态: snapshot.secondaryMt5HostProcessMissing
        ? 'writer 未运行'
        : snapshot.secondaryMt5SnapshotStale
          ? '依赖快照过期'
          : snapshot.secondaryMt5SnapshotFreshness?.fresh
            ? '新鲜'
            : '待确认',
      影响:
        snapshot.secondaryMt5HostProcessMissing || snapshot.secondaryMt5SnapshotStale
          ? 'HFM Crypto shadow 证据可读，但当前 Live16 账号状态不可确认'
          : '可把 Live16 快照作为当前账号证据',
      下一步:
        (snapshot.secondaryMt5HostProcessMissing ? recovery.secondaryProcessLine : '') ||
        snapshot.secondaryMt5SnapshotFreshness?.nextActionZh ||
        snapshot.secondaryMt5SnapshotFreshness?.nextAction ||
        recovery.secondaryProcessLine ||
        '等待 Live16 只读桥',
    },
    {
      区域: 'USDJPY live-loop',
      状态: snapshot.usdJpyLiveLoopStale
        ? '依赖运行快照严重过期'
        : snapshot.usdJpyLiveLoopFreshness?.fresh
          ? '新鲜'
          : liveLoopStatusValue(snapshot.usdJpyLiveLoopFreshness),
      影响: snapshot.usdJpyLiveLoopStale
        ? '策略闭环仍可给出诊断，但不能替代当前 MT5 账号快照'
        : '可辅助判断 USDJPY RSI 路线和入场阻断',
      下一步:
        snapshot.usdJpyLiveLoopFreshness?.nextActionZh ||
        snapshot.usdJpyLiveLoopFreshness?.reasonLine ||
        '刷新 USDJPY live-loop',
    },
    {
      区域: 'HFM Crypto shadow',
      状态: recovery.hfmShadowUsable ? '研究证据可用' : '等待研究证据',
      影响: recovery.hfmShadowUsable
        ? 'symbol/spec/Moss/backtest 证据仍可看；不能替代当前账号快照'
        : '无法判断 crypto CFD 研究状态',
      下一步: recovery.hfmLine || '刷新 HFM Crypto 状态',
    },
  ];
}

export function buildRuntimeItems(snapshot) {
  if (snapshot.latestDashboardStale) {
    const hint = dashboardFreshnessHint(snapshot);
    const processMissing = snapshot.snapshotRecovery?.processMissing === true;
    return [
      {
        label: '运行状态',
        value: processMissing ? 'writer 未运行' : '快照过期',
        status: processMissing ? 'blocked' : 'warn',
        hint: processMissing ? snapshot.snapshotRecovery?.nextAction || hint : hint,
      },
      { label: '更新时间', value: snapshot.updatedAt, hint: 'MT5 dashboard 文件 mtime' },
      {
        label: '主 MT5 只读桥',
        value: mt5BridgeValue({
          stale: snapshot.mt5SnapshotStale,
          fresh: snapshot.mt5SnapshotFreshness?.fresh,
          processMissing: snapshot.mt5HostProcessMissing,
        }),
        status: mt5BridgeStatus({
          stale: snapshot.mt5SnapshotStale,
          fresh: snapshot.mt5SnapshotFreshness?.fresh,
          processMissing: snapshot.mt5HostProcessMissing,
        }),
        hint: mt5BridgeHint({
          line: snapshot.mt5SnapshotFreshnessLine,
          freshness: snapshot.mt5SnapshotFreshness,
          processLine: snapshot.snapshotRecovery?.primaryProcessLine,
          processMissing: snapshot.mt5HostProcessMissing,
          fallback: '等待 /api/mt5-readonly/snapshot 新鲜度',
        }),
      },
      {
        label: 'Live16 只读桥',
        value: mt5BridgeValue({
          stale: snapshot.secondaryMt5SnapshotStale,
          fresh: snapshot.secondaryMt5SnapshotFreshness?.fresh,
          processMissing: snapshot.secondaryMt5HostProcessMissing,
        }),
        status: mt5BridgeStatus({
          stale: snapshot.secondaryMt5SnapshotStale,
          fresh: snapshot.secondaryMt5SnapshotFreshness?.fresh,
          processMissing: snapshot.secondaryMt5HostProcessMissing,
        }),
        hint: mt5BridgeHint({
          line: snapshot.secondaryMt5SnapshotFreshnessLine,
          freshness: snapshot.secondaryMt5SnapshotFreshness,
          processLine: snapshot.snapshotRecovery?.secondaryProcessLine,
          processMissing: snapshot.secondaryMt5HostProcessMissing,
          fallback: '等待 /api/mt5-readonly-secondary/snapshot 新鲜度',
        }),
      },
      {
        label: 'USDJPY Live Loop',
        value: liveLoopStatusValue(snapshot.usdJpyLiveLoopFreshness),
        status: snapshot.usdJpyLiveLoopFreshness?.hardStale
          ? 'blocked'
          : snapshot.usdJpyLiveLoopFreshness?.fresh
            ? 'ok'
            : 'warn',
        hint:
          snapshot.usdJpyLiveLoopFreshness?.nextActionZh ||
          snapshot.usdJpyLiveLoopFreshness?.reasonLine ||
          '等待 /api/usdjpy-strategy-lab/live-loop',
      },
      { label: '熔断保护', value: '不可判定', status: 'warn', hint: '等待新鲜 MT5 快照' },
      { label: '模拟保护', value: '不可判定', status: 'warn', hint: '等待新鲜 MT5 快照' },
      { label: '当前路线', value: '历史快照', hint },
    ];
  }
  return [
    {
      label: '运行状态',
      value: humanizeStatus(snapshot.runtimeState),
      status: snapshot.runtimeState === 'missing' ? 'warn' : 'ok',
    },
    { label: '更新时间', value: snapshot.updatedAt },
    {
      label: '主 MT5 只读桥',
      value: mt5BridgeValue({
        stale: snapshot.mt5SnapshotStale,
        fresh: snapshot.mt5SnapshotFreshness?.fresh,
        processMissing: snapshot.mt5HostProcessMissing,
      }),
      status: mt5BridgeStatus({
        stale: snapshot.mt5SnapshotStale,
        fresh: snapshot.mt5SnapshotFreshness?.fresh,
        processMissing: snapshot.mt5HostProcessMissing,
      }),
      hint: mt5BridgeHint({
        line: snapshot.mt5SnapshotFreshnessLine,
        freshness: snapshot.mt5SnapshotFreshness,
        processLine: snapshot.snapshotRecovery?.primaryProcessLine,
        processMissing: snapshot.mt5HostProcessMissing,
        fallback: '等待 /api/mt5-readonly/snapshot 新鲜度',
      }),
    },
    {
      label: 'Live16 只读桥',
      value: mt5BridgeValue({
        stale: snapshot.secondaryMt5SnapshotStale,
        fresh: snapshot.secondaryMt5SnapshotFreshness?.fresh,
        processMissing: snapshot.secondaryMt5HostProcessMissing,
      }),
      status: mt5BridgeStatus({
        stale: snapshot.secondaryMt5SnapshotStale,
        fresh: snapshot.secondaryMt5SnapshotFreshness?.fresh,
        processMissing: snapshot.secondaryMt5HostProcessMissing,
      }),
      hint: mt5BridgeHint({
        line: snapshot.secondaryMt5SnapshotFreshnessLine,
        freshness: snapshot.secondaryMt5SnapshotFreshness,
        processLine: snapshot.snapshotRecovery?.secondaryProcessLine,
        processMissing: snapshot.secondaryMt5HostProcessMissing,
        fallback: '等待 /api/mt5-readonly-secondary/snapshot 新鲜度',
      }),
    },
    {
      label: 'USDJPY Live Loop',
      value: liveLoopStatusValue(snapshot.usdJpyLiveLoopFreshness),
      status: snapshot.usdJpyLiveLoopFreshness?.hardStale
        ? 'blocked'
        : snapshot.usdJpyLiveLoopFreshness?.fresh
          ? 'ok'
          : 'warn',
      hint:
        snapshot.usdJpyLiveLoopFreshness?.nextActionZh ||
        snapshot.usdJpyLiveLoopFreshness?.reasonLine ||
        '等待 /api/usdjpy-strategy-lab/live-loop',
    },
    { label: '熔断保护', value: humanizeStatus(snapshot.killSwitchLabel), status: snapshot.killSwitchStatus },
    { label: '模拟保护', value: humanizeStatus(snapshot.dryRunLabel), status: snapshot.dryRunStatus },
    { label: '当前路线', value: formatCompact(snapshot.activeRoute) },
  ];
}

export function buildDailyItems(snapshot) {
  const history = snapshot.historyProductionStatus || {};
  const historyStatus = String(history.status || '').toUpperCase();
  const historyPromotionStatus = String(history.promotionGateStatus || '').toUpperCase();
  const historyFreshnessStatus = String(history.historyFreshnessStatus || '').toUpperCase();
  const historyBlocked = Boolean(
    history.historyFreshnessBlocksPromotion ||
      historyPromotionStatus === 'BLOCKED' ||
      historyStatus === 'BLOCKED' ||
      historyStatus === 'FAIL' ||
      historyStatus === 'FAILED' ||
      historyFreshnessStatus === 'HISTORY_FRESHNESS_BLOCKED' ||
      historyFreshnessStatus === 'HISTORY_PRODUCTION_STATUS_MISSING',
  );
  const historyPass =
    !historyBlocked &&
    (historyPromotionStatus === 'PASS' ||
      historyStatus === 'PASS' ||
      historyFreshnessStatus === 'HISTORY_FRESHNESS_PASS');
  const historyTimeframes = [...new Set([...toArray(history.failedTimeframes), ...toArray(history.staleTimeframes)])];
  const historyHint = [
    `晋级门 ${history.promotionGateStatus || (historyBlocked ? 'BLOCKED' : '等待')}`,
    history.historyFreshnessStatus ? `freshness ${history.historyFreshnessStatus}` : '',
    codeListLine(history.blockers),
    historyTimeframes.length ? `周期 ${historyTimeframes.join('/')}` : '',
    history.reasonZh || (!historyPass ? '未 PASS 时只允许 shadow/tester 观察' : ''),
  ]
    .filter(Boolean)
    .join(' · ');
  return [
    {
      label: '每日复盘',
      value: snapshot.dailyReviewAvailable ? '已生成' : '缺失',
      status: snapshot.dailyReviewAvailable ? 'ok' : 'warn',
    },
    {
      label: '今日自动闭环',
      value: snapshot.dailyAutopilotAvailable ? snapshot.autopilotStatus : '缺失',
      status: snapshot.dailyAutopilotAvailable ? 'ok' : 'warn',
    },
    {
      label: 'GA 历史样本',
      value:
        historyBlocked && history.historyFreshnessStatus
          ? history.statusZh || '历史 freshness 阻断晋级'
          : history.statusZh || history.status || '等待生产状态',
      status: historyPass ? 'ok' : historyBlocked ? 'blocked' : 'warn',
      hint: historyHint,
    },
    {
      label: '策略回测摘要',
      value: snapshot.backtestAvailable ? '已同步' : '缺失',
      status: snapshot.backtestAvailable ? 'ok' : 'warn',
    },
  ];
}

function statusToUi(value) {
  const text = String(value || '').toUpperCase();
  if (text === 'PASS' || text === 'OK' || text === 'HEALTHY') return 'ok';
  if (text === 'BLOCKED' || text === 'FAIL' || text === 'FAILED') return 'blocked';
  return 'warn';
}

function formatAgeSeconds(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '等待同步';
  if (numeric < 60) return `${Math.round(numeric)} 秒前`;
  if (numeric < 3600) return `${Math.round(numeric / 60)} 分钟前`;
  return `${(numeric / 3600).toFixed(1)} 小时前`;
}

export function buildAgentOpsItems(raw = {}) {
  const health = raw.agentOpsHealth || {};
  const daily = health.dailyAutopilot || {};
  const hfmCrypto = raw.hfmCrypto || health.hfmCrypto || {};
  const telegram = raw.telegramGateway || health.telegramGateway || {};
  return [
    {
      label: '系统自动化健康',
      value:
        health.systemStatusZh ||
        health.overallStatusZh ||
        health.systemStatus ||
        health.overallStatus ||
        '等待 Agent 健康检查',
      status: statusToUi(health.systemStatus || health.overallStatus),
      hint:
        health.blockers?.[0] ||
        health.warnings?.[0] ||
        'Agent 循环、Daily Autopilot 和 Telegram Gateway 单独计入系统健康。',
    },
    {
      label: '策略观察健康',
      value: health.strategyStatusZh || health.strategyStatus || '等待策略观察',
      status: statusToUi(health.strategyStatus),
      hint:
        health.strategyBlockers?.[0] ||
        health.strategyWarnings?.[0] ||
        'HFM Crypto / MT5 shadow 的阻塞或隔离只作为策略观察，不染黄系统自动化。',
    },
    {
      label: 'Daily Autopilot',
      value: daily.statusZh || daily.status || '等待运行',
      status: statusToUi(daily.status),
      hint: `最近运行 ${formatAgeSeconds(daily.lastRunAgeSeconds)}；失败步骤 ${daily.failedStepCount || 0}`,
    },
    {
      label: 'HFM Crypto shadow',
      value: hfmCrypto.statusZh || hfmCrypto.status || '等待 crypto CFD symbol',
      status: statusToUi(hfmCrypto.status),
      hint:
        hfmCrypto.blockers?.[0]?.reasonZh ||
        '只读扫描 HFM crypto CFD 与 Moss backtest 资料，执行权限保持关闭。',
    },
    {
      label: 'Telegram Gateway',
      value: telegram.pushAllowed ? 'push-only 已开启' : '只生成不发送',
      status: statusToUi(telegram.status),
      hint: `待投递 ${telegram.pendingCount || 0}；成功 ${telegram.deliveredCount || 0}；最近 ${telegram.lastTopic || '—'}`,
    },
  ];
}

export function telegramGatewayStatus(raw = {}) {
  const gateway = raw.telegramGateway || raw.agentOpsHealth?.telegramGateway || {};
  if (gateway.commandsAllowed) return 'blocked';
  if (!gateway.pushAllowed) return 'warn';
  if (Number(gateway.pendingCount || 0) > 0) return 'warn';
  return 'ok';
}

export function telegramGatewayStatusLabel(raw = {}) {
  const gateway = raw.telegramGateway || raw.agentOpsHealth?.telegramGateway || {};
  if (gateway.commandsAllowed) return 'Telegram 命令未关闭';
  if (!gateway.pushAllowed) return '只生成消息，未开启发送';
  if (Number(gateway.pendingCount || 0) > 0) return '等待投递';
  return '自动推送已运行';
}

export function buildTelegramGatewayItems(raw = {}) {
  const gateway = raw.telegramGateway || raw.agentOpsHealth?.telegramGateway || {};
  const loop = raw.agentOpsHealth?.agentV25Loop || {};
  const lastDelivery = gateway.lastDelivery || {};
  const observability = gateway.deliveryObservability || {};
  const lastActualSentAt = gateway.lastActualSentAtIso || observability.lastActualSentAtIso;
  const lastSuppressedAt = gateway.lastSuppressedAtIso || observability.lastSuppressedAtIso;
  const lastSuppressedReason = gateway.lastSuppressedReason || observability.lastSuppressedReason;
  const nextEligibleSendAt = gateway.nextEligibleSendAtIso || observability.nextEligibleSendAtIso;
  const sentCountByTopic = gateway.sentCountByTopic || observability.sentCountByTopic || {};
  const pendingByTopic = gateway.pendingByTopic || observability.pendingByTopic || {};
  const topicQueueCount = Object.values(pendingByTopic).reduce((sum, value) => sum + numberValue(value), 0);
  const lastDeliveryOk =
    lastDelivery.ok === true ||
    lastDelivery.reason === 'duplicate_suppressed' ||
    lastDelivery.skipped === true;
  const items = [
    {
      label: '后台循环',
      value: loop.statusZh || loop.status || '等待心跳',
      status: statusToUi(loop.status),
      hint: loop.detailZh || 'Agent v2.5 loop 负责定时收集日报、GA、回滚和 HFM Crypto shadow。',
    },
    {
      label: '推送通道',
      value: gateway.pushAllowed ? 'push-only 已开启' : '未开启真实发送',
      status: gateway.pushAllowed ? 'ok' : 'warn',
      hint: gateway.reasonZh || 'Telegram Gateway 统一排队、去重、限频和投递。',
    },
    {
      label: '命令入口',
      value: gateway.commandsAllowed ? '命令未关闭' : '命令关闭',
      status: gateway.commandsAllowed ? 'blocked' : 'ok',
      hint: '只允许中文推送，不接收 Telegram 交易命令。',
    },
    {
      label: '队列',
      value: `待投递 ${gateway.pendingCount || 0} / 队列 ${gateway.queuedCount || 0}`,
      status: Number(gateway.pendingCount || 0) > 0 ? 'warn' : 'ok',
      hint: `账本 ${gateway.ledgerCount || 0}；成功 ${gateway.deliveredCount || 0}`,
    },
    {
      label: '最近主题',
      value: gateway.lastTopic || '等待投递',
      status: lastDeliveryOk ? 'ok' : statusToUi(lastDelivery.ok === false ? 'WARN' : gateway.status),
      hint:
        lastDelivery.reason === 'duplicate_suppressed'
          ? '最近一次被去重抑制，说明后台已运行且避免重复刷屏。'
          : gateway.lastDeliveryAt || gateway.lastDispatchAt || '等待后台循环写入投递结果。',
    },
  ];
  items.push(
    {
      label: '最近真实发送',
      value: formatIsoMinute(lastActualSentAt),
      status: lastActualSentAt ? 'ok' : 'warn',
      hint: `真实投递按 topic 统计：${formatTopicCounts(sentCountByTopic)}`,
    },
    {
      label: '最近抑制',
      value: lastSuppressedReason
        ? `${deliveryReasonLabel(lastSuppressedReason)} · ${formatIsoMinute(lastSuppressedAt)}`
        : '暂无抑制',
      status: 'ok',
      hint: '重复去重、限频和只生成未发送都会写入 ledger，用来解释为什么本轮没有刷屏。',
    },
    {
      label: '下次可发送',
      value: nextEligibleSendAt ? formatIsoMinute(nextEligibleSendAt) : '当前可发送',
      status: nextEligibleSendAt ? 'warn' : 'ok',
      hint: nextEligibleSendAt ? 'Gateway 正在限频窗口内，下一小时会恢复投递。' : '未处于限频窗口。',
    },
    {
      label: 'Topic 队列',
      value: formatTopicCounts(pendingByTopic),
      status: topicQueueCount > 0 ? 'warn' : 'ok',
      hint: topicQueueCount > 0 ? '仍有 topic 等待真实投递。' : '各 topic 暂无积压。',
    },
  );
  return items;
}

export function buildAgentOpsRows(raw = {}) {
  const checks = rowsFromObjectList(raw?.agentOpsHealth?.checks);
  if (!checks.length) {
    return [
      {
        检查: 'Agent Ops Health',
        状态: '等待同步',
        说明: '等待后端聚合 Daily Autopilot、HFM Crypto shadow 和 Telegram Gateway。',
      },
    ];
  }
  return checks.map((check) => ({
    检查: check.label || check.key || '自动化检查',
    类型: check.category === 'strategy' ? '策略观察' : '系统自动化',
    状态: check.statusZh || check.status || '需要观察',
    指标: formatCompact(check.metric),
    说明: check.detailZh || '—',
  }));
}

export function buildRouteRows(snapshot) {
  return snapshot.routes.slice(0, 8).map((route, index) => ({
    id: route.id || route.route || route.name || `route-${index}`,
    route: route.route || route.name || route.strategy || `路线 ${index + 1}`,
    status: route.status || route.decision || route.state || 'unknown',
    score: formatCompact(route.score ?? route.confidence ?? route.pf ?? route.profit_factor),
    note: route.note || route.reason || route.reasoning || route.next_step || '',
  }));
}

export function buildDailyTodoRows(raw = {}) {
  if (!dailyReviewIsFresh(raw.dailyReview)) {
    return [
      {
        领域: 'Agent',
        任务: '今日待办',
        状态: '等待今日刷新',
        结论: 'DailyReview 不是今天生成，旧日期和非 USDJPY 队列已隐藏',
      },
    ];
  }
  const summary = dailySummary(raw);
  const queue = focusScopedRows(raw?.dailyReview?.actionQueue);
  const completed = focusScopedRows(raw?.dailyReview?.completedActionQueue);
  const researchBacklog = focusScopedRows(raw?.dailyReview?.researchBacklogQueue);
  const hfmRows = hfmCryptoRows(raw);
  const hfmDiagnosticLine = hfmCryptoSummaryLine(raw);
  const hfmProbeLine = hfmCryptoRuntimeProbeLine(raw);
  const profitRows = profitTargetRows(raw);
  const profitLine = profitTargetLine(raw);
  const rows = [];

  queue.slice(0, 8).forEach((item) => {
    rows.push({
      领域: item.routeKey || item.strategy ? 'MT5 / 参数实验' : '全局',
      任务: item.candidateId || item.type || '待处理任务',
      状态: item.state || item.statusLabel || '待处理',
      结论: item.resultStatus || item.guardClass || item.statusLabel || '等待执行',
    });
  });

  if (!rows.length && completed.length) {
    completed.slice(0, 5).forEach((item) => {
      rows.push({
        领域: item.routeKey || item.strategy ? 'MT5 / 参数实验' : '全局',
        任务: item.candidateId || item.type || '已处理任务',
        状态: '已完成',
        结论: item.resultStatus || item.statusLabel || '报告已回灌',
      });
    });
  }

  if (researchBacklog.length) {
    rows.push({
      领域: 'MT5 / 参数实验',
      任务: '新候选已进入下一轮研究',
      状态: `${researchBacklog.length} 项待下一轮刷新`,
      结论: '今日 tester 已跑完；剩余候选先放入研究 backlog，不算未完成待办',
    });
  }

  if (hfmRows.length) {
    rows.push({
      领域: 'HFM Crypto',
      任务: hfmProbeLine
        ? 'BTC runtime probe'
        : hfmDiagnosticLine
          ? '账号 symbol 探测'
          : 'Crypto CFD symbol 与 Moss 资料',
      状态: hfmDiagnosticLine || `已同步 ${hfmRows.length} 条候选或证据`,
      结论: hfmProbeLine || raw?.hfmCrypto?.blockers?.[0]?.reasonZh || '只读研究，不自动下单',
    });
  }

  if (profitRows.length) {
    const executionLine = profitExecutionConclusionLine(raw);
    rows.push({
      领域: '合计模拟目标',
      任务: '外币或 BTC 任一 lane 达标，或多 lane 净合计达到 50 USD',
      状态: profitTargetStatusLabel(raw),
      结论:
        executionLine ||
        raw?.profitTarget?.liveCutoverGate?.statusZh ||
        profitLine ||
        '达到模拟目标后仍需单独 execution lane 评审',
    });
  }

  if (!rows.length) {
    rows.push({
      领域: '全系统',
      任务: '今日待办',
      状态: summary.todayTodoStatus === 'DONE_OR_NO_ACTIONS' ? '已完成' : '暂无动作',
      结论: 'MT5 与 HFM Crypto 今日没有未处理阻塞项',
    });
  }
  return rows.slice(0, 10);
}

export function buildDailyReviewRows(raw = {}) {
  if (!dailyReviewIsFresh(raw.dailyReview)) {
    return [
      {
        领域: 'Agent',
        复盘: '等待今日刷新',
        结果: '旧复盘已隐藏',
        建议: '本地 DailyReview 不是今天生成；刷新 API 会重新生成今日版本',
      },
    ];
  }
  const summary = dailySummary(raw);
  const pnl = dailyPnl(raw);
  const iteration = raw?.dailyReview?.dailyIteration || {};
  const findings = rowsFromObjectList(iteration.findings);
  const strategyQueue = focusScopedRows(iteration.strategyIterationQueue);
  const evidenceQueue = focusScopedRows(iteration.evidenceIterationQueue);
  const noTradeFinding = findings.find((item) => item.code === 'PARAMLAB_NO_TRADE_TESTER_WINDOWS');
  const steps = rowsFromObjectList(raw?.dailyAutopilot?.steps);
  const hfmRows = hfmCryptoRows(raw);
  const hfmDiagnosticLine = hfmCryptoSummaryLine(raw);
  const hfmProbeLine = hfmCryptoRuntimeProbeLine(raw);
  const profitLine = profitTargetLine(raw);
  const executionLine = profitExecutionConclusionLine(raw);
  const dailyAutopilotPresent = endpointAvailable(raw?.dailyAutopilot);
  const hfmStep = steps.find((step) => step.name === 'hfm_crypto_shadow_cycle');
  const testerTimeout = steps.find(
    (step) => step.name === 'auto_tester_guarded_run' && step.status === 'TIMEOUT',
  );
  return [
    {
      领域: 'MT5',
      复盘: `${pnl.date || summary.dailyReviewDateJst || '今日'} 平仓 ${pnl.closedTrades ?? summary.dailyClosedTrades ?? 0} 笔`,
      结果: formatMoney(pnl.netUSC ?? summary.dailyNetUSC ?? 0, 'USC'),
      建议: pnl.requiresReview ? 'Agent 已标记亏损来源，等待证据闭环' : '当前无新增亏损复核',
    },
    {
      领域: '参数实验',
      复盘: `完成 ${summary.dailyTesterCompletedCount || 0} 项 / 延后 ${summary.paramDeferredCount || 0} 项`,
      结果: noTradeFinding ? '全部无成交样本' : summary.dailyTesterBudgetDone ? '预算已完成' : '仍有待办',
      建议: noTradeFinding
        ? '需要只在隔离 tester 调宽窗口或阈值，重新生成可学习样本'
        : summary.promotionReviewCount
          ? '存在 Agent 治理门候选'
          : '暂无可自动升实盘项',
    },
    {
      领域: 'HFM Crypto',
      复盘: hfmStep?.status === 'OK' ? '研究循环已执行' : '研究循环待确认',
      结果: hfmDiagnosticLine || `Crypto CFD 候选/证据 ${hfmRows.length} 条`,
      建议: hfmProbeLine
        ? hfmProbeLine
        : raw?.hfmCrypto?.symbolEvidence?.found || raw?.hfmCrypto?.localEvidence?.found
          ? '可以继续做 shadow-only 策略映射'
          : raw?.hfmCrypto?.blockers?.[0]?.reasonZh
            ? raw.hfmCrypto.blockers[0].reasonZh
            : '先在 HFM MT5 下载 crypto 历史，再进入下一阶段设计',
    },
    {
      领域: '合计模拟目标',
      复盘: profitTargetStatusLabel(raw),
      结果: profitLine || '等待证据',
      建议: executionLine || raw?.profitTarget?.liveCutoverGate?.reasonZh || '实盘前继续保持订单写入关闭。',
    },
    {
      领域: '自动闭环',
      复盘: dailyAutopilotPresent ? raw.dailyAutopilot.status || '已生成' : '缺失',
      结果: dailyAutopilotPresent
        ? testerTimeout
          ? '测试器运行超时但后续报告已回灌'
          : '闭环完成'
        : '等待 /api/daily-autopilot',
      建议: dailyAutopilotPresent
        ? summary.dailyIterationRequired
          ? `需要迭代：策略 ${strategyQueue.length} 项 / 证据 ${evidenceQueue.length} 项`
          : '今日无需代码变更'
        : '先恢复 /api/daily-autopilot 或等待今日自动闭环生成后再判定完成',
    },
  ];
}
