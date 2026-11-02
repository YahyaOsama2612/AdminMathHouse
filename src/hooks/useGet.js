import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import api from "../api/api";

export default function useGet(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!url) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(url);
      setData(res.data);
      setError(null);
    } catch (err) {
      const rawError =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Request failed";

      const errorMsg =
        typeof rawError === "object" && rawError !== null
          ? rawError.message || JSON.stringify(rawError)
          : String(rawError);

      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
