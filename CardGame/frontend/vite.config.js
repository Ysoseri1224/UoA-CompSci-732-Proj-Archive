import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the frontend dev server.
// The proxy rules forward API and Socket.io requests to the backend
// so the browser never sees a cross-origin request during development.
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // Forward all REST API calls to the Express backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Forward Socket.io handshake and transport requests to the backend
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true, // enable WebSocket proxying
      },
    },
  },
});
