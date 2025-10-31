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
  ],
};

