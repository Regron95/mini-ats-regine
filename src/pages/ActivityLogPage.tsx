import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { ADMIN_NAV } from "../lib/adminNav";

type LogEntry = {
  id: string;
  created_at: string;
  user_email: string;
  user_role: string;
  action_type: string;
  entity_name: string | null;
  details: Record<string, string> | null;
};

const ACTION_META: Record<string, { label: string; color: string }> = {
  candidate_added: { label: "Kandidat tillagd",  color: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400" },
  status_changed:  { label: "Status ändrad",     color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
  job_created:     { label: "Jobb skapad",        color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  user_created:    { label: "Konto skapat",       color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  company_created: { label: "Företag skapat",     color: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just nu";
  if (mins < 60) return `${mins} min sedan`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} tim sedan`;
  const days = Math.floor(hrs / 24);
  return `${days} dag${days !== 1 ? "ar" : ""} sedan`;
}

function ActivityLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchLogs();
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? ""));
  }, []);

  async function fetchLogs() {
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs(data ?? []);
    setLoading(false);
  }

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      (l.entity_name ?? "").toLowerCase().includes(q) ||
      (l.user_email ?? "").toLowerCase().includes(q)
    );
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Aktivitetslogg</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Fullständig historik över alla händelser i systemet</p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
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
            <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">
              {loading ? "…" : `${filtered.length} händelser`}
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-4 animate-pulse shadow-sm">
                  <div className="h-4 bg-violet-100 dark:bg-gray-700 rounded w-72 mb-2" />
                  <div className="h-3 bg-violet-50 dark:bg-gray-700 rounded w-40" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Inga händelser ännu</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Händelser loggas automatiskt när användare utför åtgärder.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((entry) => {
                const meta = ACTION_META[entry.action_type] ?? {
                  label: entry.action_type,
                  color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
                };
                const initials = (entry.user_email?.[0] ?? "?").toUpperCase();
                return (
                  <div
                    key={entry.id}
                    className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-4 flex items-start gap-4 hover:border-violet-200 dark:hover:border-violet-700 transition-colors shadow-sm"
                  >
                    <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-violet-600 dark:text-violet-400 text-xs font-bold">{initials}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{entry.user_email}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          entry.user_role === "admin"
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
                        }`}>
                          {entry.user_role === "admin" ? "Admin" : "Kund"}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        {entry.entity_name && (
                          <span className="font-medium text-gray-800 dark:text-gray-200">{entry.entity_name}</span>
                        )}
                        {entry.details?.from_status && entry.details?.to_status && (
                          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md px-1.5 py-0.5">
                              {entry.details.from_status}
                            </span>
                            <span>→</span>
                            <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-md px-1.5 py-0.5">
                              {entry.details.to_status}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-xs text-gray-300 dark:text-gray-600 shrink-0 mt-1">{timeAgo(entry.created_at)}</span>
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

export default ActivityLogPage;
