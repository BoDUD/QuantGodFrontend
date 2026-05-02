export const WORKSPACE_GROUPS = [
  {
    key: 'core',
    label: '核心工作区',
    items: [
      {
        key: 'legacy',
        label: '完整工作台',
        description: '保留现有 App.vue 的完整功能，作为迁移期间的安全回退。',
      },
    ],
  },
  {
    key: 'phases',
    label: 'Phase 工作区',
    items: [
      {
        key: 'phase1',
        label: 'Phase 1 · AI/K线',
        description: 'AI Analysis V1 与 Kline 基础工作区。',
      },
      {
        key: 'phase2',
        label: 'Phase 2 · Operations',
        description: '统一 API、通知和运维操作台。',
      },
      {
        key: 'phase3',
        label: 'Phase 3 · Vibe/AI V2',
        description: 'Vibe Coding、AI 多智能体 V2 与 K线增强。',
      },
    ],
  },
];

export const FLAT_WORKSPACES = WORKSPACE_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.key, groupLabel: group.label })),
);

export const DEFAULT_WORKSPACE = 'legacy';

export function findWorkspace(key) {
  return FLAT_WORKSPACES.find((workspace) => workspace.key === key) || FLAT_WORKSPACES[0];
}
