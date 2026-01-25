
/// <reference types="vitest" />
// Fix: Use defineConfig from 'vitest/config' to resolve the 'Cannot find type definition' error for Vitest.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
});
