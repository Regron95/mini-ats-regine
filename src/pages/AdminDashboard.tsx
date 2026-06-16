import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

type Company = { id: string; name: string };
type Profile = { id: string; email: string | null; role: string; company_id: string | null };

function AdminDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchCompanies();
    fetchProfiles();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? "");
    });
  }, []);

  async function fetchCompanies() {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    setCompanies(data ?? []);
  }

  async function fetchProfiles() {
    const { data } = await supabase.from("profiles").select("id, email, role, company_id");
    setProfiles(data ?? []);
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("companies").insert({ name: newCompanyName });
    if (error) {
      alert("Fel: " + error.message);
      setSaving(false);
      return;
    }
    setNewCompanyName("");
    setShowCompanyForm(false);
    setSaving(false);
    fetchCompanies();
  }

  async function handleUpdateProfile(
    profileId: string,
    field: "role" | "company_id",
    value: string | null
  ) {
    await supabase.from("profiles").update({ [field]: value }).eq("id", profileId);
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, [field]: value } : p))
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        email={email}
        links={[{ label: "Admin", onClick: () => {}, active: true }]}
        onLogout={handleLogout}
      />

      <div className="flex-1 overflow-y-auto bg-violet-50/30">
        <header className="bg-white border-b border-violet-100 px-8 py-5 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-400 mt-0.5">Hantera företag och användare</p>
        </header>

        <main className="max-w-4xl mx-auto px-8 py-8 space-y-10">
          {/* Företag */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Företag</h2>
                <p className="text-sm text-gray-400">{companies.length} registrerade</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompanyForm(!showCompanyForm)}
                className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 cursor-pointer font-medium transition-colors shadow-sm"
              >
                {showCompanyForm ? "Avbryt" : "+ Skapa företag"}
              </button>
            </div>

            {showCompanyForm && (
              <form
                onSubmit={handleCreateCompany}
                className="bg-white border border-violet-100 rounded-2xl p-4 mb-4 flex gap-3 items-end shadow-sm"
              >
                <div className="flex-1">
                  <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Namn *
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    required
                    placeholder="t.ex. Acme AB"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 disabled:opacity-50 cursor-pointer font-medium transition-colors shadow-sm"
                >
                  {saving ? "Sparar…" : "Spara"}
                </button>
              </form>
            )}

            {companies.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Inga företag ännu.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {companies.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white border border-violet-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm"
                  >
                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-violet-600 text-xs font-bold">
                        {c.name[0]?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Användare */}
          <section>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Användare</h2>
              <p className="text-sm text-gray-400">{profiles.length} konton</p>
            </div>
            <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-violet-50 border-b border-violet-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 uppercase tracking-wide">
                      Användare
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 uppercase tracking-wide">
                      Roll
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 uppercase tracking-wide">
                      Företag
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                  {profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-violet-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-violet-600 text-xs font-semibold">
                              {(p.email?.[0] ?? "?").toUpperCase()}
                            </span>
                          </div>
                          <span className="text-gray-800 font-medium">{p.email ?? "–"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          aria-label="Roll"
                          value={p.role}
                          onChange={(e) => handleUpdateProfile(p.id, "role", e.target.value)}
                          className="border border-violet-100 rounded-lg px-2.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                        >
                          <option value="customer">customer</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          aria-label="Företag"
                          value={p.company_id ?? ""}
                          onChange={(e) =>
                            handleUpdateProfile(p.id, "company_id", e.target.value || null)
                          }
                          className="border border-violet-100 rounded-lg px-2.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                        >
                          <option value="">– Inget –</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-4 text-sm text-gray-400">
                        Inga användare.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
