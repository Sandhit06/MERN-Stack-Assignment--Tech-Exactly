import { createContext, useContext, useEffect, useState } from 'react';
import { api, refreshSession, setSession, subscribe } from '../api/client';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const unsubscribe = subscribe(setUser);
    refreshSession()
      .catch(() => {})
      .finally(() => setReady(true));
    return unsubscribe;
  }, []);
  async function signIn(mode, values) {
    const session = await api(`/auth/${mode}`, { method: 'POST', body: values });
    setSession(session);
    return session.user;
  }
  async function signOut() {
    await api('/auth/logout', { method: 'POST' });
    setSession(null);
  }
  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
