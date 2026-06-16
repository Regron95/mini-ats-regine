import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { ADMIN_NAV } from "../lib/adminNav";

type Candidate = {
  id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  status: string;
  job_id: string;
};

type Job = { id: string; title: string };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  applied:   { label: "Sökt",       color: "bg-violet-100 text-violet-700" },
  screening: { label: "Screening",  color: "bg-blue-100 text-blue-700" },
  interview: { label: "Intervju",   color: "bg-amber-100 text-amber-700" },
  offer:     { label: "Erbjudande", color: "bg-emerald-100 text-emerald-700" },
  rejected:  { label: "Avvisad",    color: "bg-rose-100 text-rose-700" },
};

const AVATAR_COLORS = [
  "bg-violet-400", "bg-pink-400", "bg-sky-400",
  "bg-emerald-400", "bg-amber-400", "bg-indigo-400", "bg-rose-400",
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

function AllCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchData();
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? ""));
  }, []);

  async function fetchData() {
    const [c, j] = await Promise.all([
      supabase.from("candidates").select("id, name, email, linkedin_url, status, job_id").order("created_at", { ascending: false }),
      supabase.from("jobs").select("id, title"),
    ]);
    setCandidates(c.data ?? []);
    setJobs(j.data ?? []);
    setLoading(false);
  }

  const jobTitle = (id: string) => jobs.find((j) => j.id === id)?.title ?? "–";

  const filtered = candidates.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        email={email}
        role="admin"
        links={ADMIN_NAV.map((item) => ({
          label: item.label,
          onClick: () => navigate(item.path),
          active: location.pathname === item.path,
        }))}
        onLogout={async () => await supabase.auth.signOut()}
      />

      <div className="flex-1 overflow-y-auto bg-violet-50/30">
        <header className="bg-white border-b border-violet-100 px-8 py-5 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900">Alla kandidater</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "…" : `${candidates.length} kandidater totalt`}
          </p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Sök på namn eller e-post…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors shadow-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-300 text-sm">🔍</span>
            </div>
            <span className="text-sm text-gray-400 shrink-0">{filtered.length} träffar</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-violet-100 rounded-2xl px-5 py-4 animate-pulse shadow-sm">
                  <div className="h-4 bg-violet-100 rounded w-48 mb-2" />
                  <div className="h-3 bg-violet-50 rounded w-32" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🙋</span>
              </div>
              <p className="font-semibold text-gray-900 mb-1">Inga kandidater hittades</p>
              <p className="text-sm text-gray-400">Kandidater läggs till från jobbannonser.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => {
                const status = STATUS_LABELS[c.status] ?? { label: c.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`/jobs/${c.job_id}`)}
                    className="w-full bg-white border border-violet-100 rounded-2xl px-5 py-3.5 hover:border-violet-300 hover:shadow-sm transition-all text-left flex items-center gap-4 shadow-sm"
                  >
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(c.name)} flex items-center justify-center shrink-0`}>
                      <span className="text-white text-xs font-bold">{getInitials(c.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate">{jobTitle(c.job_id)}</p>
                    </div>
                    {c.email && (
                      <p className="text-xs text-gray-400 hidden sm:block truncate max-w-40">{c.email}</p>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default AllCandidatesPage;
