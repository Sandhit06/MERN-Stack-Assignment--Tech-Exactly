import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useResource } from '../hooks/useResource';
import { api } from '../api/client';
import {
  Avatar,
  dateLabel,
  readingTime,
  StoryArt,
  Loading,
  ErrorMessage,
  ConfirmDialog,
  Pagination,
} from '../components/UI';
function CommentItem({ comment, canEdit, onChanged, onDelete }) {
  const [editing, setEditing] = useState(false),
    [text, setText] = useState(comment.content),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/comments/${comment.id}`, { method: 'PATCH', body: { content: text } });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="comment">
      <Avatar name={comment.author.name} />
      <div className="comment-main">
        <div className="comment-top">
          <strong>{comment.author.name}</strong>
          <time>{dateLabel(comment.createdAt)}</time>
          {canEdit && (
            <div className="row-actions">
              <button
                className="icon-button"
                aria-label={`Edit comment by ${comment.author.name}`}
                onClick={() => {
                  setEditing(!editing);
                  setText(comment.content);
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={`Delete comment by ${comment.author.name}`}
                onClick={() => onDelete(comment)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
        <ErrorMessage>{error}</ErrorMessage>
        {editing ? (
          <form onSubmit={save}>
            <label className="sr-only" htmlFor={`edit-${comment.id}`}>
              Edit comment
            </label>
            <textarea
              id={`edit-${comment.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              maxLength={2000}
            />
            <div className="inline-actions">
              <button className="button primary compact" disabled={busy}>
                Save comment
              </button>
              <button
                className="button outline compact"
                type="button"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p>{comment.content}</p>
        )}
      </div>
    </article>
  );
}
function Comments({ postId }) {
  const { user } = useAuth(),
    [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource(
    `/posts/${postId}/comments?page=${page}&limit=10`,
  );
  const [text, setText] = useState(''),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(''),
    [deleting, setDeleting] = useState(null);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setActionError('');
    try {
      await api(`/posts/${postId}/comments`, { method: 'POST', body: { content: text } });
      setText('');
      setPage(1);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setActionError('');
    try {
      await api(`/comments/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      setActionError(err.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="comments-section">
      <div className="section-heading">
        <h2>
          The conversation<span className="count-pill">{data?.pagination.total ?? 0}</span>
        </h2>
        <MessageCircle size={24} strokeWidth={1.4} />
      </div>
      <ErrorMessage>{error || actionError}</ErrorMessage>
      {user ? (
        <form onSubmit={submit} className="comment-form">
          <label htmlFor="new-comment">Add your perspective</label>
          <textarea
            id="new-comment"
            placeholder="What did this story make you think about?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            maxLength={2000}
          />
          <div className="comment-form-bottom">
            <small>Keep it thoughtful. Keep it kind.</small>
            <button className="button primary compact" disabled={busy || !text.trim()}>
              Post comment
              <Send size={15} />
            </button>
          </div>
        </form>
      ) : (
        <div className="comment-sign-in">
          <p>Good stories start conversations.</p>
          <Link className="text-link" to="/login">
            Sign in to join in →
          </Link>
        </div>
      )}
      {loading ? (
        <Loading />
      ) : (
        data?.items.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            canEdit={user && (user.id === comment.author.id || user.role === 'admin')}
            onChanged={reload}
            onDelete={setDeleting}
          />
        ))
      )}
      {!loading && data?.items.length === 0 && (
        <p className="muted no-comments">No comments yet. You could start something good.</p>
      )}
      <Pagination value={data?.pagination} onChange={setPage} />
      {deleting && (
        <ConfirmDialog
          title="Delete this comment?"
          onClose={() => setDeleting(null)}
          onConfirm={remove}
          busy={busy}
        >
          This comment will be permanently removed.
        </ConfirmDialog>
      )}
    </section>
  );
}
export function Story() {
  const { slug } = useParams(),
    { user } = useAuth(),
    navigate = useNavigate();
  const { data: post, loading, error } = useResource(`/posts/slug/${encodeURIComponent(slug)}`);
  const [deleting, setDeleting] = useState(false),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState('');
  async function remove() {
    setBusy(true);
    try {
      await api(`/posts/${post.id}`, { method: 'DELETE' });
      navigate('/my-stories');
    } catch (err) {
      setActionError(err.message);
      setDeleting(false);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page-heading">
        <Link className="back-link" to="/">
          ← Back to stories
        </Link>
        <ErrorMessage>{error}</ErrorMessage>
      </div>
    );
  if (!post) return null;
  const editable = user && (user.id === post.author.id || user.role === 'admin');
  return (
    <div className="container story-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        Back to the reading room
      </Link>
      <article>
        <header className="article-header">
          <p className="eyebrow">
            ESSAY & IDEAS <span className="meta-dot">·</span> {readingTime(post.content)} MIN READ
          </p>
          <h1>{post.title}</h1>
          <div className="article-byline">
            <Avatar name={post.author.name} />
            <div>
              <strong>{post.author.name}</strong>
              <time>{dateLabel(post.createdAt)}</time>
            </div>
            {editable && (
              <div className="article-actions">
                <Link className="button outline compact" to={`/edit/${post.id}`}>
                  <Pencil size={15} />
                  Edit story
                </Link>
                <button
                  className="icon-button"
                  aria-label="Delete story"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        </header>
        <StoryArt variant={0} large />
        <div className="article-content">
          {post.content.split(/\n\s*\n/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <span className="end-mark">✳</span>
        </div>
      </article>
      <ErrorMessage>{actionError}</ErrorMessage>
      <Comments postId={post.id} />
      {deleting && (
        <ConfirmDialog
          title="Let this story go?"
          onClose={() => setDeleting(false)}
          onConfirm={remove}
          busy={busy}
        >
          Your story and its comments will disappear from the reading room. The story record is
          retained for administration.
        </ConfirmDialog>
      )}
    </div>
  );
}
