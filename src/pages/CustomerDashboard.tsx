import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { logActivity } from "../lib/activity";
import { ADMIN_NAV } from "../lib/adminNav";
import { CUSTOMER_NAV } from "../lib/customerNav";

type Job = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  is_open: boolean;
};

type JobErrors = { title?: string };
type FilterType = "all" | "open" | "closed";

function CustomerDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidateCounts, setCandidateCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<JobErrors>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "customer">("customer");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? "");
    setUserId(user.id);

    const { data: profile } = await supabase.from("profiles").select("role, company_id").eq("id", user.id).single();
    const role = (profile?.role as "admin" | "customer") ?? "customer";
    setUserRole(role);
    const cId = profile?.company_id ?? null;
    setCompanyId(cId);

    if (cId) {
      const { data: companyData } = await supabase.from("companies").select("name").eq("id", cId).single();
      setCompany(companyData?.name ?? "");
    }

    await fetchJobs(role, cId);
  }

  async function fetchJobs(roleArg?: "admin" | "customer", cIdArg?: string | null) {
    const role = roleArg ?? userRole;
    const cId = cIdArg !== undefined ? cIdArg : companyId;

    let jobsQuery = supabase
      .from("jobs")
      .select("id, title, description, created_at, is_open")
      .order("is_open", { ascending: false })
      .order("created_at", { ascending: false });

    if (role === "customer" && cId) {
      jobsQuery = jobsQuery.eq("company_id", cId);
    }

    const [jobsRes, candRes] = await Promise.all([
      jobsQuery,
      supabase.from("candidates").select("job_id"),
    ]);

    setJobs(jobsRes.data ?? []);

    const counts: Record<string, number> = {};
    candRes.data?.forEach((c) => { counts[c.job_id] = (counts[c.job_id] ?? 0) + 1; });
    setCandidateCounts(counts);
    setLoading(false);
  }

  function validate(): boolean {
    const e: JobErrors = {};
    if (!title.trim()) e.title = "Titel är obligatorisk";
    else if (title.trim().length < 2) e.title = "Minst 2 tecken";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    if (!companyId) {
      alert("Din användare är inte kopplad till ett företag. Kontakta din administratör.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("jobs").insert({
      title: title.trim(),
      description: description.trim() || null,
      company_id: companyId,
      created_by: userId,
    });

    if (error) {
      alert("Fel vid lagring: " + error.message);
      setSaving(false);
      return;
    }

    const createdTitle = title.trim();
    setTitle("");
    setDescription("");
    setShowForm(false);
    setSaving(false);
    await fetchJobs();
    logActivity("job_created", createdTitle);
  }

  async function handleToggleJob(jobId: string, currentIsOpen: boolean) {
    const { error } = await supabase.from("jobs").update({ is_open: !currentIsOpen }).eq("id", jobId);
    if (error) { alert("Fel: " + error.message); return; }
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, is_open: !currentIsOpen } : j));
  }

  async function handleDeleteJob(jobId: string, jobTitle: string) {
    if (!confirm(`Ta bort jobbet "${jobTitle}"? Alla kandidater tas också bort.`)) return;
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) { alert("Fel vid borttagning: " + error.message); return; }
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  const filtered = jobs.filter((j) => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "open" && j.is_open !== false) ||
      (filter === "closed" && j.is_open === false);
    return matchSearch && matchFilter;
  });

  const navLinks = (userRole === "admin" ? ADMIN_NAV : CUSTOMER_NAV).map((item) => ({
    label: item.label,
    onClick: () => navigate(item.path),
    active: location.pathname === item.path,
  }));

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all",    label: "Alla" },
    { key: "open",   label: "Aktiva" },
    { key: "closed", label: "Stängda" },
  ];

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
        <header className="bg-white dark:bg-gray-900 border-b border-violet-100 dark:border-gray-800 px-4 sm:px-6 py-5 flex items-center justify-between sticky top-14 lg:top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Mina jobb</h1>
            {!loading && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{jobs.length} jobb totalt</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setShowForm(!showForm); setErrors({}); }}
            className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 cursor-pointer font-medium transition-colors shadow-sm"
          >
            {showForm ? "Avbryt" : "+ Skapa nytt jobb"}
          </button>
        </header>

        <main className="px-4 sm:px-6 py-6">
          {/* Create form */}
          {showForm && (
            <form
              onSubmit={handleCreateJob}
              className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl p-6 mb-6 space-y-4 shadow-sm"
            >
              <h2 className="font-semibold text-gray-900 dark:text-white">Nytt jobb</h2>
              <div>
                <label htmlFor="job-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Titel *
                </label>
                <input
                  id="job-title"
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setErrors({}); }}
                  placeholder="t.ex. Frontend-utvecklare"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 transition-colors ${
                    errors.title
                      ? "border-red-300 focus:ring-red-300"
                      : "border-gray-200 dark:border-gray-600 focus:ring-violet-400"
                  }`}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>
              <div>
                <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Beskrivning
                </label>
                <textarea
                  id="job-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Beskriv rollen och vad ni söker…"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-violet-600 text-white text-sm rounded-xl px-5 py-2 hover:bg-violet-700 disabled:opacity-50 cursor-pointer font-medium transition-colors shadow-sm"
              >
                {saving ? "Sparar…" : "Spara jobb"}
              </button>
            </form>
          )}

          {/* Filters + search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex gap-1 bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-xl p-1 shadow-sm">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    filter === f.key
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Sök jobb…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors shadow-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-300 text-sm">🔍</span>
            </div>
          </div>

          {/* Job grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl p-5 animate-pulse shadow-sm">
                  <div className="h-4 bg-violet-100 dark:bg-gray-700 rounded w-24 mb-3" />
                  <div className="h-5 bg-violet-100 dark:bg-gray-700 rounded w-48 mb-2" />
                  <div className="h-3 bg-violet-50 dark:bg-gray-700 rounded w-full mb-1" />
                  <div className="h-3 bg-violet-50 dark:bg-gray-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                {jobs.length === 0 ? "Inga jobb ännu" : "Inga träffar"}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {jobs.length === 0 ? 'Klicka på "+ Skapa nytt jobb" för att komma igång.' : "Prova ett annat sökord eller filter."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((job) => {
                const count = candidateCounts[job.id] ?? 0;
                const isOpen = job.is_open !== false;
                return (
                  <div
                    key={job.id}
                    className="group bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl p-5 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all shadow-sm flex flex-col"
                  >
                    {/* Status badge */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => handleToggleJob(job.id, isOpen)}
                        title={isOpen ? "Klikk for å stenge" : "Klikk for å åpne"}
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                          isOpen
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/50"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {isOpen ? "● Öppen" : "○ Stängd"}
                      </button>
                      <span className="text-xs text-gray-300 dark:text-gray-600">
                        {new Date(job.created_at).toLocaleDateString("sv-SE")}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`font-semibold text-base mb-1.5 ${
                      isOpen ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"
                    }`}>
                      {job.title}
                    </h3>

                    {/* Description */}
                    {job.description ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 line-clamp-2 mb-4 flex-1">
                        {job.description}
                      </p>
                    ) : (
                      <div className="flex-1" />
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-violet-50 dark:border-gray-700">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {count > 0 ? `${count} kandidat${count !== 1 ? "er" : ""}` : "Inga kandidater"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteJob(job.id, job.title)}
                          className="text-xs text-gray-300 dark:text-gray-600 hover:text-rose-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        >
                          Ta bort
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors cursor-pointer"
                        >
                          Öppna →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default CustomerDashboard;
