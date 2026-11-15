import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

/* Sign-in screen in the MathPortal look: gray-50 page, white card with the π logo tile,
   "MathPortal" wordmark + area label, email/password fields and a full-width primary button.
   Used by Login (admin) and LoginDrive (drive); each page owns its own request and redirect. */
export default function AuthScreen({ area, email, setEmail, password, setPassword, onSubmit, loading, error }) {
  const [show, setShow] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 font-sans" style={{ background: "#f8fafc" }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <img alt="MathPortal" className="w-11 h-11 rounded-xl shadow-sm shrink-0" src="/favicon.svg" />
            <div className="leading-tight min-w-0">
              <div className="font-bold text-xl text-gray-900 tracking-tight">Math<span className="text-one">Portal</span></div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{area}</div>
            </div>
          </div>

          <h1 className="font-bold text-lg text-gray-800">Sign in</h1>
          <p className="text-xs text-gray-400 mb-5">Use the email and password of your account.</p>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="auth-email" className="a-lbl-f">Email</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="a-inp"
              />
            </div>

            <div>
              <label htmlFor="auth-pass" className="a-lbl-f">Password</label>
              <div className="relative">
                <input
                  id="auth-pass"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="a-inp pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-700"
                  aria-label={show ? "Hide password" : "Show password"}
                  title={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-line">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="a-btn primary w-full py-3">
              {loading ? (<><Loader2 size={16} className="animate-spin" /> Signing in…</>) : "Sign in"}
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-4">MathPortal · {area}</p>
      </div>
      <Toaster />
    </div>
  );
}
