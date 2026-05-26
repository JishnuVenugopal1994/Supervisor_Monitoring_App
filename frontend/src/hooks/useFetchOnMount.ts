import { useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../services/api';

/**
 * Generic hook for fetching a list from an API endpoint on mount.
 * Handles loading state, error toast, and AbortController cleanup on unmount.
 */
export function useFetchOnMount<T>(
  url: string,
  setter: (items: T[]) => void,
  setLoading: (loading: boolean) => void
): void {
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .get<T[]>(url, { signal: controller.signal })
      .then((res) => setter(res.data))
      .catch((err) => {
        if (!axios.isCancel(err)) {
          toast.error(getErrorMessage(err));
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
}
