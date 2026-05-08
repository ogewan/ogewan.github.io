import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/.vite/**',
      '**/.angular/**',
      '**/coverage/**',
      // gitignored build artifacts dropped into the shell's public/ at build time
      'packages/shell/public/ng-elements/**',
      'packages/shell/public/sitemap.html',
      // local source-master staging area (.scratch/ holds nebula source
      // images + ad-hoc probe scripts that shouldn't be linted as part of
      // the workspace); see .gitignore.
      '.scratch/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['packages/shell/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react/prop-types': 'off',
    },
  },

  {
    files: [
      'packages/manifest-builder/**/*.ts',
      'packages/ng-elements/scripts/**/*.{js,mjs}',
      'packages/celestial/scripts/**/*.{js,mjs}',
      'packages/content/scripts/**/*.{js,mjs}',
      'packages/shell/scripts/**/*.{js,mjs}',
      'scripts/**/*.{js,mjs}',
      '**/*.config.{ts,js,mjs}',
    ],
    languageOptions: {
      // scripts/ files mix Node code (TextureLoader URL imports won't reach
      // here) with `page.evaluate(() => { ... browser globals ... })` bodies
      // that Playwright sends to Chromium. Keep both globals in scope.
      globals: { ...globals.node, ...globals.browser },
    },
  },

  prettier,
);
