import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowUpRight, PenLine, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar, ErrorMessage } from './UI';
export function Layout() {
  const { user, signOut } = useAuth(),
    navigate = useNavigate();
  const [menu, setMenu] = useState(false),
    [error, setError] = useState('');
  async function logout() {
    try {
      await signOut();
      setMenu(false);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="wordmark" aria-label="Margin home">
            margin<span>✳</span>
          </Link>
          <button
            className="icon-button mobile-menu"
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <nav className={menu ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
            <NavLink to="/" end onClick={() => setMenu(false)}>
              Discover
            </NavLink>
            {user && (
              <NavLink to="/my-stories" onClick={() => setMenu(false)}>
                My stories
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" onClick={() => setMenu(false)}>
                Admin
              </NavLink>
            )}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <Link className="button primary compact" to="/write">
                  <PenLine size={16} />
                  Write a story
                </Link>
                <span className="user-chip" title={user.name}>
                  <Avatar name={user.name} small />
                </span>
                <button
                  className="icon-button"
                  onClick={logout}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link className="sign-in-link" to="/login">
                  Sign in
                </Link>
                <Link className="button primary compact" to="/register">
                  Start writing
                  <ArrowUpRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {error && (
        <div className="container">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      )}
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <Link to="/" className="wordmark">
            margin<span>✳</span>
          </Link>
          <p>A little room for thought.</p>
          <span>Made for curious minds.</span>
        </div>
      </footer>
    </>
  );
}
