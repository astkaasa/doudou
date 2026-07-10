import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
