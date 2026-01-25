import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Technical Note: We cast the configuration and plugins to 'any' here to bypass 
 * a TypeScript conflict on Vercel where multiple versions of Vite (root Vite 6 vs 
 * Vitest's internal Vite 5) cause incompatible 'PluginOption' type definitions.
 */
export default defineConfig({
  plugins: [react() as any],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
} as any);