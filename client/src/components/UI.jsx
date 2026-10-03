import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, X } from 'lucide-react';
export const dateLabel = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const readingTime = (content) =>
  Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 220));
export function Avatar({ name = 'Reader', small = false }) {
  return (
    <span className={`avatar ${small ? 'small' : ''}`} aria-hidden="true">
      {name
        .split(' ')
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase()}
    </span>
  );
}
export function ErrorMessage({ children }) {
  return children ? (
    <div className="error-message" role="alert">
      {children}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Turning the page…
    </div>
  );
}
export function Empty({ title = 'A blank page, for now.', children }) {
  return (
    <div className="empty">
      <BookOpen size={32} strokeWidth={1.3} />
      <h2>{title}</h2>
      <p>{children || 'There are no stories here yet.'}</p>
    </div>
  );
}
export function Pagination({ value, onChange }) {
  if (!value || value.pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="button outline"
        disabled={value.page <= 1}
        onClick={() => onChange(value.page - 1)}
      >
        <ArrowLeft size={16} />
        Previous
      </button>
      <span>
        Page {value.page} of {value.pages}
      </span>
      <button
        className="button outline"
        disabled={value.page >= value.pages}
        onClick={() => onChange(value.page + 1)}
      >
        Next
        <ArrowRight size={16} />
      </button>
    </nav>
  );
}
export function ConfirmDialog({ title, children, onConfirm, onClose, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <button
        className="icon-button dialog-close"
        aria-label="Close dialog"
        onClick={onClose}
        disabled={busy}
      >
        <X size={20} />
      </button>
      <p className="eyebrow">A QUICK CHECK</p>
      <h2 id="dialog-title">{title}</h2>
      <div className="muted">{children}</div>
      <div className="dialog-actions">
        <button className="button outline" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="button danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : 'Confirm'}
        </button>
      </div>
    </dialog>
  );
}
export function StoryArt({ variant = 0, large = false }) {
  return (
    <div className={`story-art art-${variant % 4} ${large ? 'large-art' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 480 300" fill="none">
        <circle cx="355" cy="70" r="96" className="art-sun" />
        <path
          d="M-20 300C80 150 185 100 270 185S410 300 510 120V320H-20Z"
          className="art-hill-back"
        />
        <path
          d="M-20 315C85 195 154 268 242 219S401 127 510 252V330H-20Z"
          className="art-hill-front"
        />
        <path
          d="M225 305C235 266 303 227 328 181M331 185C284 166 269 133 271 111C314 118 335 153 331 185ZM317 205C367 196 390 162 390 143C350 144 323 177 317 205Z"
          className="art-stem"
          strokeWidth="3"
        />
        <path d="M45 43H99M45 51H78" stroke="currentColor" opacity=".25" />
        <circle cx="428" cy="258" r="15" stroke="currentColor" opacity=".3" />
      </svg>
    </div>
  );
}
