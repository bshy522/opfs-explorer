import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    minify: false, // 关闭代码压缩混淆，方便调试
    rollupOptions: {
      input: {
        devtools: resolve(__dirname, 'src/devtools/devtools.ts'),
        'devtools-panel': resolve(__dirname, 'src/devtools/devtools-panel.html'),
        content: resolve(__dirname, 'src/content/content.ts'),
        background: resolve(__dirname, 'src/background/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    copyPublicDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  server: {
    port: 3000,
  },
  // 添加配置以正确处理 Monaco Editor
  optimizeDeps: {
    include: ['monaco-editor'],
  },
});
