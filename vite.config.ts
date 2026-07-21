import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    lib: {
      entry: 'web/main.tsx',
      formats: ['es'],
      fileName: () => 'sidecar.js',
    },
    outDir: 'dist/web',
    rollupOptions: {
      output: {
        assetFileNames: 'sidecar.[ext]',
      },
    },
  },
});
