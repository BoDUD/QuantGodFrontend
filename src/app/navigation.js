export const WORKSPACE_GROUPS = [
  {
    key: 'operations',
    label: '运营工作区',
    items: [
      {
        key: 'dashboard',
        label: '总览 Dashboard',
        description: '本地运行状态、日报、自动驾驶和 backtest summary。',
      },
      {
        key: 'mt5',
        label: 'MT5 Monitor',
        description: 'MT5 read-only bridge、账户、持仓、订单和 Symbol Registry。',
      },
      {
        key: 'governance',
        label: 'Governance',
        description: 'Governance Advisor、Version Registry、Promotion Gate 与 Optimizer V2。',
      },
      {
        key: 'paramlab',
        label: 'ParamLab',
        description: 'ParamLab 状态、批处理结果、调度、恢复和 Tester Window。',
      },
      {
        key: 'research',
        label: 'Research',
        description: 'Shadow、交易历史、策略评估、Regime 与手动 Alpha。',
      },
      {
        key: 'polymarket',
        label: 'Polymarket',
        description: 'Polymarket radar、AI score、canary、cross-linkage 与市场机会。',
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
  {
    key: 'legacy',
    label: '迁移回退',
    items: [
      {
        key: 'legacy',
        label: '完整 Legacy Workbench',
        description: '保留原 App.vue 的完整工作台，作为拆分期间的安全回退。',
      },
    ],
  },
];

export const FLAT_WORKSPACES = WORKSPACE_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.key, groupLabel: group.label })),
);

export const DEFAULT_WORKSPACE = 'dashboard';

export function findWorkspace(key) {
  return FLAT_WORKSPACES.find((workspace) => workspace.key === key) || FLAT_WORKSPACES[0];
}
