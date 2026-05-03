export const WORKSPACE_GROUPS = [
  {
    key: 'operations',
    label: '核心运营',
    items: [
      {
        key: 'dashboard',
        label: '全局总览',
        description: '账户、待办、复盘、风险和跨市场状态一屏查看。',
      },
      {
        key: 'mt5',
        label: 'MT5 实盘监控',
        description: '账户净值、实时持仓、历史成交、策略状态和交易边界。',
      },
      {
        key: 'governance',
        label: '策略治理',
        description: '升降级建议、版本门槛、优化计划和人工复核依据。',
      },
      {
        key: 'paramlab',
        label: '参数实验',
        description: '候选参数、批次报告、失败恢复和测试窗口。',
      },
      {
        key: 'research',
        label: '模拟研究',
        description: '模拟信号、交易历史、策略评估、行情状态和人工 Alpha。',
      },
      {
        key: 'polymarket',
        label: 'Polymarket 研究',
        description: '市场雷达、概率、成交量、流动性、亏损隔离和跨市场联动。',
      },
    ],
  },
  {
    key: 'advanced',
    label: '分析与工具',
    items: [
      {
        key: 'phase1',
        label: 'AI 分析与K线',
        description: '专业图表、交易点、模拟信号和 DeepSeek 中文分析。',
      },
      {
        key: 'phase2',
        label: '运维通知中心',
        description: 'Telegram 推送、只读状态文件和通知记录。',
      },
      {
        key: 'phase3',
        label: '策略创作与AI辩论',
        description: '策略草案、回测分析、多智能体辩论和图表增强。',
      },
    ],
  },
];

export const HIDDEN_WORKSPACES = [
  {
    key: 'legacy',
    label: '旧版归档',
    description: '旧单页归档只保留为手动回退入口，不在日常导航中展示。',
    group: 'archive',
    groupLabel: '归档入口',
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
