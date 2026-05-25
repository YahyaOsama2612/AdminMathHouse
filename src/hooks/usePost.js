import { useState } from "react";
import { toast } from "react-hot-toast";
import api from "../api/api";

export default function usePost(defaultUrl = "") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const postData = async (body = {}, customUrl = null, toastMessage = "Success") => {
    try {
      setLoading(true);

      const url = String(customUrl || defaultUrl);

  
      const res = await api.post(url, body);

      
      toast.success(toastMessage);

      return res.data;
    }catch (err) {
  const error = err?.response?.data?.error;

  let errorMessage = "Error try ";

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

  return { postData, loading, error };
}
