export const WORKSPACE_GROUPS = [
  {
    key: 'operations',
    label: '自主运营',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        description: '三车道总览、自主日报、自动回滚和硬风控状态。',
      },
      {
        key: 'mt5',
        label: 'MT5',
        description: 'USDJPY 实盘 EA、RSI 诊断、执行反馈和守门状态。',
      },
      {
        key: 'evolution',
        label: 'Evolution',
        description: '策略契约、回放、回测、遗传进化、经验记忆和自主代理证据。',
      },
      {
        key: 'polymarket',
        label: 'Polymarket',
        description: '模拟账本、事件风险上下文和 shadow-only 跟单研究。',
      },
    ],
  },
];

export const HIDDEN_WORKSPACES = [];

export const FLAT_WORKSPACES = [
  ...WORKSPACE_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.key, groupLabel: group.label })),
  ),
  ...HIDDEN_WORKSPACES,
];

export const DEFAULT_WORKSPACE = 'dashboard';

export function findWorkspace(key) {
  return FLAT_WORKSPACES.find((workspace) => workspace.key === key) || FLAT_WORKSPACES[0];
}
