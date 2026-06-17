import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { ADMIN_NAV } from "../lib/adminNav";

type Company = { id: string; name: string };
type Profile = { id: string; email: string | null; role: string; company_id: string | null };

type CreateForm = { email: string; password: string; role: "admin" | "customer"; company_id: string };
type CreateErrors = { email?: string; password?: string };

function TeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateForm>({ email: "", password: "", role: "customer", company_id: "" });
  const [formErrors, setFormErrors] = useState<CreateErrors>({});
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchData();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? "");
      setCurrentUserId(user?.id ?? "");
    });
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

  async function handleDeleteUser(profileId: string, userEmail: string) {
    if (profileId === currentUserId) {
      alert("Du kan inte ta bort ditt eget konto.");
      return;
    }
    if (!confirm(`Ta bort användaren "${userEmail}"? Detta kan inte ångras.`)) return;

    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: profileId },
    });

    if (error || data?.error) {
      alert("Fel: " + (data?.error ?? error?.message));
      return;
    }

    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
  }

  function validateForm(): boolean {
    const e: CreateErrors = {};
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Ange en giltig e-postadress";
    }
    if (!form.password || form.password.length < 6) {
      e.password = "Lösenordet måste vara minst 6 tecken";
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setCreating(true);

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        company_id: form.company_id || null,
      },
    });

    if (error || data?.error) {
      alert("Fel: " + (data?.error ?? error?.message));
      setCreating(false);
      return;
    }

    setForm({ email: "", password: "", role: "customer", company_id: "" });
    setShowForm(false);
    setCreating(false);
    await fetchData();
  }

  const companyName = (id: string | null) =>
    companies.find((c) => c.id === id)?.name ?? "–";

  const inputClass = (hasError?: boolean) =>
    `w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 transition-colors ${
      hasError
        ? "border-red-300 focus:ring-red-300"
        : "border-gray-200 dark:border-gray-600 focus:ring-violet-400"
    }`;

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
        <header className="bg-white dark:bg-gray-900 border-b border-violet-100 dark:border-gray-800 px-8 py-5 flex items-center justify-between sticky top-14 lg:top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Team</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {loading ? "…" : `${profiles.length} användare`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm(!showForm); setFormErrors({}); }}
            className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 cursor-pointer font-medium transition-colors shadow-sm"
          >
            {showForm ? "Avbryt" : "+ Skapa konto"}
          </button>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          {/* Create account form */}
          {showForm && (
            <form
              onSubmit={handleCreateUser}
              className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl p-6 mb-6 shadow-sm space-y-4"
            >
              <h2 className="font-semibold text-gray-900 dark:text-white">Nytt konto</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new-email" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    E-post *
                  </label>
                  <input
                    id="new-email"
                    type="text"
                    value={form.email}
                    onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setFormErrors((p) => ({ ...p, email: undefined })); }}
                    placeholder="anna@företag.se"
                    className={inputClass(!!formErrors.email)}
                  />
                  {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Lösenord *
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => { setForm((p) => ({ ...p, password: e.target.value })); setFormErrors((p) => ({ ...p, password: undefined })); }}
                    placeholder="Minst 6 tecken"
                    className={inputClass(!!formErrors.password)}
                  />
                  {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
                </div>
                <div>
                  <label htmlFor="new-role" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Roll
                  </label>
                  <select
                    id="new-role"
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "admin" | "customer" }))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
                  >
                    <option value="customer">Kund</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="new-company" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Företag
                  </label>
                  <select
                    id="new-company"
                    value={form.company_id}
                    onChange={(e) => setForm((p) => ({ ...p, company_id: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
                  >
                    <option value="">– Inget –</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="bg-violet-600 text-white text-sm rounded-xl px-5 py-2 hover:bg-violet-700 disabled:opacity-50 cursor-pointer font-medium transition-colors shadow-sm"
              >
                {creating ? "Skapar…" : "Skapa konto"}
              </button>
            </form>
          )}

          {/* Users table */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-4 animate-pulse shadow-sm">
                  <div className="h-4 bg-violet-100 dark:bg-gray-700 rounded w-48 mb-2" />
                  <div className="h-3 bg-violet-50 dark:bg-gray-700 rounded w-32" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-violet-50 dark:bg-gray-900/50 border-b border-violet-100 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wide">Användare</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wide">Roll</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wide">Företag</th>
                      <th scope="col" className="px-5 py-3 sr-only">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50 dark:divide-gray-700">
                    {profiles.map((p) => (
                      <tr key={p.id} className="group hover:bg-violet-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-violet-600 dark:text-violet-400 text-xs font-semibold">
                                {(p.email?.[0] ?? "?").toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-40">{p.email ?? "–"}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{companyName(p.company_id)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <select
                            aria-label="Roll"
                            value={p.role}
                            onChange={(e) => handleUpdateProfile(p.id, "role", e.target.value)}
                            className="border border-violet-100 dark:border-gray-600 rounded-lg px-2.5 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
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
                            className="border border-violet-100 dark:border-gray-600 rounded-lg px-2.5 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                          >
                            <option value="">– Inget –</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {p.id !== currentUserId && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(p.id, p.email ?? "–")}
                              className="text-xs text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            >
                              Ta bort
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {profiles.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
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
