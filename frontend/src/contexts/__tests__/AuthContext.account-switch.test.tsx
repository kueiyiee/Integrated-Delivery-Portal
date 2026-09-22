import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import * as authService from '../../services/auth';

vi.mock('../../services/auth', async () => {
  const actual = await vi.importActual<typeof import('../../services/auth')>('../../services/auth');
  return {
    ...actual,
    fetchMe: vi.fn(),
    logoutRequest: vi.fn(),
  };
});

function AccountSwitcher() {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="user-email">{auth.user?.email ?? 'none'}</div>
      <button type="button" onClick={() => auth.login('new-token', true)}>
        switch account
      </button>
    </div>
  );
}

describe('AuthProvider account switching', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('clears stale profile data immediately when switching to another account', async () => {
    localStorage.setItem('idp_token', 'old-token');
    localStorage.setItem('idp_user', JSON.stringify({ id: 1, email: 'old@example.com', name: 'Old User', status: 'active', roles: [] }));

    const fetchMeMock = vi.mocked(authService.fetchMe);
    fetchMeMock.mockResolvedValue({ id: 1, email: 'old@example.com', name: 'Old User', status: 'active', roles: [] });

    render(
      <AuthProvider>
        <AccountSwitcher />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('old@example.com');
    });

    let resolveFetch: (value: any) => void;
    fetchMeMock.mockReturnValueOnce(new Promise((resolve) => {
      resolveFetch = resolve;
    }));

    await userEvent.click(screen.getByRole('button', { name: 'switch account' }));

    expect(screen.getByTestId('user-email')).toHaveTextContent('none');

    resolveFetch!({ id: 2, email: 'new@example.com', name: 'New User', status: 'active', roles: [] });

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('new@example.com');
    });
  });
});
