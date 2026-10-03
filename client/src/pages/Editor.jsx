import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { api } from '../api/client';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../context/AuthContext';
import { ErrorMessage, Loading, readingTime } from '../components/UI';
export function Editor() {
  const { id } = useParams(),
    navigate = useNavigate(),
    { user } = useAuth();
  const { data, loading, error: loadError } = useResource(id ? `/posts/${id}` : null);
  const [title, setTitle] = useState(''),
    [content, setContent] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (data) {
      setTitle(data.title);
      setContent(data.content);
    }
  }, [data]);
  const dirty = title !== (data?.title || '') || content !== (data?.content || '');
  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const post = await api(id ? `/posts/${id}` : '/posts', {
        method: id ? 'PATCH' : 'POST',
        body: { title, content },
      });
      navigate(`/stories/${post.slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (id && loading) return <Loading />;
  if (loadError || (data && user.role !== 'admin' && data.author.id !== user.id))
    return (
      <div className="container">
        <ErrorMessage>
          {loadError || 'Only the author or an admin can edit this story.'}
        </ErrorMessage>
      </div>
    );
  return (
    <div className="container editor-page">
      <Link className="back-link" to="/my-stories">
        <ArrowLeft size={16} />
        Your stories
      </Link>
      <div className="editor-heading">
        <div>
          <p className="eyebrow">{id ? 'A SECOND LOOK' : 'A BLANK PAGE. ENDLESS POSSIBILITIES.'}</p>
          <h1>{id ? 'Refine your story.' : 'What’s on your mind?'}</h1>
        </div>
        <span className="editor-status">
          {content.trim() ? readingTime(content) : 0} min read ·{' '}
          {content.trim() ? content.trim().split(/\s+/).length : 0} words
        </span>
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      <form onSubmit={submit} className="editor-form">
        <label className="sr-only" htmlFor="story-title">
          Story title
        </label>
        <input
          id="story-title"
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your story a title…"
          required
          minLength={3}
          maxLength={160}
        />
        <label className="sr-only" htmlFor="story-content">
          Story content
        </label>
        <textarea
          id="story-content"
          className="content-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start with a thought. See where it takes you."
          required
          minLength={20}
          maxLength={50000}
        />
        <div className="editor-bottom">
          <p>
            Plain words. Real stories. <span>Your story becomes public when you publish.</span>
          </p>
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : id ? 'Save changes' : 'Publish story'}
            <ArrowUpRight size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}
