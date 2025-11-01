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
  },
  overrides: [
    // Permitir require() solo en scripts utilitarios
    {
      files: ['scripts/**/*.{js,ts}', 'scripts/**'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-commonjs': 'off',
      },
    },
    // Archivos generados o d.ts
    {
      files: ['**/*.d.ts'],
      rules: { '@typescript-eslint/no-empty-interface': 'off' },
    },
    // Archivos de tests
    {
      files: ['tests/**/*', '**/*.test.tsx', '**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
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
    'supabase/functions/**',
    'tests/**',
  ],
};

