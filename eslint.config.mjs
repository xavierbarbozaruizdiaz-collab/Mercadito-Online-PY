// eslint.config.mjs
import js from '@eslint/js';
import path from 'node:path';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

const compat = new FlatCompat({
  baseDirectory: path.resolve(),
});

export default [
  // === Ignorados (equivalente a ignorePatterns) ===
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'public/sw.js',
      'scripts/**/*.js',     // scripts de utilidades (los que generaban ruido)
      'tools/_archive/**',   // lo que acabamos de archivar
    ],
  },

  // === Base configs ===
  js.configs.recommended,               // eslint:recommended
  ...tseslint.configs.recommended,      // plugin:@typescript-eslint/recommended
  ...compat.extends('next/core-web-vitals'), // next/core-web-vitals (vía compat)

  // === Reglas y plugins comunes ===
  {
    plugins: {
      'react-hooks': reactHooks,
      import: importPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // === Sustitutos de "overrides" con `files` ===
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

  // App Router
  {
    files: ['src/app/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Legacy
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

  // Funciones Supabase (Deno)
  {
    files: ['supabase/functions/**/*'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];
