// eslint.config.cjs або .eslintrc.cjs

module.exports = {
  root: true,

  parser: '@typescript-eslint/parser',

  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },

  env: {
    browser: true,
    node: true,
    es2023: true,
  },

  plugins: ['@typescript-eslint', 'import', 'react', 'react-hooks', 'tailwindcss', 'prettier'],

  extends: [
    'eslint:recommended',

    // TypeScript
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',

    // React
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',

    // Imports
    'plugin:import/recommended',
    'plugin:import/typescript',

    // Tailwind
    'plugin:tailwindcss/recommended',

    // Prettier (ЗАВЖДИ ОСТАННІМ)
    'plugin:prettier/recommended',
  ],

  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
  },

  rules: {
    // ---------- TypeScript ----------
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',

    // ---------- React ----------
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',

    // ---------- Imports ----------
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],

    // ---------- Tailwind ----------
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/enforces-negative-arbitrary-values': 'error',

    // ---------- Prettier ----------
    'prettier/prettier': 'error',
  },
};
