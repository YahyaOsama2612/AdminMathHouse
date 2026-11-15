import { useRouteError } from "react-router-dom";
import { AlertTriangle, Lock } from "lucide-react";

/** Error card in the MathPortal admin design. Auth errors offer to sign in again. Props unchanged. */
const Errorpage = ({ error }) => {
  const routeError = useRouteError();
  const rawMessage =
    error?.message ||
    (typeof error === "string" ? error : null) ||
    routeError?.message ||
    routeError?.statusText ||
    routeError?.data?.message ||
    (typeof routeError === "string" ? routeError : null) ||
    "Something went wrong while loading this page. Check your connection and try again.";

  const msg = String(rawMessage).toLowerCase();
  const isAuthError = ["unauthorized", "token", "jwt", "401"].some((w) => msg.includes(w));

  const handleLoginRedirect = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("admin_profile");
    window.location.href = "/";
  };

  return (
    <div className="w-full flex items-center justify-center py-16 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <span className={`w-14 h-14 rounded-2xl inline-flex items-center justify-center mb-3 ${isAuthError ? "bg-amber-50 text-amber-600" : "bg-red-50 text-one"}`}>
          {isAuthError ? <Lock size={24} /> : <AlertTriangle size={24} />}
        </span>
        <h1 className="text-lg font-bold text-gray-900">{isAuthError ? "Your session ended" : "Couldn’t load this page"}</h1>
        <p className="text-sm text-gray-500 mt-1 break-words">{rawMessage}</p>
        <div className="flex justify-center gap-2 mt-5">
          {isAuthError ? (
            <button onClick={handleLoginRedirect} className="a-btn primary">Sign in again</button>
          ) : (
            <>
              <button onClick={() => window.history.back()} className="a-btn">← Back</button>
              <button onClick={() => window.location.reload()} className="a-btn primary">Try again</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Errorpage;
