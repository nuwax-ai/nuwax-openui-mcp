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
    sourcemap: false,
    lib: {
      entry: 'src/main.tsx',
      formats: ['es'],
      fileName: () => 'runtime.js',
    },
    outDir: 'dist',
    rollupOptions: {
      output: {
        assetFileNames: 'runtime.[ext]',
      },
    },
  },
});
