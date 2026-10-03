import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, PenLine } from 'lucide-react';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../context/AuthContext';
import {
  Avatar,
  dateLabel,
  readingTime,
  StoryArt,
  Loading,
  ErrorMessage,
  Empty,
  Pagination,
} from '../components/UI';
export function Home({ mine = false }) {
  const [params, setParams] = useSearchParams(),
    { user } = useAuth();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, loading, error } = useResource(
    `/posts?page=${page}&limit=9${mine ? '&mine=true' : ''}`,
  );
  return (
    <div className="container home-page">
      {mine ? (
        <section className="page-heading">
          <p className="eyebrow">YOUR CORNER OF MARGIN</p>
          <h1>Words with your name on them.</h1>
          <p>Your ideas, your stories, your next beginning.</p>
          <Link className="button primary" to="/write">
            <PenLine size={16} />
            Write a story
          </Link>
        </section>
      ) : (
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-star">✳</span> INDEPENDENT VOICES. SHARED CURIOSITY.
            </p>
            <h1>
              A little room
              <br />
              for <em>thought.</em>
            </h1>
            <p>
              Good stories make us pause. Great conversations
              <br className="desktop-break" /> help us see things differently. Make space for both.
            </p>
            <a className="text-link" href="#stories">
              Find your next read
              <ArrowRight size={18} />
            </a>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="paper paper-back" />
            <div className="paper paper-front">
              <span className="paper-kicker">THE EVERYDAY JOURNAL</span>
              <span className="paper-title">
                There is a story
                <br />
                in everything.
              </span>
              <StoryArt variant={0} />
              <div className="paper-lines">
                <i />
                <i />
                <i />
              </div>
              <span className="paper-signature">Make it yours. ↗</span>
            </div>
            <span className="hero-spark">✳</span>
            <span className="hero-caption">A fresh perspective starts here.</span>
          </div>
        </section>
      )}
      <section id="stories" className="stories-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{mine ? 'WRITTEN BY YOU' : 'THE READING ROOM'}</p>
            <h2>
              {mine ? 'Your stories' : 'Fresh off the page'}
              <span className="count-pill">{data?.pagination.total ?? '—'}</span>
            </h2>
          </div>
          <span className="sort-label">
            Newest first <span>↓</span>
          </span>
        </div>
        <div className="feed-layout">
          <div>
            <ErrorMessage>{error}</ErrorMessage>
            {loading ? (
              <Loading />
            ) : data?.items.length ? (
              <>
                <div className="story-grid">
                  {data.items.map((post, index) => (
                    <article className="story-card" key={post.id}>
                      <Link
                        to={`/stories/${post.slug}`}
                        className="art-link"
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <StoryArt variant={index} />
                      </Link>
                      <div className="story-card-body">
                        <div className="story-meta">
                          <span>ESSAY & IDEAS</span>
                          <span>{readingTime(post.content)} min read</span>
                        </div>
                        <h3>
                          <Link to={`/stories/${post.slug}`}>{post.title}</Link>
                        </h3>
                        <p className="story-excerpt">
                          {post.content.slice(0, 150)}
                          {post.content.length > 150 ? '…' : ''}
                        </p>
                        <div className="story-byline">
                          <Avatar name={post.author.name} small />
                          <div>
                            <span>{post.author.name}</span>
                            <time dateTime={post.createdAt}>{dateLabel(post.createdAt)}</time>
                          </div>
                          <Link
                            className="card-arrow"
                            to={`/stories/${post.slug}`}
                            aria-label={`Read ${post.title}`}
                          >
                            <ArrowUpRight size={19} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <Pagination value={data.pagination} onChange={(p) => setParams({ page: p })} />
              </>
            ) : (
              !error && (
                <Empty>
                  {mine
                    ? 'Your first story is waiting to be written.'
                    : 'Be the first to share a story with the community.'}
                </Empty>
              )
            )}
          </div>
          <aside className="feed-sidebar">
            <div className="invitation">
              <span className="invitation-star">✳</span>
              <p className="eyebrow">EVERY VOICE BELONGS</p>
              <h2>
                Something
                <br />
                on your mind?
              </h2>
              <p>
                A small observation. A big idea.
                <br />A story only you can tell.
                <br />
                There’s room for it here.
              </p>
              <Link className="button cream" to={user ? '/write' : '/register'}>
                Put it into words
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="sidebar-note">
              <span>01 / THE MARGIN NOTE</span>
              <p>
                “The beautiful part of writing is that you don’t have to get it right the first
                time.”
              </p>
              <div className="note-line" />
              <small>Start somewhere. Keep going.</small>
            </div>
            <div className="community-note">
              <span className="status-dot" />A space for thoughtful conversations.
              <p>
                Read generously. Write honestly.
                <br />
                Leave a little kindness in the comments.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
