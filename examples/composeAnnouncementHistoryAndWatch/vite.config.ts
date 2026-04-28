import { URL, fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@scopelift/stealth-address-sdk': fileURLToPath(
        new URL('../../src/index.ts', import.meta.url)
      )
    }
  },
  server: {
    host: '127.0.0.1',
    port: 4174
  }
});
