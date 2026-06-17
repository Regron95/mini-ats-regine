import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { CUSTOMER_NAV } from "../lib/customerNav";
import { ADMIN_NAV } from "../lib/adminNav";

type Job = { id: string; title: string; is_open: boolean; created_at: string };

function CustomerOverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "customer">("customer");
  const [stats, setStats] = useState({ activeJobs: 0, totalCandidates: 0 });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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

    const [activeRes, candRes, recentRes] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_open", true),
      supabase.from("candidates").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id, title, is_open, created_at").order("created_at", { ascending: false }).limit(4),
    ]);

    setStats({ activeJobs: activeRes.count ?? 0, totalCandidates: candRes.count ?? 0 });
    setRecentJobs(recentRes.data ?? []);
    setLoading(false);
  }

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

      <div className="flex-1 overflow-y-auto bg-violet-50/30 dark:bg-gray-950">
        <header className="bg-white dark:bg-gray-900 border-b border-violet-100 dark:border-gray-800 px-6 py-5 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Översikt</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {company ? `${company} · ` : ""}{email}
          </p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Aktiva jobb",       value: stats.activeJobs,      icon: "💼", iconBg: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" },
              { label: "Totalt kandidater", value: stats.totalCandidates, icon: "🙋", iconBg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center text-xl mb-4`}>
                  {s.icon}
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? "–" : s.value}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recent jobs */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Senaste jobb</h2>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors cursor-pointer"
              >
                Visa alla →
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-4 animate-pulse shadow-sm">
                    <div className="h-4 bg-violet-100 dark:bg-gray-700 rounded w-48 mb-2" />
                    <div className="h-3 bg-violet-50 dark:bg-gray-700 rounded w-32" />
                  </div>
                ))}
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl p-8 text-center shadow-sm">
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Inga jobb skapade ännu.</p>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 cursor-pointer font-medium transition-colors"
                >
                  + Skapa ditt första jobb
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="w-full bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-3.5 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all text-left flex items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${job.is_open !== false ? "bg-emerald-400" : "bg-gray-300 dark:bg-gray-600"}`} />
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{job.title}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        job.is_open !== false
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}>
                        {job.is_open !== false ? "Öppen" : "Stängd"}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                        {new Date(job.created_at).toLocaleDateString("sv-SE")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Quick action */}
          <section className="bg-linear-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
            <h2 className="text-base font-semibold mb-1">Redo att rekrytera?</h2>
            <p className="text-sm text-violet-100 mb-4">Skapa ett nytt jobb och börja samla in kandidater direkt.</p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="bg-white text-violet-700 text-sm font-semibold rounded-xl px-4 py-2 hover:bg-violet-50 transition-colors cursor-pointer"
            >
              + Skapa nytt jobb
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}

export default CustomerOverviewPage;
