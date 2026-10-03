import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { api, refreshSession, setSession, subscribe } from '../api/client';
beforeEach(() => {
  setSession(null);
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
const response = (status, body) => ({ ok: status < 400, status, json: async () => body });
it('retries an expired access token once after refreshing', async () => {
  fetch
    .mockResolvedValueOnce(response(401, { error: { message: 'Expired' } }))
    .mockResolvedValueOnce(response(200, { data: { user: { id: '1' }, accessToken: 'new-token' } }))
    .mockResolvedValueOnce(response(200, { data: { items: [] } }));
  expect(await api('/posts?mine=true')).toEqual({ items: [] });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer new-token');
});
it('shares an in-flight refresh and notifies subscribers', async () => {
  const listener = vi.fn(),
    stop = subscribe(listener);
  fetch.mockResolvedValue(response(200, { data: { user: { id: '1' }, accessToken: 'token' } }));
  await Promise.all([refreshSession(), refreshSession()]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith({ id: '1' });
  stop();
});
it('does not retry invalid credentials, and turns network failures into useful errors', async () => {
  fetch.mockResolvedValueOnce(
    response(401, { error: { message: 'Bad credentials', code: 'INVALID_CREDENTIALS' } }),
  );
  await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
    message: 'Bad credentials',
    status: 401,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  fetch.mockRejectedValueOnce(new Error('Network'));
  await expect(api('/posts')).rejects.toThrow('Cannot reach Margin');
});
