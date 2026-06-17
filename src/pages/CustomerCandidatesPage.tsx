import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { CUSTOMER_NAV } from "../lib/customerNav";
import { ADMIN_NAV } from "../lib/adminNav";
import CandidateModal, { type CandidateDetail } from "../components/CandidateModal";

type CandidateRow = CandidateDetail & {
  jobs: { title: string } | null;
};

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

function CustomerCandidatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "customer">("customer");
  const [selected, setSelected] = useState<CandidateRow | null>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? "");

    const { data: profile } = await supabase.from("profiles").select("role, company_id").eq("id", user.id).single();
    const role = (profile?.role as "admin" | "customer") ?? "customer";
    setUserRole(role);

    if (profile?.company_id) {
      const { data: companyData } = await supabase.from("companies").select("name").eq("id", profile.company_id).single();
      setCompany(companyData?.name ?? "");
    }

    let candidatesQuery = supabase
      .from("candidates")
      .select("id, name, email, linkedin_url, status, job_id, cv_text, cv_url, notes, created_at, jobs(title)")
      .order("created_at", { ascending: false });

    if (role === "customer" && profile?.company_id) {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("id")
        .eq("company_id", profile.company_id);
      const jobIds = jobData?.map((j) => j.id) ?? [];
      if (jobIds.length === 0) {
        setCandidates([]);
        setLoading(false);
        return;
      }
      candidatesQuery = candidatesQuery.in("job_id", jobIds);
    }

    const { data } = await candidatesQuery;
    setCandidates((data as CandidateRow[]) ?? []);
    setLoading(false);
  }

  function handleStatusChange(id: string, newStatus: string) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
  }

  const uniqueJobs = Array.from(
    new Map(candidates.map((c) => [c.job_id, c.jobs?.title ?? c.job_id])).entries()
  ).map(([id, title]) => ({ id, title }));

  const filtered = candidates.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchJob = jobFilter === null || c.job_id === jobFilter;
    return matchSearch && matchJob;
  });

  const navLinks = (userRole === "admin" ? ADMIN_NAV : CUSTOMER_NAV).map((item) => ({
    label: item.label,
    onClick: () => navigate(item.path),
    active: location.pathname === item.path,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        email={email}
        company={userRole === "customer" ? company : undefined}
        role={userRole}
        links={navLinks}
        onLogout={async () => await supabase.auth.signOut()}
      />

      <div className="pt-14 lg:pt-0 flex-1 overflow-y-auto bg-violet-50/30 dark:bg-gray-950">
        <header className="bg-white dark:bg-gray-900 border-b border-violet-100 dark:border-gray-800 px-6 py-5 sticky top-14 lg:top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Mina kandidater</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {loading ? "…" : `${candidates.length} kandidater totalt`}
          </p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Sök på namn eller e-post…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors shadow-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-300 text-sm">🔍</span>
            </div>
            <select
              aria-label="Filtrera på jobb"
              value={jobFilter ?? ""}
              onChange={(e) => setJobFilter(e.target.value || null)}
              className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer shadow-sm"
            >
              <option value="">Alla jobb</option>
              {uniqueJobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            <span className="text-sm text-gray-400 dark:text-gray-500 self-center shrink-0">
              {filtered.length} träffar
            </span>
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
              <p className="text-sm text-gray-400 dark:text-gray-500">Kandidater läggs till via jobbannonser.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => {
                const status = STATUS_LABELS[c.status] ?? {
                  label: c.status,
                  color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
                };
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
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.jobs?.title ?? "–"}</p>
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
          jobTitle={selected.jobs?.title ?? "–"}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

export default CustomerCandidatesPage;
