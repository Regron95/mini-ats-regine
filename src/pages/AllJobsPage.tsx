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

      <div className="flex-1 overflow-y-auto bg-violet-50/30">
        <header className="bg-white border-b border-violet-100 px-8 py-5 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900">Jobbgrupper</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "…" : `${jobs.length} jobb fördelade på ${companies.length} företag`}
          </p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-violet-100 rounded-2xl px-5 py-4 animate-pulse shadow-sm">
                  <div className="h-4 bg-violet-100 rounded w-48 mb-2" />
                  <div className="h-3 bg-violet-50 rounded w-72" />
                </div>
              ))}
            </div>
          ) : jobsByCompany.length === 0 && uncategorized.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💼</span>
              </div>
              <p className="font-semibold text-gray-900 mb-1">Inga jobb ännu</p>
              <p className="text-sm text-gray-400">Jobb skapade av kunder visas här grupperade per företag.</p>
            </div>
          ) : (
            <>
              {jobsByCompany.map(({ company, jobs: companyJobs }) => (
                <section key={company.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-violet-600 text-xs font-bold">{company.name[0]?.toUpperCase()}</span>
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900">{company.name}</h2>
                    <span className="text-xs text-gray-400">{companyJobs.length} jobb</span>
                  </div>
                  <div className="space-y-2">
                    {companyJobs.map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="w-full bg-white border border-violet-100 rounded-2xl px-5 py-3.5 hover:border-violet-300 hover:shadow-sm transition-all text-left flex items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 hover:text-violet-600 transition-colors">{job.title}</p>
                          {job.description && (
                            <p className="text-sm text-gray-400 mt-0.5 truncate">{job.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-300 shrink-0">
                          {new Date(job.created_at).toLocaleDateString("sv-SE")}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}

              {uncategorized.length > 0 && (
                <section>
                  <p className="text-sm font-semibold text-gray-400 mb-3">Okategoriserade</p>
                  <div className="space-y-2">
                    {uncategorized.map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="w-full bg-white border border-violet-100 rounded-2xl px-5 py-3.5 hover:border-violet-300 hover:shadow-sm transition-all text-left shadow-sm"
                      >
                        <p className="font-semibold text-gray-900">{job.title}</p>
                      </button>
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
