export const LEGACY_MIGRATION_STATUS = Object.freeze({
  status: 'frozen_fallback',
  noActiveDevelopment: true,
  defaultWorkspace: 'dashboard',
  orderSendAllowed: false,
  closeAllowed: false,
  cancelAllowed: false,
  credentialStorageAllowed: false,
  livePresetMutationAllowed: false,
  canOverrideKillSwitch: false,
  policy: {
    legacyCanBeOpened: true,
    legacyCanBeDefault: false,
    newFeatureAllowedInLegacy: false,
    directRuntimeFileReadAllowed: false,
    directFetchAllowedInLegacy: false,
    executionAffordanceAllowed: false,
  },
  migratedDomains: [
    {
      key: 'dashboard',
      workspace: 'src/workspaces/dashboard/DashboardWorkspace.vue',
      status: 'structured_parity_complete',
      notes: 'Runtime health, endpoint health, route watchlist, daily loop, raw evidence fallback.',
    },
    {
      key: 'mt5',
      workspace: 'src/workspaces/mt5/Mt5Workspace.vue',
      status: 'structured_parity_complete',
      notes: 'Read-only bridge, account evidence, positions, orders, symbol registry, safety envelope.',
    },
    {
      key: 'governance',
      workspace: 'src/workspaces/governance/GovernanceWorkspace.vue',
      status: 'structured_parity_complete',
      notes: 'Advisor, version registry, promotion gate, optimizer V2, advisory-only safety envelope.',
    },
    {
      key: 'paramlab',
      workspace: 'src/workspaces/paramlab/ParamLabWorkspace.vue',
      status: 'structured_parity_complete',
      notes: 'Research/tester-only status, scheduler, recovery, tester window, result ledgers.',
    },
    {
      key: 'research',
      workspace: 'src/workspaces/research/ResearchWorkspace.vue',
      status: 'structured_parity_complete',
      notes: 'Shadow evidence, trade journal, close history, strategy/regime/manual-alpha evaluation.',
    },
    {
      key: 'polymarket',
      workspace: 'src/workspaces/polymarket/PolymarketWorkspace.vue',
      status: 'structured_parity_complete',
      notes: 'Radar, AI score, canary evidence, markets, assets, history, cross linkage.',
    },
    {
      key: 'phase1',
      workspace: 'src/workspaces/phase1/Phase1Workspace.vue',
      status: 'workspace_migrated',
      notes: 'AI V1 and K-line Phase 1 workspace moved out of generic components.',
    },
    {
      key: 'phase2',
      workspace: 'src/workspaces/phase2/Phase2OperationsWorkspace.vue',
      status: 'workspace_migrated',
      notes: 'Phase 2 operations workspace moved out of generic components.',
    },
    {
      key: 'phase3',
      workspace: 'src/workspaces/phase3/Phase3Workspace.vue',
      status: 'workspace_migrated',
      notes: 'Vibe Coding, AI V2 debate, K-line enhancement workspace moved out of generic components.',
    },
  ],
  nextRetirementSteps: [
    'Keep LegacyWorkbench available only as a read-only fallback while operators compare parity.',
    'Do not add new features, direct fetch calls, direct runtime file reads, or execution affordances to LegacyWorkbench.',
    'When a domain is confirmed in production, remove the duplicated legacy section in a dedicated follow-up commit.',
    'Retire LegacyWorkbench only after all domain-specific parity checks and manual operator checks pass.',
  ],
});

export function migratedDomainKeys() {
  return LEGACY_MIGRATION_STATUS.migratedDomains.map((domain) => domain.key);
}

export function findMigratedDomain(key) {
  return LEGACY_MIGRATION_STATUS.migratedDomains.find((domain) => domain.key === key) || null;
}

export function legacyMigrationCounts() {
  const domains = LEGACY_MIGRATION_STATUS.migratedDomains;
  return {
    structured: domains.filter((d) => d.status === 'structured_parity_complete').length,
    feature: domains.filter((d) => d.status === 'workspace_migrated').length,
  };
}

export const legacyArchive = Object.freeze({
  status: 'archived-outside-src',
  path: 'archive/legacy-workbench/LegacyWorkbenchFull.vue',
  routedLegacyMode: 'slim-migration-hub',
});
