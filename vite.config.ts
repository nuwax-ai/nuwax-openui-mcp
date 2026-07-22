import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    lib: {
      entry: 'web/main.tsx',
      formats: ['es'],
      fileName: () => 'runtime.js',
    },
    outDir: 'dist/web',
    rollupOptions: {
      output: {
        assetFileNames: 'runtime.[ext]',
      },
    },
  },
});
