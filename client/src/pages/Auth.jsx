import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useResource } from '../hooks/useResource';
import { ErrorMessage, Loading } from '../components/UI';
const providerErrors = {
  provider_unavailable: 'This social sign-in has not been configured yet. Use email to continue.',
  account_exists: 'This email already has an account. Please use your original sign-in method.',
  oauth_failed: 'Social sign-in was cancelled or could not be verified. Please try again.',
};
export function AuthPage({ register = false }) {
  const { user, ready, signIn } = useAuth(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const { data: providers } = useResource('/auth/providers');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  if (!ready) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(
        register ? 'register' : 'login',
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container auth-layout">
      <aside className="auth-story">
        <p className="eyebrow">WELCOME TO YOUR NEXT CHAPTER</p>
        <h1>
          Good things
          <br />
          begin with
          <br />
          <em>a few words.</em>
        </h1>
        <p>A home for the ideas you can’t stop thinking about, and the people who get them.</p>
        <span className="auth-star" aria-hidden="true">
          ✳
        </span>
        <span className="auth-footnote">READ. WRITE. FIND YOUR PEOPLE.</span>
      </aside>
      <section className="auth-panel">
        <p className="eyebrow">
          {register ? 'MAKE YOURSELF AT HOME' : 'PICK UP WHERE YOU LEFT OFF'}
        </p>
        <h2>{register ? 'Find your voice.' : 'Welcome back.'}</h2>
        <p className="muted">
          {register
            ? 'Your next chapter starts right here.'
            : 'Your stories and conversations are waiting.'}
        </p>
        <div className="social-buttons">
          <a
            className={`button outline ${providers?.google ? '' : 'unavailable'}`}
            aria-disabled={!providers?.google}
            href={providers?.google ? '/api/v1/auth/google' : undefined}
          >
            <span className="google-symbol">G</span>Google
          </a>
          <a
            className={`button outline ${providers?.facebook ? '' : 'unavailable'}`}
            aria-disabled={!providers?.facebook}
            href={providers?.facebook ? '/api/v1/auth/facebook' : undefined}
          >
            <span className="facebook-symbol">f</span>Facebook
          </a>
        </div>
        {providers && (!providers.google || !providers.facebook) && (
          <p className="field-hint social-hint">
            Social sign-in will be available once the site owner connects the providers.
          </p>
        )}
        <div className="divider">
          <span>or continue with email</span>
        </div>
        <ErrorMessage>{error || providerErrors[params.get('error')]}</ErrorMessage>
        <form onSubmit={submit}>
          {register && (
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={60}
                placeholder="How should we call you?"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                name="password"
                type={visible ? 'text' : 'password'}
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 10 : 1}
                maxLength={72}
                placeholder={register ? 'At least 10 characters' : 'Your password'}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button className="button primary full" disabled={busy}>
            {busy ? 'One moment…' : register ? 'Create your account' : 'Sign in'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? 'Already part of the story?' : 'New around here?'}{' '}
          <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Join Margin'}</Link>
        </p>
      </section>
    </div>
  );
}
export function OAuthCallback() {
  const { ready, user } = useAuth();
  if (!ready) return <Loading />;
  return <Navigate replace to={user ? '/' : '/login?error=oauth_failed'} />;
}
