import js from '@eslint/js';
import globals from 'globals';
import vue from 'eslint-plugin-vue';

const foundationFiles = [
  'src/main.js',
  'src/app/operatorExperience.js',
  'src/composables/useNumberFormat.js',
  'src/i18n/index.js',
  'src/locales/**/*.js',
  'src/components/EmptyState.vue',
  'src/components/ErrorState.vue',
  'src/components/KpiCard.vue',
  'src/components/LoadingState.vue',
  'src/components/MiniSparkline.vue',
  'src/workspaces/dashboard/DashboardUpgradePanel.vue',
  'scripts/frontend_ux_foundation_guard.mjs',
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
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
];
