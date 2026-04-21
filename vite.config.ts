import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@kweaver-ai/chatkit': path.resolve(__dirname, './src/index.ts'),
      'chatkit': path.resolve(__dirname, './src/index.ts'),
    },
  },
  server: {
    proxy: {
      '/studio': {
        target: 'https://192.168.40.114',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/studio/, '/api/dip-studio/v1'),
      },
      '/data-agent': {
        target: 'https://dip.aishu.cn:443/api/agent-app/v1',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/data-agent/, ''),
      },
      '/api': {
        target: 'https://dip.aishu.cn:443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
