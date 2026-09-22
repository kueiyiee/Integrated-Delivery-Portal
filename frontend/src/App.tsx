import { AppRoutes } from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/ToastProvider';
import React from 'react';

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    console.error('App render error.');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', color: 'var(--text-primary)', background: 'var(--surface-1)' }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h2 style={{ marginBottom: '0.75rem' }}>Something went wrong</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>We couldn’t reach the secure portal right now. Please refresh the page and try again. If the problem continues, contact support.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppErrorBoundary>
            <AppRoutes />
          </AppErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Browser token storage is a convenience cache only. Do not treat a missing cached
// user record as an unauthorized state; the server-backed identity refresh is responsible
// for validating the active session.
