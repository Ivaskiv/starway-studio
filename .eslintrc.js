module.exports = {
  root: true,
  ignorePatterns: ['dist', 'node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json'],
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: [
          './tsconfig.json',
          './packages/frontend/tsconfig.json',
          './backend/tsconfig.json',
        ],
      },
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'import/order': [
      'error',
      {
        groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
        'newlines-between': 'always',
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-duplicates': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      {
        prefer: 'type-imports',
        vars: 'all',
        args: 'after-used',
      },
    ],
  },
  overrides: [
    {
      files: [
        'packages/frontend/**/*.ts',
        'packages/frontend/**/*.tsx',
      ],
      parserOptions: {
        project: ['./packages/frontend/tsconfig.json'],
      },
    },
    {
      files: ['backend/**/*.ts'],
      parserOptions: {
        project: ['./backend/tsconfig.json'],
      },
    },
  ],
};
