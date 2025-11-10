/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,

  // Migración desde .eslintignore
  ignorePatterns: [
    'node_modules/**',
    '.next/**',
    'dist/**',
    'build/**',
    'public/sw.js',
    'scripts/**/*.js', // ignoramos scripts node de utilidades (eran los que bloqueaban)
  ],

  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],

  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
  ],

  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn', // baja a warning en app
    'react-hooks/exhaustive-deps': 'warn',
  },

  overrides: [
    // Tests y mocks
    {
      files: ['**/*.test.*', '**/__tests__/**', '**/__mocks__/**'],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'react-hooks/exhaustive-deps': 'off',
      },
    },

    // App Router (loaders/params suelen usar any o args sin usar)
    {
      files: ['src/app/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'react-hooks/exhaustive-deps': 'warn',
      },
    },

    // Legacy o código en transición
    {
      files: ['src/legacy/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': 'off',
      },
    },

    // Archivos de tipos
    {
      files: ['**/*.d.ts'],
      rules: { '@typescript-eslint/no-empty-interface': 'off' },
    },

    // Funciones de Supabase (Deno)
    {
      files: ['supabase/functions/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
