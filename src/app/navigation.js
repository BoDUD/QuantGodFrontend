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
        key: 'hfm-crypto',
        label: 'HFM Crypto',
        description: 'HFM crypto CFD symbol 扫描、Moss 回测导入和 shadow-only 跟单研究。',
      },
    ],
  },
];

export const HIDDEN_WORKSPACES = [
  {
    key: 'governance',
    label: 'Governance',
    description: '治理状态、版本注册、晋级闸门和 optimizer 证据。',
    group: 'tools',
    groupLabel: '工具深链',
  },
  {
    key: 'paramlab',
    label: 'ParamLab',
    description: '参数实验、tester window、scheduler 和恢复状态。',
    group: 'tools',
    groupLabel: '工具深链',
  },
  {
    key: 'research',
    label: 'Research',
    description: '研究统计、shadow signals/outcomes、交易流水和策略评估。',
    group: 'tools',
    groupLabel: '工具深链',
  },
  {
    key: 'backtest-ai',
    label: 'Backtest AI',
    description: '回测 AI 复核、Telegram/DeepSeek 建议和报告。',
    group: 'tools',
    groupLabel: '工具深链',
  },
  {
    key: 'phase1',
    label: 'Phase 1',
    description: 'AI 分析、K 线、信号叠加和实时行情工具。',
    group: 'archive',
    groupLabel: '迁移工作区',
  },
  {
    key: 'phase2',
    label: 'Phase 2',
    description: '治理、参数实验、交易记录和研究 API 操作面。',
    group: 'archive',
    groupLabel: '迁移工作区',
  },
  {
    key: 'phase3',
    label: 'Phase 3',
    description: 'AI v2、K 线增强和 vibe strategy 原型工具。',
    group: 'archive',
    groupLabel: '迁移工作区',
  },
];

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
