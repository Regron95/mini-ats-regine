import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { ADMIN_NAV } from "../lib/adminNav";

type Company = { id: string; name: string };
type Profile = { id: string; email: string | null; role: string; company_id: string | null };

function TeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
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
    const [p, c] = await Promise.all([
      supabase.from("profiles").select("id, email, role, company_id"),
      supabase.from("companies").select("id, name").order("name"),
    ]);
    setProfiles(p.data ?? []);
    setCompanies(c.data ?? []);
    setLoading(false);
  }

  async function handleUpdateProfile(profileId: string, field: "role" | "company_id", value: string | null) {
    await supabase.from("profiles").update({ [field]: value }).eq("id", profileId);
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, [field]: value } : p)));
  }

  const companyName = (id: string | null) =>
    companies.find((c) => c.id === id)?.name ?? "–";

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
          <h1 className="text-xl font-semibold text-gray-900">Team</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "…" : `${profiles.length} användare`}
          </p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-violet-100 rounded-2xl px-5 py-4 animate-pulse shadow-sm">
                  <div className="h-4 bg-violet-100 rounded w-48 mb-2" />
                  <div className="h-3 bg-violet-50 rounded w-32" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-violet-50 border-b border-violet-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 uppercase tracking-wide">Användare</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 uppercase tracking-wide">Roll</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 uppercase tracking-wide">Företag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50">
                    {profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-violet-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-violet-600 text-xs font-semibold">
                                {(p.email?.[0] ?? "?").toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 truncate max-w-40">{p.email ?? "–"}</p>
                              <p className="text-xs text-gray-400">{companyName(p.company_id)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <select
                            aria-label="Roll"
                            value={p.role}
                            onChange={(e) => handleUpdateProfile(p.id, "role", e.target.value)}
                            className="border border-violet-100 rounded-lg px-2.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                          >
                            <option value="customer">Kund</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <select
                            aria-label="Företag"
                            value={p.company_id ?? ""}
                            onChange={(e) => handleUpdateProfile(p.id, "company_id", e.target.value || null)}
                            className="border border-violet-100 rounded-lg px-2.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                          >
                            <option value="">– Inget –</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {profiles.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-6 text-sm text-gray-400 text-center">
                          Inga användare hittades.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default TeamPage;
