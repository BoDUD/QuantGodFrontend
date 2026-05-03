import js from '@eslint/js';
import globals from 'globals';
import vue from 'eslint-plugin-vue';

const foundationFiles = [
  'src/main.js',
  'vite.config.js',
  'src/app/AppShell.vue',
  'src/app/operatorExperience.js',
  'src/app/workspaceRegistry.js',
  'src/composables/useNumberFormat.js',
  'src/i18n/index.js',
  'src/locales/**/*.js',
  'src/components/EmptyState.vue',
  'src/components/ErrorState.vue',
  'src/components/KpiCard.vue',
  'src/components/LoadingState.vue',
  'src/components/MiniSparkline.vue',
  'src/workspaces/dashboard/DashboardUpgradePanel.vue',
  'src/workspaces/polymarket/PolymarketWorkspace.vue',
  'src/workspaces/polymarket/polymarketModel.js',
  'src/services/phase1Api.js',
  'src/workspaces/phase1/AiAnalysisWorkspace.vue',
  'src/workspaces/phase1/Phase1Workspace.vue',
  'src/workspaces/phase1/kline/KlineChart.vue',
  'src/workspaces/phase1/kline/KlineToolbar.vue',
  'src/workspaces/phase1/kline/KlineWorkspace.vue',
  'src/workspaces/phase1/kline/SignalOverlay.vue',
  'src/workspaces/phase3/Phase3Workspace.vue',
  'scripts/frontend_code_splitting_guard.mjs',
  'scripts/responsive_check.mjs',
  'scripts/frontend_ux_foundation_guard.mjs',
  'tests/frontend_code_splitting_guard.test.mjs',
  'tests/frontend_ux_foundation_guard.test.mjs',
  'tests/number_format.test.mjs',
  'tests/unit/**/*.test.js',
];

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'runtime/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: foundationFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'vue/max-attributes-per-line': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
];
