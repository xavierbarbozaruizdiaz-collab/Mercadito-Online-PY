module.exports = {
  root: true,
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
    '@typescript-eslint/no-explicit-any': 'warn', // Permitir `any` como warning en lugar de error
    'react-hooks/exhaustive-deps': 'warn', // Permitir dependencias faltantes como warning
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
    // Pages/App Router loaders y rutas: suele haber `any` y params sin usar
    {
      files: ['src/app/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'react-hooks/exhaustive-deps': 'warn', // Dependencias faltantes comunes en App Router
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
    // Scripts y plantillas
    {
      files: ['scripts/**', 'supabase/migrations/**'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-commonjs': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        'no-undef': 'off',
        'no-unused-expressions': 'off',
      },
    },
    // Archivos generados o d.ts
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
  ignorePatterns: [
    'node_modules/**',
    '.next/**',
    'dist/**',
    'build/**',
  ],
};

