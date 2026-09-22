import React, { Suspense, lazy, useEffect, type ReactElement } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ClientLayout } from '../layouts/ClientLayout';
import { useAuth } from '../hooks/useAuth';
import UnauthorizedPage from '../authentication/pages/Unauthorized';
import LoginPage from '../authentication/pages/Login';
import { isPlatformAdminUser } from '../utils/authAccess';

const RegisterPage = lazy(() => import('../authentication/pages/Register').then(m => ({ default: m.default })));
const PendingApprovalPage = lazy(() => import('../authentication/pages/Pending').then(m => ({ default: m.default })));
const ForgotPasswordPage = lazy(() => import('../authentication/pages/Forgot').then(m => ({ default: m.default })));
const ResetPasswordPage = lazy(() => import('../authentication/pages/Reset').then(m => ({ default: m.default })));
const VerifyEmailPage = lazy(() => import('../authentication/pages/VerifyEmail').then(m => ({ default: m.default })));
const VerifyPage = lazy(() => import('../pages/VerifyPage').then(m => ({ default: m.default })));
const MfaChallengePage = lazy(() => import('../authentication/pages/MfaChallenge').then(m => ({ default: m.default })));
const MfaSetupPage = lazy(() => import('../authentication/pages/MfaSetup').then(m => ({ default: m.default })));
const DocsPage = lazy(() => import('../modules/Docs/DocsPage').then(m => ({ default: m.DocsPage })));

const ExecutiveDashboardPage = lazy(() => import('../modules/Admin/EnterpriseConsolePage').then(m => ({ default: m.ExecutiveDashboardPage })));
const CompaniesPage = lazy(() => import('../modules/Admin/EnterpriseConsolePage').then(m => ({ default: m.CompaniesPage })));
const ReportsPage = lazy(() => import('../modules/Admin/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ApiKeysPage = lazy(() => import('../modules/Admin/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const DataLifecyclePage = lazy(() => import('../modules/Admin/DataLifecyclePage').then(m => ({ default: m.DataLifecyclePage })));
const ProfilePage = lazy(() => import('../modules/Admin/EnterpriseConsolePage').then(m => ({ default: m.ProfilePage })));

const ClientDashboardPage = lazy(() => import('../modules/Client/routes/ClientDashboardRoute').then(m => ({ default: m.default })));
const ClientDeliveriesPage = lazy(() => import('../modules/Client/routes/ClientDeliveriesRoute').then(m => ({ default: m.default })));
const ClientDocumentsPage = lazy(() => import('../modules/Client/routes/ClientDocumentsRoute').then(m => ({ default: m.default })));
const ClientReportsPage = lazy(() => import('../modules/Client/routes/ClientReportsRoute').then(m => ({ default: m.default })));
const ClientProfilePage = lazy(() => import('../modules/Client/routes/ClientProfileRoute').then(m => ({ default: m.default })));
const ClientApiManagementPage = lazy(() => import('../modules/Client/ApiManagementPage').then(m => ({ default: m.ClientApiManagementPage })));
const ClientCompanyPage = lazy(() => import('../modules/Client/CompanySettingsPage').then(m => ({ default: m.default })));

const likelyClientRouteImports = [
  () => import('../modules/Client/routes/ClientDashboardRoute'),
  () => import('../modules/Client/routes/ClientDeliveriesRoute'),
  () => import('../modules/Client/routes/ClientDocumentsRoute'),
  () => import('../modules/Client/routes/ClientReportsRoute'),
  () => import('../modules/Client/routes/ClientProfileRoute'),
  () => import('../modules/Client/CompanySettingsPage'),
  () => import('../modules/Client/ApiManagementPage'),
];

const likelyAdminRouteImports = [
  () => import('../modules/Admin/EnterpriseConsolePage'),
  () => import('../modules/Admin/ReportsPage'),
  () => import('../modules/Admin/ApiKeysPage'),
  () => import('../modules/Admin/DataLifecyclePage'),
];

function useRoutePrefetch(auth: ReturnType<typeof useAuth>) {
  useEffect(() => {
    if (!auth.isAuthenticated || auth.loading || auth.initializing) {
      return undefined;
    }

    const schedulePrefetch = () => {
      const routeLoaders = isPlatformAdminUser(auth.user) ? likelyAdminRouteImports : auth.user?.company_id ? likelyClientRouteImports : [];
      routeLoaders.forEach((loader) => {
        void loader();
      });
    };

    const requestIdle = (globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    }).requestIdleCallback;

    if (typeof requestIdle === 'function') {
      const handle = requestIdle(schedulePrefetch, { timeout: 1500 });
      return () => {
        const cancelIdle = (globalThis as typeof globalThis & {
          cancelIdleCallback?: (handle: number) => void;
        }).cancelIdleCallback;

        if (typeof cancelIdle === 'function') {
          cancelIdle(handle);
        }
      };
    }

    const timeout = globalThis.setTimeout(schedulePrefetch, 350);
    return () => globalThis.clearTimeout(timeout);
  }, [auth.isAuthenticated, auth.initializing, auth.loading, auth.user]);
}

function isPlatformAdmin(auth: ReturnType<typeof useAuth>) {
  const user = auth.user;
  const roleNames = (Array.isArray(user?.roles) ? user.roles : [])
    .map((role: any) => role?.name)
    .filter(Boolean);
  const permissions = (Array.isArray(user?.roles) ? user.roles : [])
    .flatMap((role: any) => Array.isArray(role?.permissions) ? role.permissions.map((permission: any) => permission?.name).filter(Boolean) : [])
    .filter(Boolean);

  return Boolean(
    user?.is_system_owner ||
    user?.email?.toLowerCase() === 'systemadmin@d.com' ||
    roleNames.some((name: string) => ['System Administrator', 'System Admin', 'Admin'].includes(name)) ||
    permissions.includes('manage.system') ||
    permissions.includes('manage.platform') ||
    permissions.includes('admin.access') ||
    auth.hasRole('System Administrator') ||
    auth.hasPermission('manage.system')
  );
}

function PortalLoadingState({ message = 'Loading portal…', showRetry = false }: { message?: string; showRetry?: boolean }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'radial-gradient(circle at top, rgba(37, 99, 235, 0.10), transparent 45%), var(--surface-1)',
      color: 'var(--text-muted)',
      padding: '2rem',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        textAlign: 'center',
      }}>
        <div style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          border: '3px solid rgba(148, 163, 184, 0.25)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.9s linear infinite',
          boxShadow: '0 0 0 10px rgba(37, 99, 235, 0.05)',
        }} />
        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{message}</div>
        <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>Restoring your session…</div>
        {showRetry ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
            style={{ marginTop: '0.25rem' }}
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AdminRoute({ children }: { children: ReactElement }) {
  const auth = useAuth();

  if (auth.loading || auth.initializing) {
    return <PortalLoadingState message="Loading portal…" showRetry={false} />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = isPlatformAdminUser(auth.user);

  return isAdmin ? children : <Navigate to="/unauthorized" replace />;
}

function ClientRoute({ children }: { children: ReactElement }) {
  const auth = useAuth();

  if (auth.loading || auth.initializing) {
    return <PortalLoadingState message="Loading portal…" showRetry={false} />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isCompanyUser = Boolean(
    auth.user?.company_id &&
    (auth.hasPermission('client.access') || auth.hasRole('Company Manager') || auth.hasRole('Company Dispatcher'))
  );

  return isCompanyUser ? children : <Navigate to="/unauthorized" replace />;
}

function ClientManagerRoute({ children }: { children: ReactElement }) {
  const auth = useAuth();

  if (auth.loading || auth.initializing) {
    return <PortalLoadingState message="Loading portal…" showRetry={false} />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!auth.hasRole('Company Manager')) {
    return <Navigate to="/client" replace />;
  }

  return children;
}

function AppRoutesContent() {
  const auth = useAuth();
  useRoutePrefetch(auth);

  return (
    <Suspense fallback={<PortalLoadingState message="Loading portal…" showRetry={false} />}>
      <RoutesContent auth={auth} />
    </Suspense>
  );
}

function RoutesContent({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const location = useLocation();
  const isPublicRoute = ['/login', '/forgot-password', '/reset-password', '/verify-email', '/register', '/pending-approval', '/mfa-challenge', '/docs', '/docs/getting-started', '/docs/api', '/docs/auth', '/verify', '/unauthorized'].includes(location.pathname);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
      <Route path="/forgot-password" element={<PublicLayout><ForgotPasswordPage /></PublicLayout>} />
      <Route path="/reset-password" element={<PublicLayout><ResetPasswordPage /></PublicLayout>} />
      <Route path="/verify-email" element={<PublicLayout><VerifyEmailPage /></PublicLayout>} />
      <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
      <Route path="/pending-approval" element={<PublicLayout><PendingApprovalPage /></PublicLayout>} />
      <Route path="/mfa-challenge" element={<PublicLayout><MfaChallengePage /></PublicLayout>} />
      <Route path="/mfa-setup" element={<PublicLayout><MfaSetupPage /></PublicLayout>} />
      <Route path="/docs" element={<PublicLayout><DocsPage /></PublicLayout>} />
      <Route path="/docs/getting-started" element={<PublicLayout><DocsPage /></PublicLayout>} />
      <Route path="/docs/api" element={<PublicLayout><DocsPage /></PublicLayout>} />
      <Route path="/docs/auth" element={<PublicLayout><DocsPage /></PublicLayout>} />
      <Route path="/verify" element={<PublicLayout><VerifyPage /></PublicLayout>} />
      <Route path="/verify/:token" element={<PublicLayout><VerifyPage /></PublicLayout>} />

      <Route path="/admin/*" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<ExecutiveDashboardPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="api-keys" element={<ApiKeysPage />} />
        <Route path="data-lifecycle" element={<DataLifecyclePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/client/*" element={<ClientRoute><ClientLayout /></ClientRoute>}>
        <Route index element={<ClientDashboardPage />} />
        <Route path="deliveries" element={<ClientDeliveriesPage />} />
        <Route path="profile" element={<ClientProfilePage />} />
        <Route path="docs" element={<DocsPage />} />

        <Route element={<ClientManagerRoute><Outlet /></ClientManagerRoute>}>
          <Route path="documents" element={<ClientDocumentsPage />} />
          <Route path="reports" element={<ClientReportsPage />} />
          <Route path="api-management" element={<ClientApiManagementPage />} />
          <Route path="company" element={<ClientCompanyPage />} />
        </Route>
      </Route>
      <Route path="/unauthorized" element={<PublicLayout><UnauthorizedPage /></PublicLayout>} />
      <Route
        path="*"
        element={
          auth.isAuthenticated
            ? (isPlatformAdminUser(auth.user)
              ? <Navigate to="/admin" replace />
              : auth.user?.company_id
                ? <Navigate to="/client" replace />
                : <Navigate to="/unauthorized" replace />)
            : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AppRoutesContent />
    </BrowserRouter>
  );
}
