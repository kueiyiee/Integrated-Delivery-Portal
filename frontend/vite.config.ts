import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const normalizeBackendUrl = (value?: string) => {
  if (!value) return undefined;
  return value.replace(/\/(api\/?)?$/i, '');
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl =
    normalizeBackendUrl(env.VITE_BACKEND_URL) ||
    normalizeBackendUrl(env.VITE_API_URL) ||
    'http://localhost:8000';

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      historyApiFallback: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: false,
      historyApiFallback: true,
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) return 'vendor';
          }
        }
      }
    },
  };
});
