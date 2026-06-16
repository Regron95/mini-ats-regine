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

    navigate(profile?.role === "admin" ? "/admin" : "/dashboard");
    setLoading(false);
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
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobil-logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-gray-900 font-semibold text-sm">Mini ATS</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
            Välkommen tillbaka
          </h2>
          <p className="text-sm text-gray-400 mb-8">Logga in för att fortsätta.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                E-post
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="du@exempel.se"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Lösenord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:bg-white transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-500">{error}</p>
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
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
