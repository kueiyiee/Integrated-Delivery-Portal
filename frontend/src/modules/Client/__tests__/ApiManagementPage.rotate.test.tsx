import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../components/ui/ToastProvider';
import { AuthContext } from '../../../contexts/AuthContext';
import { ClientApiManagementPage } from '../ApiManagementPage';

vi.mock('../../../api', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url === '/v1/client/api-management/api-keys') {
        return Promise.resolve({ data: { data: [{ id: 42, name: 'Primary Key', status: 'active' }] } });
      }
      if (url === '/v1/client/api-management/documentation') {
        return Promise.resolve({ data: { data: { documentation: { overview: 'Docs available', endpoints: [], best_practices: ['Rotate keys'], example_request: { curl: 'curl test' } } } } });
      }
      if (url === '/v1/client/api-management/webhooks') {
        return Promise.resolve({ data: { data: [ { id: 1, name: 'Test WH', target_url: 'https://example.com/hook', events: ['delivery.created'], description: 'Test' } ] } });
      }
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn((url: string) => {
      if (url === '/v1/client/api-management/webhooks/1/rotate') {
        return Promise.resolve({ data: { data: { secret: 'one-time-secret-ABC' } } });
      }
      return Promise.resolve({ data: {} });
    }),
  }
}));

const mockAuthValue = {
  token: 'token',
  user: { id: 1, company: { approval_status: 'approved' } },
  isAuthenticated: true,
  loading: false,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  hasPermission: () => true,
  hasRole: () => true,
};

afterEach(() => {
  cleanup();
});

describe('ApiManagementPage webhook rotate', () => {
  it('does not refresh the active user on mount', async () => {
    const refreshUser = vi.fn();

    render(
      <AuthContext.Provider value={{ ...mockAuthValue, refreshUser } as any}>
        <ToastProvider>
          <ClientApiManagementPage />
        </ToastProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => expect(screen.getByText('Secure integrations for your organization')).toBeInTheDocument());
    expect(refreshUser).not.toHaveBeenCalled();
  });

  it('shows one-time secret after rotating a webhook', async () => {
    render(
      <AuthContext.Provider value={mockAuthValue as any}>
        <ToastProvider>
          <ClientApiManagementPage />
        </ToastProvider>
      </AuthContext.Provider>
    );

    // wait for webhooks to load and the rotate button to appear
    await waitFor(() => expect(screen.getByRole('button', { name: /Rotate/i })).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /Rotate/i }));

    // after clicking rotate, the modal should show the one-time secret
    await waitFor(() => expect(screen.getByText('one-time-secret-ABC')).toBeInTheDocument());
  });

  it('still renders the page when one of the summary endpoints fails', async () => {
    const api = await import('../../../api');
    vi.mocked(api.api.get).mockImplementation((url: string) => {
      if (url === '/v1/client/api-management/documentation') {
        return Promise.reject(new Error('docs unavailable'));
      }
      if (url === '/v1/client/api-management/api-keys') {
        return Promise.resolve({ data: { data: [{ id: 42, name: 'Primary Key', status: 'active' }] } });
      }
      if (url === '/v1/client/api-management/webhooks') {
        return Promise.resolve({ data: { data: [ { id: 1, name: 'Test WH', target_url: 'https://example.com/hook', events: ['delivery.created'], description: 'Test' } ] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <AuthContext.Provider value={mockAuthValue as any}>
        <ToastProvider>
          <ClientApiManagementPage />
        </ToastProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => expect(screen.getByText('Secure integrations for your organization')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Generate API key/i })).toBeInTheDocument();
  });
});
