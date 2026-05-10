import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_API_BASE_URL || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      hmr: {
        host: 'localhost',
      },
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backend,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});