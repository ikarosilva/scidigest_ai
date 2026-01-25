import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Using defineConfig from vitest/config ensures the test property is properly typed without the need for manual reference directives
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
});