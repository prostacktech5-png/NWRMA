import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      'web/scripts/**',
      'android app/**',
      'mobile/metro.config.js',
      'mobile/src/screens/**',
      'server/scripts/**',
    ],
  },
  {
    files: [
      'shared/**/*.ts',
      'server/**/*.ts',
      'mobile/src/lib/**/*.ts',
      'mobile/src/lib/**/*.tsx',
      'web/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
)
