import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 允许 Windows 浏览器访问容器
    port: 5173,
    hmr: {
      host: 'localhost', // 强制热更新走正确的本地网络
    },
    proxy: {
      '/api': {
        target: 'http://host.docker.internal:3000', // 解决 Docker 内部 localhost 指向错误的问题
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://host.docker.internal:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});