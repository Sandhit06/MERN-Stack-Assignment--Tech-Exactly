import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  MessageCircle,
  ArrowUpRight,
  ShieldCheck,
  Pencil,
  Trash2,
} from 'lucide-react';
import { api } from '../api/client';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../context/AuthContext';
import {
  Avatar,
  dateLabel,
  Loading,
  ErrorMessage,
  Empty,
  Pagination,
  ConfirmDialog,
} from '../components/UI';
export function Admin() {
  const { user, signOut } = useAuth(),
    [tab, setTab] = useState('posts'),
    [page, setPage] = useState(1),
    [deleted, setDeleted] = useState(false);
  const stats = useResource('/admin/stats'),
    listing = useResource(
      `/admin/${tab}?page=${page}&limit=10${tab !== 'comments' && deleted ? '&deleted=true' : ''}`,
    );
  const [action, setAction] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [edit, setEdit] = useState(null);
  async function runAction() {
    setBusy(true);
    setError('');
    try {
      await api(action.path, { method: action.method, body: action.body });
      if (action.self) {
        await signOut();
        return;
      }
      setAction(null);
      if (listing.data.items.length === 1 && page > 1) setPage(page - 1);
      listing.reload();
      stats.reload();
    } catch (err) {
      setError(err.message);
      setAction(null);
    } finally {
      setBusy(false);
    }
  }
  async function saveComment(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/comments/${edit.id}`, { method: 'PATCH', body: { content: edit.content } });
      setEdit(null);
      listing.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  function changeUser(item, body, title) {
    setAction({
      path: `/admin/users/${item.id}`,
      method: 'PATCH',
      body,
      title,
      self: item.id === user.id,
      description: 'This updates the account and signs it out of existing sessions.',
    });
  }
  function remove(item) {
    setAction({
      path: tab === 'users' ? `/admin/users/${item.id}` : `/${tab}/${item.id}`,
      method: 'DELETE',
      title: `Delete this ${tab === 'users' ? 'account' : tab === 'posts' ? 'story' : 'comment'}?`,
      self: tab === 'users' && item.id === user.id,
      description:
        tab === 'comments'
          ? 'The comment will be permanently removed.'
          : 'The record will be soft-deleted and removed from public access.',
    });
  }
  return (
    <div className="container admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">
            <ShieldCheck size={15} /> THE EDITOR’S DESK
          </p>
          <h1>
            A thoughtful space,
            <br />
            well looked after.
          </h1>
          <p className="muted">Manage the people, stories, and conversations that make Margin.</p>
        </div>
        <Link to="/" className="button outline">
          Visit the reading room
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <ErrorMessage>{stats.error}</ErrorMessage>
      <div className="stats-grid">
        {[
          ['users', 'Community members', Users],
          ['posts', 'Published stories', BookOpen],
          ['comments', 'Conversations', MessageCircle],
        ].map(([key, label, Icon]) => (
          <div className="stat-card" key={key}>
            <span>
              <Icon size={21} strokeWidth={1.4} />
              {label}
            </span>
            <strong>{stats.data?.[key] ?? '—'}</strong>
            <small>
              {key === 'users'
                ? 'Non-deleted accounts, including disabled'
                : key === 'posts'
                  ? 'Stories currently in the reading room'
                  : 'Comments on non-deleted stories'}
            </small>
          </div>
        ))}
      </div>
      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="tabs" role="tablist" aria-label="Manage resources">
            {['posts', 'users', 'comments'].map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                className={tab === value ? 'active' : ''}
                onClick={() => {
                  setTab(value);
                  setPage(1);
                  setDeleted(false);
                  setError('');
                }}
              >
                {value === 'posts' ? 'Stories' : value === 'users' ? 'People' : 'Comments'}
              </button>
            ))}
          </div>
          {tab !== 'comments' && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={deleted}
                onChange={(e) => {
                  setDeleted(e.target.checked);
                  setPage(1);
                }}
              />
              Show deleted
            </label>
          )}
        </div>
        <ErrorMessage>{error || listing.error}</ErrorMessage>
        {listing.loading ? (
          <Loading />
        ) : listing.data?.items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tab === 'users' ? 'Person' : tab === 'posts' ? 'Story' : 'Comment'}</th>
                  <th>{tab === 'users' ? 'Role & status' : 'Author'}</th>
                  <th>Date</th>
                  <th className="actions-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listing.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {tab === 'users' ? (
                        <div className="table-person">
                          <Avatar name={item.name} small />
                          <div>
                            <strong>{item.name}</strong>
                            <small>{item.email || 'Social account'}</small>
                          </div>
                        </div>
                      ) : tab === 'posts' ? (
                        <>
                          <strong>
                            {item.deletedAt ? (
                              item.title
                            ) : (
                              <Link to={`/stories/${item.slug}`}>{item.title}</Link>
                            )}
                          </strong>
                          <small>/{item.slug}</small>
                        </>
                      ) : (
                        <>
                          <p className="table-comment">{item.content}</p>
                          <small>
                            {item.post?.title || 'Unavailable story'}
                            {item.post?.deletedAt ? ' · deleted' : ''}
                          </small>
                        </>
                      )}
                    </td>
                    <td>
                      {tab === 'users' ? (
                        <>
                          <span className={`badge ${item.role === 'admin' ? 'admin-badge' : ''}`}>
                            {item.role}
                          </span>
                          <small>{item.deletedAt ? 'Deleted' : item.status}</small>
                        </>
                      ) : (
                        item.author.name
                      )}
                    </td>
                    <td className="date-cell">{dateLabel(item.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        {tab === 'users' && !item.deletedAt && (
                          <>
                            <button
                              className="text-button"
                              onClick={() =>
                                changeUser(
                                  item,
                                  { role: item.role === 'admin' ? 'user' : 'admin' },
                                  `Change ${item.name}’s role?`,
                                )
                              }
                            >
                              {item.role === 'admin' ? 'Make user' : 'Make admin'}
                            </button>
                            <button
                              className="text-button"
                              onClick={() =>
                                changeUser(
                                  item,
                                  { status: item.status === 'active' ? 'disabled' : 'active' },
                                  `${item.status === 'active' ? 'Disable' : 'Reactivate'} this account?`,
                                )
                              }
                            >
                              {item.status === 'active' ? 'Disable' : 'Reactivate'}
                            </button>
                          </>
                        )}
                        {tab === 'posts' && !item.deletedAt && (
                          <Link
                            className="icon-button"
                            aria-label={`Edit ${item.title}`}
                            to={`/edit/${item.id}`}
                          >
                            <Pencil size={16} />
                          </Link>
                        )}
                        {tab === 'comments' && (
                          <button
                            className="icon-button"
                            aria-label="Edit comment"
                            onClick={() => setEdit({ id: item.id, content: item.content })}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {!item.deletedAt && (
                          <button
                            className="icon-button"
                            aria-label={`Delete ${tab === 'users' ? item.name : tab === 'posts' ? item.title : 'comment'}`}
                            onClick={() => remove(item)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !listing.error && <Empty title="All quiet here.">No matching records to show.</Empty>
        )}
        <Pagination value={listing.data?.pagination} onChange={setPage} />
      </section>
      {action && (
        <ConfirmDialog
          title={action.title}
          onConfirm={runAction}
          onClose={() => setAction(null)}
          busy={busy}
        >
          {action.description}
        </ConfirmDialog>
      )}
      {edit && (
        <div className="admin-comment-editor">
          <form onSubmit={saveComment}>
            <h2>Edit comment</h2>
            <label>
              Comment
              <textarea
                required
                maxLength={2000}
                value={edit.content}
                onChange={(e) => setEdit({ ...edit, content: e.target.value })}
              />
            </label>
            <div className="inline-actions">
              <button className="button primary" disabled={busy}>
                Save comment
              </button>
              <button type="button" className="button outline" onClick={() => setEdit(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
