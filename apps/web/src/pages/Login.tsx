import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authClient, useSession } from "../lib/auth-client";

export function Login() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Sign in — Help Desk";
  }, []);

  if (!isPending && session) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    await authClient.signIn.email(
      { email, password },
      {
        onRequest: () => setSubmitting(true),
        onSuccess: () => navigate("/"),
        onError: (ctx) => {
          setSubmitting(false);
          setError(ctx.error.message ?? "Invalid email or password");
        },
      },
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
            H
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Sign in to Help Desk</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your credentials to access your dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm shadow-slate-200/60"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
