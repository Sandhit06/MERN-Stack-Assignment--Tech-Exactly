import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
export function useResource(path) {
  const [state, setState] = useState({ path: null, data: null, error: '', loading: false }),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let live = true;
    if (!path) return;
    setState((previous) => ({
      path,
      data: previous.path === path ? previous.data : null,
      error: '',
      loading: true,
    }));
    api(path)
      .then((data) => {
        if (live) setState({ path, data, error: '', loading: false });
      })
      .catch((err) => {
        if (live) setState({ path, data: null, error: err.message, loading: false });
      });
    return () => {
      live = false;
    };
  }, [path, revision]);
  // Never expose the previous resource's shape during a route/tab transition.
  return { ...(state.path === path ? state : { data: null, error: '', loading: !!path }), reload };
}
