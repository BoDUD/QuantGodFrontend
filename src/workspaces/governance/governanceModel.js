/**
 * QuantGod governance workspace model.
 *
 * The model normalizes advisory/governance evidence for display only. It must
 * never create a write request, promote/demote a route, mutate a live preset, or
 * expose execution affordances.
 */

const UNKNOWN = 'unknown';
const EMPTY_TEXT = '—';

export const GOVERNANCE_SAFETY_DEFAULTS = Object.freeze({
  advisoryOnly: true,
  readOnlyDataPlane: true,
  orderSendAllowed: false,
  closeAllowed: false,
  cancelAllowed: false,
  credentialStorageAllowed: false,
  livePresetMutationAllowed: false,
  canOverrideKillSwitch: false,
  canMutateGovernanceDecision: false,
  canPromoteOrDemoteRoute: false,
  requiresManualAuthorization: true,
});

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function valueAt(payload, path) {
  if (!payload || !path) return undefined;
  const parts = Array.isArray(path) ? path : String(path).split('.');
  let current = payload;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function pick(payload, paths, fallback = EMPTY_TEXT) {
  for (const path of paths) {
    const value = valueAt(payload, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function boolFrom(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'y', '1', 'enabled', 'active', 'allow', 'allowed'].includes(normalized)) return true;
    if (['false', 'no', 'n', '0', 'disabled', 'inactive', 'deny', 'denied', 'blocked'].includes(normalized)) return false;
  }
  return fallback;
}

function numberFrom(value, fallback = null) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function formatPercent(value) {
  const num = numberFrom(value, null);
  if (num === null) return EMPTY_TEXT;
  if (num <= 1) return `${Math.round(num * 100)}%`;
  return `${Math.round(num)}%`;
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.routes)) return payload.routes;
  if (Array.isArray(payload?.registry)) return payload.registry;
  if (Array.isArray(payload?.versions)) return payload.versions;
  if (Array.isArray(payload?.strategies)) return payload.strategies;
  if (isObject(payload?.data)) return Object.values(payload.data).filter(isObject);
  if (isObject(payload)) return Object.values(payload).filter(isObject);
  return [];
}

function statusFromAvailability(value) {
  return value ? 'ok' : 'unknown';
}

function decisionStatus(value) {
  const normalized = String(value || '').toLowerCase();
  if (!normalized || normalized === '—') return 'unknown';
  if (['keep', 'allow', 'approved', 'pass', 'ok', 'safe', 'available', 'green'].some((word) => normalized.includes(word))) return 'ok';
  if (['hold', 'manual', 'pending', 'watch', 'review', 'caution', 'yellow'].some((word) => normalized.includes(word))) return 'warn';
  if (['block', 'deny', 'reject', 'demote', 'fail', 'red', 'locked'].some((word) => normalized.includes(word))) return 'error';
  return 'unknown';
}

function compactReasonList(payload, limit = 5) {
  const candidates = [
    payload?.reasons,
    payload?.reason_codes,
    payload?.why,
    payload?.risk_factors,
    payload?.next_steps,
    payload?.data?.reasons,
    payload?.data?.why,
  ];
  for (const item of candidates) {
    if (Array.isArray(item)) {
      return item.map((entry) => (isObject(entry) ? JSON.stringify(entry) : String(entry))).slice(0, limit);
    }
    if (typeof item === 'string' && item.trim()) {
      return item.split(/[\n;]+/).map((entry) => entry.trim()).filter(Boolean).slice(0, limit);
    }
  }
  return [];
}

export function buildEndpointItems(state = {}) {
  return [
    { name: 'Advisor', source: '/api/governance/advisor', status: statusFromAvailability(state.advisor), detail: state.advisor ? 'evidence loaded' : 'missing' },
    { name: 'Version Registry', source: '/api/governance/version-registry', status: statusFromAvailability(state.versionRegistry), detail: state.versionRegistry ? 'registry loaded' : 'missing' },
    { name: 'Promotion Gate', source: '/api/governance/promotion-gate', status: statusFromAvailability(state.promotionGate), detail: state.promotionGate ? 'gate evidence loaded' : 'missing' },
    { name: 'Optimizer V2', source: '/api/governance/optimizer-v2', status: statusFromAvailability(state.optimizerV2), detail: state.optimizerV2 ? 'plan loaded' : 'missing' },
  ];
}

export function buildSafetyEnvelope(state = {}) {
  const advisorSafety = state.advisor?.safety || state.advisor?.data?.safety || {};
  const gateSafety = state.promotionGate?.safety || state.promotionGate?.data?.safety || {};
  const merged = { ...GOVERNANCE_SAFETY_DEFAULTS, ...advisorSafety, ...gateSafety };

  const rows = [
    ['Advisory only', boolFrom(merged.advisoryOnly, true), 'ok'],
    ['Read-only data plane', boolFrom(merged.readOnlyDataPlane, true), 'ok'],
    ['Order send allowed', boolFrom(merged.orderSendAllowed, false), boolFrom(merged.orderSendAllowed, false) ? 'error' : 'ok'],
    ['Close allowed', boolFrom(merged.closeAllowed, false), boolFrom(merged.closeAllowed, false) ? 'error' : 'ok'],
    ['Cancel allowed', boolFrom(merged.cancelAllowed, false), boolFrom(merged.cancelAllowed, false) ? 'error' : 'ok'],
    ['Credential storage', boolFrom(merged.credentialStorageAllowed, false), boolFrom(merged.credentialStorageAllowed, false) ? 'error' : 'ok'],
    ['Live preset mutation', boolFrom(merged.livePresetMutationAllowed, false), boolFrom(merged.livePresetMutationAllowed, false) ? 'error' : 'ok'],
    ['Override Kill Switch', boolFrom(merged.canOverrideKillSwitch, false), boolFrom(merged.canOverrideKillSwitch, false) ? 'error' : 'ok'],
    ['Mutate governance decision', boolFrom(merged.canMutateGovernanceDecision, false), boolFrom(merged.canMutateGovernanceDecision, false) ? 'error' : 'ok'],
    ['Promote/demote route', boolFrom(merged.canPromoteOrDemoteRoute, false), boolFrom(merged.canPromoteOrDemoteRoute, false) ? 'error' : 'ok'],
    ['Manual authorization', boolFrom(merged.requiresManualAuthorization, true), boolFrom(merged.requiresManualAuthorization, true) ? 'locked' : 'warn'],
  ];

  return rows.map(([label, value, status]) => ({
    label,
    value: typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value),
    status,
  }));
}

export function buildAdvisorSummary(advisor = null) {
  const payload = advisor?.data || advisor || {};
  const recommendation = pick(payload, ['recommendation', 'decision', 'action', 'advisor.recommendation', 'summary.recommendation']);
  const route = pick(payload, ['route', 'active_route', 'route_name', 'advisor.route', 'summary.route']);
  const riskLevel = pick(payload, ['risk_level', 'riskLevel', 'risk.level', 'summary.risk_level']);
  const confidence = firstDefined(
    valueAt(payload, 'confidence'),
    valueAt(payload, 'advisor.confidence'),
    valueAt(payload, 'summary.confidence'),
    null,
  );
  const reasoning = pick(payload, ['reasoning', 'note', 'summary', 'advisor.reasoning', 'data.reasoning']);
  const updatedAt = pick(payload, ['timestamp', 'updated_at', 'generated_at', 'as_of']);

  return {
    status: decisionStatus(recommendation),
    reasonList: compactReasonList(payload),
    rows: [
      { label: 'Recommendation', value: recommendation, status: decisionStatus(recommendation) },
      { label: 'Route', value: route, status: route !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Risk level', value: riskLevel, status: decisionStatus(riskLevel) },
      { label: 'Confidence', value: formatPercent(confidence), status: confidence === null ? 'unknown' : 'ok' },
      { label: 'Updated at', value: updatedAt, status: updatedAt !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Reasoning', value: reasoning, status: reasoning !== EMPTY_TEXT ? 'ok' : 'unknown' },
    ],
  };
}

export function buildPromotionGateSummary(gate = null) {
  const payload = gate?.data || gate || {};
  const gateState = pick(payload, ['gate_state', 'state', 'status', 'decision', 'promotion_gate.state']);
  const allowed = firstDefined(
    valueAt(payload, 'allowed'),
    valueAt(payload, 'can_promote'),
    valueAt(payload, 'promotion_allowed'),
    valueAt(payload, 'data.allowed'),
    false,
  );
  const manualRequired = firstDefined(
    valueAt(payload, 'manual_authorization_required'),
    valueAt(payload, 'manual_required'),
    valueAt(payload, 'requires_manual_authorization'),
    true,
  );
  const route = pick(payload, ['route', 'candidate_route', 'strategy', 'promotion_gate.route']);
  const version = pick(payload, ['version', 'candidate_version', 'promotion_gate.version']);
  const updatedAt = pick(payload, ['timestamp', 'updated_at', 'generated_at', 'as_of']);

  return {
    status: boolFrom(allowed, false) ? 'warn' : decisionStatus(gateState || 'locked'),
    reasonList: compactReasonList(payload),
    rows: [
      { label: 'Gate state', value: gateState, status: decisionStatus(gateState) },
      { label: 'Candidate route', value: route, status: route !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Candidate version', value: version, status: version !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Promotion allowed', value: boolFrom(allowed, false) ? 'true' : 'false', status: boolFrom(allowed, false) ? 'warn' : 'locked' },
      { label: 'Manual authorization required', value: boolFrom(manualRequired, true) ? 'true' : 'false', status: boolFrom(manualRequired, true) ? 'locked' : 'warn' },
      { label: 'Updated at', value: updatedAt, status: updatedAt !== EMPTY_TEXT ? 'ok' : 'unknown' },
    ],
  };
}

export function buildOptimizerSummary(optimizer = null) {
  const payload = optimizer?.data || optimizer || {};
  const mode = pick(payload, ['mode', 'optimizer_mode', 'status', 'plan.mode']);
  const objective = pick(payload, ['objective', 'target', 'goal', 'plan.objective']);
  const route = pick(payload, ['route', 'strategy', 'candidate_route', 'plan.route']);
  const nextAction = pick(payload, ['next_action', 'nextAction', 'recommendation', 'plan.next_action']);
  const riskNote = pick(payload, ['risk_note', 'risk', 'risk_summary', 'plan.risk_note']);
  const updatedAt = pick(payload, ['timestamp', 'updated_at', 'generated_at', 'as_of']);

  return {
    status: decisionStatus(mode || nextAction),
    reasonList: compactReasonList(payload),
    rows: [
      { label: 'Mode', value: mode, status: decisionStatus(mode) },
      { label: 'Objective', value: objective, status: objective !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Route', value: route, status: route !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Next action', value: nextAction, status: decisionStatus(nextAction) },
      { label: 'Risk note', value: riskNote, status: decisionStatus(riskNote) },
      { label: 'Updated at', value: updatedAt, status: updatedAt !== EMPTY_TEXT ? 'ok' : 'unknown' },
    ],
  };
}

export function buildVersionRows(versionRegistry = null, limit = 20) {
  const rows = asArray(versionRegistry);
  return rows.slice(0, limit).map((row, index) => {
    const source = row?.data || row || {};
    return {
      '#': index + 1,
      route: pick(source, ['route', 'route_name', 'strategy', 'name'], `route-${index + 1}`),
      version: pick(source, ['version', 'current_version', 'active_version', 'candidate_version']),
      state: pick(source, ['state', 'status', 'decision', 'gate_state']),
      preset: pick(source, ['preset', 'preset_name', 'set_file']),
      score: pick(source, ['score', 'pf', 'profit_factor', 'rank']),
      updated: pick(source, ['updated_at', 'timestamp', 'generated_at']),
    };
  });
}

export function buildMetricItems(state = {}) {
  const advisor = buildAdvisorSummary(state.advisor);
  const gate = buildPromotionGateSummary(state.promotionGate);
  const optimizer = buildOptimizerSummary(state.optimizerV2);
  const versions = buildVersionRows(state.versionRegistry, 200);

  return [
    { label: 'Advisor', value: advisor.rows[0]?.value || UNKNOWN, hint: 'governance recommendation', status: advisor.status },
    { label: 'Promotion Gate', value: gate.rows[0]?.value || UNKNOWN, hint: 'manual gate evidence', status: gate.status },
    { label: 'Registered routes', value: versions.length, hint: 'version registry rows', status: versions.length ? 'ok' : 'unknown' },
    { label: 'Optimizer V2', value: optimizer.rows[0]?.value || UNKNOWN, hint: 'plan status', status: optimizer.status },
  ];
}

export function buildGovernanceViewModel(state = {}) {
  return {
    metrics: buildMetricItems(state),
    endpoints: buildEndpointItems(state),
    safety: buildSafetyEnvelope(state),
    advisor: buildAdvisorSummary(state.advisor),
    promotionGate: buildPromotionGateSummary(state.promotionGate),
    optimizer: buildOptimizerSummary(state.optimizerV2),
    versionRows: buildVersionRows(state.versionRegistry),
    rawEvidence: [
      { title: 'Advisor raw evidence', source: '/api/governance/advisor', payload: state.advisor },
      { title: 'Version registry raw evidence', source: '/api/governance/version-registry', payload: state.versionRegistry },
      { title: 'Promotion gate raw evidence', source: '/api/governance/promotion-gate', payload: state.promotionGate },
      { title: 'Optimizer V2 raw evidence', source: '/api/governance/optimizer-v2', payload: state.optimizerV2 },
    ],
  };
}
