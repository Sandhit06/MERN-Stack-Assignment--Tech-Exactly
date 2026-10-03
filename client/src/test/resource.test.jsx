import { render, screen, waitFor } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { useResource } from '../hooks/useResource';
import { api } from '../api/client';
vi.mock('../api/client', () => ({ api: vi.fn() }));
it('does not render stale resource data when switching admin tabs', async () => {
  api
    .mockResolvedValueOnce({ items: [{ name: 'User' }] })
    .mockResolvedValueOnce({ items: [{ author: { name: 'Author' } }] });
  function Panel({ tab }) {
    const { data, loading } = useResource(`/admin/${tab}`);
    if (loading || !data) return <p>Loading</p>;
    return <p>{tab === 'users' ? data.items[0].name : data.items[0].author.name}</p>;
  }
  const { rerender } = render(<Panel tab="users" />);
  await screen.findByText('User');
  rerender(<Panel tab="posts" />);
  expect(screen.queryByText('User')).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('Author')).toBeInTheDocument());
});
