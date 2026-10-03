import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Loading } from './components/UI';
import { Home } from './pages/Home';
import { AuthPage, OAuthCallback } from './pages/Auth';
import { Editor } from './pages/Editor';
import { Story } from './pages/Story';
import { Admin } from './pages/Admin';
export function Protected({ admin = false }) {
  const { ready, user } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<AuthPage key="login" />} />
        <Route path="register" element={<AuthPage register key="register" />} />
        <Route path="auth/callback" element={<OAuthCallback />} />
        <Route path="stories/:slug" element={<Story key={pathname} />} />
        <Route element={<Protected />}>
          <Route path="my-stories" element={<Home mine key="mine" />} />
          <Route path="write" element={<Editor key="write" />} />
          <Route path="edit/:id" element={<Editor key={pathname} />} />
        </Route>
        <Route element={<Protected admin />}>
          <Route path="admin" element={<Admin />} />
        </Route>
        <Route
          path="*"
          element={
            <div className="container not-found">
              <p className="eyebrow">404 / A PAGE OUT OF PLACE</p>
              <h1>Let’s turn back.</h1>
              <p>There isn’t a story at this address.</p>
              <Link className="button primary" to="/">
                Back to Margin →
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
