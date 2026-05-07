import eslintPluginNext from '@next/eslint-plugin-next';
import parser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['node_modules', '.next', 'dist'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@next/next': eslintPluginNext,
    },
    rules: {
      ...eslintPluginNext.configs.recommended.rules,
      ...eslintPluginNext.configs['core-web-vitals'].rules,
    },
  },
];