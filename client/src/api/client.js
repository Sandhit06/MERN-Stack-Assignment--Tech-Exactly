let token = null;
let refreshTask = null;
const listeners = new Set();
export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export function setSession(session) {
  token = session?.accessToken || null;
  listeners.forEach((listener) => listener(session?.user || null));
}
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Margin-Client': 'web',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach Margin. Check your connection and that the API is running.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.message || 'The request could not be completed.');
    error.status = response.status;
    error.code = body.error?.code;
    throw error;
  }
  return body.data;
}
export function refreshSession() {
  if (!refreshTask) {
    const refresh = async () => {
      try {
        const session = await request('/auth/refresh', { method: 'POST' });
        setSession(session);
        return session;
      } catch (err) {
        setSession(null);
        throw err;
      }
    };
    refreshTask = (
      globalThis.navigator?.locks ? navigator.locks.request('margin-refresh', refresh) : refresh()
    ).finally(() => {
      refreshTask = null;
    });
  }
  return refreshTask;
}
export async function api(path, options = {}) {
  try {
    return await request(path, options);
  } catch (err) {
    if (err.status !== 401 || path.startsWith('/auth/')) throw err;
    await refreshSession();
    return request(path, options);
  }
}
