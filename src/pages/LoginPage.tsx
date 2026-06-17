import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const FEATURES = [
  "Visuell kanban-vy per tjänst",
  "AI-driven CV-bedömning på sekunder",
  "Rollbaserade team och behörigheter",
];

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    navigate(profile?.role === "admin" ? "/admin" : "/overview");
    setLoading(false);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: window.location.origin,
    });
    setResetSent(true);
    setResetLoading(false);
  }

  return (
    <div className="flex h-screen">
      {/* Vänster — pastel hero */}
      <div className="hidden lg:flex w-[58%] bg-linear-to-br from-violet-50 via-purple-50 to-fuchsia-50 flex-col justify-between p-14 relative overflow-hidden">

        <div className="absolute -top-10 -right-10 w-80 h-80 bg-violet-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -left-10 w-72 h-72 bg-pink-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-indigo-200/30 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-gray-800 font-semibold text-sm tracking-tight">Mini ATS</span>
        </div>

        {/* Centerinnehåll */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-violet-100 rounded-full px-4 py-1.5 mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
            <span className="text-violet-600 text-sm font-medium">Rekryteringsverktyg för moderna team</span>
          </div>

          <h1 className="text-5xl font-bold text-gray-900 leading-[1.1] mb-5 tracking-tight">
            Hitta talangen.<br />
            <span className="text-violet-500">Behåll farten.</span>
          </h1>

          <p className="text-gray-500 text-base leading-relaxed mb-12 max-w-sm">
            Hantera kandidater, samarbeta i team och låt AI ta hand om CV-analysen — enkelt och smidigt.
          </p>

          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-violet-100 border border-violet-200 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-violet-500" viewBox="0 0 12 10" fill="none">
                    <path
                      d="M1 5l3.5 3.5L11 1"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-gray-600 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-400 text-xs relative z-10">© 2026 Mini ATS</p>
      </div>

      {/* Höger — inloggning */}
      <div className="flex-1 bg-white dark:bg-gray-900 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobil-logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-gray-900 font-semibold text-sm">Mini ATS</span>
          </div>

          {mode === "login" ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
                Välkommen tillbaka
              </h2>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">Logga in för att fortsätta.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    E-post
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="du@exempel.se"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:bg-white dark:focus:bg-gray-700 transition-colors"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Lösenord
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setResetEmail(email); setError(""); }}
                      className="text-xs text-violet-500 hover:text-violet-700 transition-colors cursor-pointer"
                    >
                      Glömt lösenord?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:bg-white dark:focus:bg-gray-700 transition-colors"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
                >
                  {loading ? "Loggar in…" : "Logga in"}
                </button>
              </form>

              <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-6">
                Har du inget konto?{" "}
                <span className="text-violet-600 dark:text-violet-400 font-medium">Begär tillgång</span>
                {" "}av din administratör.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setMode("login"); setResetSent(false); setResetEmail(""); }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer mb-6 flex items-center gap-1"
              >
                ← Tillbaka till inloggning
              </button>

              <h2 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
                Glömt lösenord?
              </h2>
              <p className="text-sm text-gray-400 mb-8">
                Ange din e-post så skickar vi en återställningslänk.
              </p>

              {resetSent ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-4 text-center">
                  <p className="text-sm font-semibold text-emerald-700 mb-1">Kolla din e-post!</p>
                  <p className="text-xs text-emerald-600">Vi har skickat en återställningslänk till {resetEmail}.</p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      E-post
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      placeholder="du@exempel.se"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:bg-white transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
                  >
                    {resetLoading ? "Skickar…" : "Skicka återställningslänk"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
