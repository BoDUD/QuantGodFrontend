import { formatDisplayValue, humanizeLabel } from '../utils/displayText.js';

const JSON_HEADERS = { Accept: 'application/json' };

export const PHASE2_ENDPOINTS = Object.freeze({
  governance: [
    ['/api/governance/advisor', '治理建议'],
    ['/api/governance/version-registry', '策略版本登记'],
    ['/api/governance/promotion-gate', '升实盘闸门'],
    ['/api/governance/optimizer-v2', '优化器结果'],
  ],
  paramlab: [
    ['/api/paramlab/status', '实验状态'],
    ['/api/paramlab/results', '实验结果'],
    ['/api/paramlab/scheduler', '排队调度'],
    ['/api/paramlab/recovery', '失败恢复'],
    ['/api/paramlab/report-watcher', '报告回灌'],
    ['/api/paramlab/tester-window', '测试器窗口'],
  ],
  trades: [
    ['/api/trades/journal?limit=200', '交易流水'],
    ['/api/trades/close-history?limit=200', '历史平仓'],
    ['/api/trades/outcome-labels?limit=200', '交易结果标签'],
    ['/api/trades/trading-audit?limit=200', '交易审计'],
  ],
  research: [
    ['/api/research/stats', '研究统计'],
    ['/api/research/stats-ledger?limit=200', '研究统计流水'],
    ['/api/research/strategy-evaluation?limit=200', '策略评估'],
    ['/api/research/regime-evaluation?limit=200', '行情环境评估'],
    ['/api/research/manual-alpha?limit=200', '人工 Alpha 记录'],
  ],
  shadow: [
    ['/api/shadow/signals?days=7&limit=200', '模拟信号'],
    ['/api/shadow/candidates?limit=200', '模拟候选'],
    ['/api/shadow/outcomes?limit=200', '模拟结果'],
    ['/api/shadow/candidate-outcomes?limit=200', '候选结果'],
  ],
  dashboard: [
    ['/api/dashboard/state', '总览状态'],
    ['/api/dashboard/backtest-summary', '回测摘要'],
  ],
});

export async function apiGet(url, fallback = null) {
  try {
    const response = await fetch(url, { headers: JSON_HEADERS, cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return payload || fallback || { ok: false, error: `HTTP ${response.status}`, endpoint: url };
    }
    return payload;
  } catch (error) {
    return fallback || { ok: false, error: error?.message || String(error), endpoint: url };
  }
}

export async function apiPost(url, payload = {}, fallback = null) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload || {}),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return body || fallback || { ok: false, error: `HTTP ${response.status}`, endpoint: url };
    }
    return body;
  } catch (error) {
    return fallback || { ok: false, error: error?.message || String(error), endpoint: url };
  }
}

export function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload?.rows,
    payload?.items,
    payload?.routeDecisions,
    payload?.governanceDecisions,
    payload?.decisions,
    payload?.routes,
    payload?.data?.rows,
    payload?.data?.items,
    payload?.data?.routeDecisions,
    payload?.data?.governanceDecisions,
    payload?.data?.decisions,
    payload?.data?.routes,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }
  if (payload?.data && typeof payload.data === 'object') return readableRows(payload.data);
  if (payload && typeof payload === 'object') return readableRows(payload);
  return [];
}

const SKIP_SUMMARY_KEYS = new Set([
  'schemaVersion',
  'endpoint',
  'runtimeDir',
  'filePath',
  'sourcePath',
  '_api',
  '_phase2',
  'safety',
  'principles',
  'hardGuards',
  'systemHealth',
  'files',
]);

function readableRows(source) {
  const roots = [source.summary, source.globalState, source].filter(
    (item) => item && typeof item === 'object' && !Array.isArray(item),
  );
  const rows = [];
  for (const root of roots) {
    for (const [key, value] of Object.entries(root)) {
      if (SKIP_SUMMARY_KEYS.has(key) || value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        rows.push({ 项目: humanizeLabel(key), 内容: `${value.length} 项` });
      } else if (value && typeof value === 'object') {
        rows.push({ 项目: humanizeLabel(key), 内容: formatDisplayValue(value, { max: 96 }) });
      } else {
        rows.push({ 项目: humanizeLabel(key), 内容: formatDisplayValue(value, { max: 96 }) });
      }
      if (rows.length >= 12) return rows;
    }
  }
  return rows;
}

export function tableColumns(rows) {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row || {})))]
    .filter((key) => !key.startsWith('_'))
    .slice(0, 8);
  return keys.map((key) => ({
    title: humanizeLabel(key),
    dataIndex: key,
    key,
    ellipsis: true,
    sorter: (a, b) => String(a?.[key] ?? '').localeCompare(String(b?.[key] ?? '')),
  }));
}

export function endpointSummary(payload) {
  const source = payload?.source || payload?._api || payload?._phase2 || {};
  return {
    ok: payload?.ok !== false,
    fileName: source.fileName || '--',
    mtimeIso: source.mtimeIso || '--',
    returnedRows: payload?.data?.returnedRows ?? extractRows(payload).length,
  };
}

export function loadNotifyConfig() {
  return apiGet('/api/notify/config', { ok: false, error: 'notify_config_failed' });
}

export function loadNotifyHistory(limit = 50) {
  return apiGet(`/api/notify/history?limit=${Number(limit) || 50}`, { ok: false, items: [] });
}

export function sendNotifyTest(message, dryRun = false) {
  return apiPost('/api/notify/test', { message, dryRun }, { ok: false, error: 'notify_test_failed' });
}
