import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/**
 * 把 uni webview JSSDK 作为独立文件复制到 dist（不打包进 runtime.js）。
 * App/小程序端经 @message 需要 uni.postMessage（PC web 用不到，不加载）。
 */
function copyUniWebviewPlugin(): Plugin {
  return {
    name: 'copy-uni-webview',
    closeBundle() {
      copyFileSync('web/uni-webview.js', 'dist/uni-webview.js');
    },
  };
}

export default defineConfig({
  plugins: [react(), copyUniWebviewPlugin()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: 'web/main.tsx',
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
