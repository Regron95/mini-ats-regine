import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { ADMIN_NAV } from "../lib/adminNav";
import CandidateModal, { type CandidateDetail } from "../components/CandidateModal";

type Candidate = CandidateDetail & { linkedin_url: string | null };

type Job = { id: string; title: string };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  applied:   { label: "Sökt",       color: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400" },
  screening: { label: "Screening",  color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  interview: { label: "Intervju",   color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
  offer:     { label: "Erbjudande", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  rejected:  { label: "Avvisad",    color: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
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
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchData();
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? ""));
  }, []);

  async function fetchData() {
    const [c, j] = await Promise.all([
      supabase
        .from("candidates")
        .select("id, name, email, linkedin_url, status, job_id, cv_text, cv_url, notes, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("jobs").select("id, title"),
    ]);
    setCandidates((c.data ?? []) as Candidate[]);
    setJobs(j.data ?? []);
    setLoading(false);
  }

  function jobTitle(id: string) {
    return jobs.find((j) => j.id === id)?.title ?? "–";
  }

  function handleStatusChange(id: string, newStatus: string) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
  }

  const filtered = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === null || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

      <div className="pt-14 lg:pt-0 flex-1 overflow-y-auto bg-violet-50/30 dark:bg-gray-950">
        <header className="bg-white dark:bg-gray-900 border-b border-violet-100 dark:border-gray-800 px-8 py-5 sticky top-14 lg:top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Alla kandidater</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {loading ? "…" : `${candidates.length} kandidater totalt`}
          </p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Sök på namn eller e-post…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors shadow-sm"
                />
                <span className="absolute left-3 top-2.5 text-gray-300 text-sm">🔍</span>
              </div>
              <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">{filtered.length} träffar</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter(null)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  statusFilter === null
                    ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                Alla
              </button>
              {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === key ? null : key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                    statusFilter === key
                      ? color + " ring-1 ring-offset-1 ring-current"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-4 animate-pulse shadow-sm">
                  <div className="h-4 bg-violet-100 dark:bg-gray-700 rounded w-48 mb-2" />
                  <div className="h-3 bg-violet-50 dark:bg-gray-700 rounded w-32" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🙋</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Inga kandidater hittades</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Kandidater läggs till från jobbannonser.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => {
                const status = STATUS_LABELS[c.status] ?? { label: c.status, color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400" };
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelected(c)}
                    className="w-full bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-3.5 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all text-left flex items-center gap-4 shadow-sm"
                  >
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(c.name)} flex items-center justify-center shrink-0`}>
                      <span className="text-white text-xs font-bold">{getInitials(c.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{jobTitle(c.job_id)}</p>
                    </div>
                    {c.email && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block truncate max-w-40">{c.email}</p>
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

      {selected && (
        <CandidateModal
          candidate={selected}
          jobTitle={jobTitle(selected.job_id)}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

export default AllCandidatesPage;
