import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AuthPage } from '../pages/Auth';
import { api, refreshSession, subscribe, setSession } from '../api/client';
vi.mock('../api/client', () => ({
  api: vi.fn(),
  refreshSession: vi.fn(),
  subscribe: vi.fn(),
  setSession: vi.fn(),
}));
let listener;
beforeEach(() => {
  vi.clearAllMocks();
  subscribe.mockImplementation((fn) => {
    listener = fn;
    return () => {};
  });
  setSession.mockImplementation((session) => listener(session?.user || null));
  refreshSession.mockRejectedValue(new Error('No session'));
  api.mockResolvedValue({ google: false, facebook: false });
});
it('shows login errors and does not pretend unconfigured OAuth is available', async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Welcome back.' });
  await userEvent.type(screen.getByLabelText('Email address'), 'reader@example.com');
  await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'wrong-password');
  api.mockRejectedValueOnce(new Error('Email or password is incorrect.'));
  await userEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  expect(screen.getByText('Google').closest('a')).toHaveAttribute('aria-disabled', 'true');
});
it('registration sends actual form values and updates the global session', async () => {
  function Who() {
    const { user } = useAuth();
    return <p>{user?.name || 'Anonymous'}</p>;
  }
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthPage register />
        <Who />
      </AuthProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Find your voice.' });
  await userEvent.type(screen.getByLabelText('Your name'), 'Reader');
  await userEvent.type(screen.getByLabelText('Email address'), 'reader@example.com');
  await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'long-password');
  api.mockResolvedValueOnce({ user: { name: 'Reader', id: '1' }, accessToken: 'token' });
  await userEvent.click(screen.getByRole('button', { name: 'Create your account' }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: { name: 'Reader', email: 'reader@example.com', password: 'long-password' },
    }),
  );
  expect(await screen.findByText('Reader')).toBeInTheDocument();
});
