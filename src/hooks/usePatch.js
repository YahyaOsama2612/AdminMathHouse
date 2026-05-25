import { useState } from "react";
import api from "../api/api"; // axios instance
import { toast } from "react-hot-toast";

export default function usePatch(defaultUrl = "") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const patchData = async (body = {}, customUrl = null, toastMessage = null) => {
    try {
      setLoading(true);
      setError(null);

      const url = customUrl || defaultUrl;
      const res = await api.patch(url, body);

      if (toastMessage) toast.success(toastMessage);

      return res.data;
    } catch (err) {
      const error = err?.response?.data?.error;

      let errorMessage = "Error, please try again";

      if (error?.details && Array.isArray(error.details)) {
        errorMessage = error.details.map(e => e.message).join("\n");
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);

      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { patchData, loading, error };
}
