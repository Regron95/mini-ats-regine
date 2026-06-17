import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { ADMIN_NAV } from "../lib/adminNav";

type Job = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  company_id: string;
};

type Company = { id: string; name: string };

function AllJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchData();
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? ""));
  }, []);

  async function fetchData() {
    const [j, c] = await Promise.all([
      supabase.from("jobs").select("id, title, description, created_at, company_id").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
    ]);
    setJobs(j.data ?? []);
    setCompanies(c.data ?? []);
    setLoading(false);
  }

  async function handleDeleteJob(jobId: string, jobTitle: string) {
    if (!confirm(`Ta bort jobbet "${jobTitle}"? Alla kandidater kopplade till jobbet tas också bort.`)) return;
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) { alert("Fel vid borttagning: " + error.message); return; }
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  const jobsByCompany = companies.map((c) => ({
    company: c,
    jobs: jobs.filter((j) => j.company_id === c.id),
  })).filter((g) => g.jobs.length > 0);

  const uncategorized = jobs.filter((j) => !companies.find((c) => c.id === j.company_id));

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

      <div className="flex-1 overflow-y-auto bg-violet-50/30 dark:bg-gray-950">
        <header className="bg-white dark:bg-gray-900 border-b border-violet-100 dark:border-gray-800 px-8 py-5 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Jobbgrupper</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {loading ? "…" : `${jobs.length} jobb fördelade på ${companies.length} företag`}
          </p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-4 animate-pulse shadow-sm">
                  <div className="h-4 bg-violet-100 dark:bg-gray-700 rounded w-48 mb-2" />
                  <div className="h-3 bg-violet-50 dark:bg-gray-700 rounded w-72" />
                </div>
              ))}
            </div>
          ) : jobsByCompany.length === 0 && uncategorized.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💼</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Inga jobb ännu</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Jobb skapade av kunder visas här grupperade per företag.</p>
            </div>
          ) : (
            <>
              {jobsByCompany.map(({ company, jobs: companyJobs }) => (
                <section key={company.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-violet-600 dark:text-violet-400 text-xs font-bold">{company.name[0]?.toUpperCase()}</span>
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{company.name}</h2>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{companyJobs.length} jobb</span>
                  </div>
                  <div className="space-y-2">
                    {companyJobs.map((job) => (
                      <div
                        key={job.id}
                        className="group bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-3.5 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all flex items-center justify-between gap-4 shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <p className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{job.title}</p>
                          {job.description && (
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 truncate">{job.description}</p>
                          )}
                        </button>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-gray-300 dark:text-gray-600 hidden sm:block">
                            {new Date(job.created_at).toLocaleDateString("sv-SE")}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job.id, job.title)}
                            className="text-xs text-gray-300 dark:text-gray-600 hover:text-rose-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          >
                            Ta bort
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {uncategorized.length > 0 && (
                <section>
                  <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-3">Okategoriserade</p>
                  <div className="space-y-2">
                    {uncategorized.map((job) => (
                      <div
                        key={job.id}
                        className="group bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-3.5 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all flex items-center justify-between gap-4 shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <p className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{job.title}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteJob(job.id, job.title)}
                          className="text-xs text-gray-300 dark:text-gray-600 hover:text-rose-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        >
                          Ta bort
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default AllJobsPage;
