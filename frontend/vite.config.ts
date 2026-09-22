import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const normalizeBackendUrl = (value?: string) => {
  if (!value) return undefined;
  return value.replace(/\/(api\/?)?$/i, '');
};

const absoluteBackendUrl = (value?: string) => value && /^https?:\/\//i.test(value) ? value : undefined;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl =
    normalizeBackendUrl(absoluteBackendUrl(env.VITE_BACKEND_URL)) ||
    normalizeBackendUrl(absoluteBackendUrl(env.VITE_API_URL)) ||
    (mode === 'development' ? 'http://localhost' : undefined);

  return {
    plugins: [react()],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios', 'qrcode', 'recharts'],
    },
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
      target: 'esnext',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/src/modules/Client/routes/ClientDashboardRoute')) return 'client-dashboard';
            if (id.includes('/src/modules/Client/routes/ClientDeliveriesRoute')) return 'client-deliveries';
            if (id.includes('/src/modules/Client/routes/ClientDocumentsRoute')) return 'client-documents';
            if (id.includes('/src/modules/Client/routes/ClientReportsRoute')) return 'client-reports';
            if (id.includes('/src/modules/Client/routes/ClientProfileRoute')) return 'client-profile';
            if (id.includes('/src/modules/Client/CompanyManagerPage')) return 'client-portal';
            if (id.includes('/src/modules/Client/ApiManagementPage')) return 'client-api';
            if (id.includes('/src/modules/Client/CompanySettingsPage')) return 'client-settings';
            if (id.includes('/src/modules/Admin/EnterpriseConsolePage')) return 'admin-console';
            if (id.includes('/src/modules/Admin/ReportsPage')) return 'admin-reports';
            if (id.includes('/src/modules/Admin/ApiKeysPage')) return 'admin-api-keys';
            if (id.includes('/src/modules/Docs/DocsPage')) return 'docs-pages';
            if (id.includes('/src/pages/VerifyPage')) return 'verify-page';
            if (id.includes('node_modules')) {
              if (id.includes('react-router')) return 'router-vendor';
              if (id.includes('axios')) return 'http-vendor';
              if (id.includes('recharts')) return 'charts-vendor';
              if (id.includes('qrcode')) return 'qrcode-vendor';
              if (id.includes('framer-motion')) return 'motion-vendor';
              if (id.includes('/react/') || id.includes('react-dom') || id.includes('scheduler') || id.includes('use-sync-external-store')) return 'react-vendor';
              return 'vendor';
            }
            return undefined;
          }
        }
      }
    },
  };
});
