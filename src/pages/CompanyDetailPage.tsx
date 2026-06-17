import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { ADMIN_NAV } from "../lib/adminNav";

type Company = { id: string; name: string };
type Job = { id: string; title: string; description: string | null; created_at: string; is_open: boolean };
type Profile = { id: string; email: string | null; role: string };
type Candidate = { id: string; name: string; status: string; job_id: string };

function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [savingJob, setSavingJob] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? "");
      setUserId(user?.id ?? null);
    });
  }, [id]);

  async function fetchAll() {
    const [comp, jobsRes, profilesRes] = await Promise.all([
      supabase.from("companies").select("id, name").eq("id", id!).single(),
      supabase.from("jobs").select("id, title, description, created_at, is_open").eq("company_id", id!).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, role").eq("company_id", id!),
    ]);

    setCompany(comp.data);
    setNameValue(comp.data?.name ?? "");
    const jobList = jobsRes.data ?? [];
    setJobs(jobList);
    setProfiles(profilesRes.data ?? []);

    if (jobList.length > 0) {
      const jobIds = jobList.map((j) => j.id);
      const { data: cands } = await supabase
        .from("candidates")
        .select("id, name, status, job_id")
        .in("job_id", jobIds);
      setCandidates(cands ?? []);
    }

    setLoading(false);
  }

  async function handleSaveName() {
    if (!nameValue.trim() || nameValue === company?.name) { setEditingName(false); return; }
    setSavingName(true);
    await supabase.from("companies").update({ name: nameValue.trim() }).eq("id", id!);
    setCompany((prev) => prev ? { ...prev, name: nameValue.trim() } : prev);
    setSavingName(false);
    setEditingName(false);
  }

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    if (!jobTitle.trim()) return;
    setSavingJob(true);
    const { error } = await supabase.from("jobs").insert({
      title: jobTitle.trim(),
      description: jobDescription.trim() || null,
      company_id: id,
      created_by: userId,
    });
    if (error) { alert("Fel: " + error.message); setSavingJob(false); return; }
    setJobTitle("");
    setJobDescription("");
    setShowJobForm(false);
    setSavingJob(false);
    await fetchAll();
  }

  async function handleDeleteJob(jobId: string, title: string) {
    if (!confirm(`Ta bort jobbet "${title}"?`)) return;
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) { alert("Fel: " + error.message); return; }
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setCandidates((prev) => prev.filter((c) => c.job_id !== jobId));
  }

  const totalCandidates = candidates.length;
  const activeJobs = jobs.filter((j) => j.is_open !== false).length;

  const STATUS_COLOR: Record<string, string> = {
    applied:   "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
    screening: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    interview: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    offer:     "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    rejected:  "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
  };
  const STATUS_LABEL: Record<string, string> = {
    applied: "Sökt", screening: "Screening", interview: "Intervju",
    offer: "Erbjudande", rejected: "Avvisad",
  };

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
        <header className="bg-white dark:bg-gray-900 border-b border-violet-100 dark:border-gray-800 px-4 sm:px-8 py-5 sticky top-14 lg:top-0 z-10">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="text-xs text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 mb-2 cursor-pointer transition-colors"
          >
            ← Admin
          </button>
          {loading ? (
            <div className="h-6 bg-violet-100 dark:bg-gray-700 rounded w-48 animate-pulse" />
          ) : editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                autoFocus
                placeholder="Företagsnamn"
                className="text-xl font-semibold bg-transparent border-b-2 border-violet-400 focus:outline-none text-gray-900 dark:text-white"
              />
              <button type="button" onClick={handleSaveName} disabled={savingName} className="text-xs text-violet-600 dark:text-violet-400 font-semibold cursor-pointer">
                {savingName ? "Sparar…" : "Spara"}
              </button>
              <button type="button" onClick={() => setEditingName(false)} className="text-xs text-gray-400 cursor-pointer">Avbryt</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{company?.name}</h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-xs text-gray-300 dark:text-gray-600 hover:text-violet-500 dark:hover:text-violet-400 cursor-pointer transition-colors"
                title="Redigera namn"
              >
                ✏
              </button>
            </div>
          )}
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Aktiva jobb",  value: activeJobs,       color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", icon: "💼" },
              { label: "Kandidater",   value: totalCandidates,  color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",   icon: "🙋" },
              { label: "Användare",    value: profiles.length,  color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",           icon: "👤" },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-4 py-4 shadow-sm">
                <div className={`w-8 h-8 ${s.color} rounded-xl flex items-center justify-center text-base mb-2`}>{s.icon}</div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? "–" : s.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Jobb */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Jobb <span className="text-gray-400 dark:text-gray-500 font-normal">({jobs.length})</span>
              </h2>
              <button
                type="button"
                onClick={() => { setShowJobForm((v) => !v); setJobTitle(""); setJobDescription(""); }}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 cursor-pointer transition-colors"
              >
                {showJobForm ? "Avbryt" : "+ Skapa jobb"}
              </button>
            </div>
            {showJobForm && (
              <form onSubmit={handleCreateJob} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl p-5 mb-3 space-y-3 shadow-sm">
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Jobbtitel *"
                  autoFocus
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 transition-colors"
                />
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={2}
                  placeholder="Beskrivning (valfri)"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 transition-colors resize-none"
                />
                <button
                  type="submit"
                  disabled={savingJob || !jobTitle.trim()}
                  className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 disabled:opacity-50 cursor-pointer font-medium transition-colors"
                >
                  {savingJob ? "Sparar…" : "Spara jobb"}
                </button>
              </form>
            )}
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-4 animate-pulse shadow-sm h-14" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Inga jobb ännu.</p>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => {
                  const jobCands = candidates.filter((c) => c.job_id === job.id);
                  return (
                    <div
                      key={job.id}
                      className="group bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-3.5 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all flex items-center gap-4 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {job.title}
                          </p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            job.is_open !== false
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          }`}>
                            {job.is_open !== false ? "Öppen" : "Stängd"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {jobCands.length} kandidat{jobCands.length !== 1 ? "er" : ""} · {new Date(job.created_at).toLocaleDateString("sv-SE")}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteJob(job.id, job.title)}
                        className="opacity-0 group-hover:opacity-100 text-xs text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 transition-all cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      >
                        Ta bort
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Användare */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Användare <span className="text-gray-400 dark:text-gray-500 font-normal">({profiles.length})</span>
            </h2>
            {loading ? (
              <div className="h-14 bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl animate-pulse shadow-sm" />
            ) : profiles.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Inga användare kopplade till detta företag.</p>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                {profiles.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-5 py-3 ${i < profiles.length - 1 ? "border-b border-violet-50 dark:border-gray-700" : ""}`}
                  >
                    <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-violet-600 dark:text-violet-400 text-xs font-semibold">
                        {(p.email?.[0] ?? "?").toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{p.email ?? "–"}</p>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      p.role === "admin"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
                    }`}>
                      {p.role === "admin" ? "Admin" : "Kund"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Kandidater per jobb */}
          {!loading && candidates.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Kandidater <span className="text-gray-400 dark:text-gray-500 font-normal">({candidates.length})</span>
              </h2>
              <div className="space-y-1">
                {candidates.map((c) => (
                  <div key={c.id} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{c.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                      {jobs.find((j) => j.id === c.job_id)?.title ?? "–"}
                    </p>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default CompanyDetailPage;
