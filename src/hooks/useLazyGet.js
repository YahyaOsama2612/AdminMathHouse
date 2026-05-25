import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import api from "../api/api";

/**
 * Like useGet, but does NOT auto-fetch on mount.
 * Call `fetchData(url)` manually whenever you need fresh data.
 */
export default function useLazyGet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (url) => {
    if (!url) return;
    try {
      setLoading(true);
      const res = await api.get(url);
      setData(res.data);
      setError(null);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Request failed";

      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchData };
}
