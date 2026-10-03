import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Pagination, ErrorMessage, readingTime, Empty } from '../components/UI';
import { Protected } from '../App';
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../context/AuthContext';
describe('reading room components', () => {
  it('paginates accessibly and disables the first-page previous action', () => {
    const change = vi.fn();
    render(<Pagination value={{ page: 1, pages: 3 }} onChange={change} />);
    expect(screen.getByText('Previous')).toBeDisabled();
    fireEvent.click(screen.getByText('Next'));
    expect(change).toHaveBeenCalledWith(2);
  });
  it('hides unnecessary pagination and empty errors', () => {
    const { container } = render(
      <>
        <Pagination value={{ pages: 1 }} />
        <ErrorMessage />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });
  it('exposes errors to assistive technology', () => {
    render(<ErrorMessage>Could not save.</ErrorMessage>);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save.');
  });
  it('shows an actionable empty state and sensible reading time', () => {
    render(<Empty>Write your first story.</Empty>);
    expect(screen.getByText('Write your first story.')).toBeInTheDocument();
    expect(readingTime('hello')).toBe(1);
    expect(readingTime('word '.repeat(500))).toBe(3);
  });
});
describe('protected routes', () => {
  const route = (admin) =>
    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<Protected admin={admin} />}>
            <Route path="private" element={<p>Private content</p>} />
          </Route>
          <Route path="login" element={<p>Login page</p>} />
          <Route path="/" element={<p>Public page</p>} />
        </Routes>
      </MemoryRouter>,
    );
  it('waits for session restoration', () => {
    useAuth.mockReturnValue({ ready: false });
    route(false);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('redirects unauthenticated users', () => {
    useAuth.mockReturnValue({ ready: true, user: null });
    route(false);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
  it('rejects regular users from admin pages', () => {
    useAuth.mockReturnValue({ ready: true, user: { role: 'user' } });
    route(true);
    expect(screen.getByText('Public page')).toBeInTheDocument();
  });
  it('allows admins to enter', () => {
    useAuth.mockReturnValue({ ready: true, user: { role: 'admin' } });
    route(true);
    expect(screen.getByText('Private content')).toBeInTheDocument();
  });
});
