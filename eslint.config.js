import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'out/**', 'coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: { '@stylistic': stylistic },
    rules: {
      // Keep the project's established format: two spaces, single quotes,
      // semicolons, and trailing commas in multiline structures.
      '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],
      '@stylistic/space-before-blocks': ['error', 'always'],
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/padded-blocks': ['error', 'never'],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/max-len': ['warn', { code: 100, ignoreUrls: true, ignoreStrings: true }],

      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-duplicate-imports': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/main/**/*.{ts,tsx}', 'src/preload/**/*.{ts,tsx}', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}', 'harness/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'electron',
              importNames: ['ipcRenderer', 'remote'],
              message: 'Use the preload bridge from renderer code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}', 'vitest.config.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },
);
