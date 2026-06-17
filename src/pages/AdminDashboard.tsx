import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { logActivity } from "../lib/activity";
import { ADMIN_NAV } from "../lib/adminNav";

type Company = { id: string; name: string };
type Profile = { id: string; email: string | null; role: string; company_id: string | null };

type CompanyErrors = { name?: string };
type UserErrors = { email?: string; password?: string };

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState({ companies: 0, users: 0, jobs: 0, candidates: 0 });

  const [newCompanyName, setNewCompanyName] = useState("");
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyErrors, setCompanyErrors] = useState<CompanyErrors>({});

  const [showUserForm, setShowUserForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("customer");
  const [newUserCompany, setNewUserCompany] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [userErrors, setUserErrors] = useState<UserErrors>({});
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string; role: string } | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  useEffect(() => {
    fetchCompanies();
    fetchProfiles();
    fetchStats();
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? ""));
  }, []);

  async function fetchStats() {
    const [c, u, j, cand] = await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase.from("candidates").select("id", { count: "exact", head: true }),
    ]);
    setStats({ companies: c.count ?? 0, users: u.count ?? 0, jobs: j.count ?? 0, candidates: cand.count ?? 0 });
  }

  async function fetchCompanies() {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    setCompanies(data ?? []);
  }

  async function fetchProfiles() {
    const { data } = await supabase.from("profiles").select("id, email, role, company_id");
    setProfiles(data ?? []);
  }

  function validateCompany(): boolean {
    const errors: CompanyErrors = {};
    if (!newCompanyName.trim()) errors.name = "Namn är obligatoriskt";
    else if (newCompanyName.trim().length < 2) errors.name = "Minst 2 tecken";
    setCompanyErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateUser(): boolean {
    const errors: UserErrors = {};
    if (!newUserEmail.trim()) {
      errors.email = "E-post är obligatorisk";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail)) {
      errors.email = "Ogiltig e-postadress";
    }
    if (!newUserPassword) {
      errors.password = "Lösenord är obligatoriskt";
    } else if (newUserPassword.length < 8) {
      errors.password = "Minst 8 tecken";
    }
    setUserErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCompany()) return;
    setSavingCompany(true);
    const { error } = await supabase.from("companies").insert({ name: newCompanyName.trim() });
    if (error) { alert("Fel: " + error.message); setSavingCompany(false); return; }
    setNewCompanyName("");
    setShowCompanyForm(false);
    setSavingCompany(false);
    fetchCompanies();
    fetchStats();
    logActivity("company_created", newCompanyName.trim());
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!validateUser()) return;
    setSavingUser(true);

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        company_id: newUserCompany || null,
      },
    });

    if (error || data?.error) {
      alert("Fel: " + (data?.error ?? error?.message));
      setSavingUser(false);
      return;
    }

    const createdEmail = newUserEmail.trim();
    const createdPassword = newUserPassword;
    const createdRole = newUserRole;

    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("customer");
    setNewUserCompany("");
    setShowUserForm(false);
    setSavingUser(false);
    fetchProfiles();
    fetchStats();
    logActivity("user_created", createdEmail);
    setCreatedUser({ email: createdEmail, password: createdPassword, role: createdRole });
  }

  async function handleUpdateProfile(profileId: string, field: "role" | "company_id", value: string | null) {
    await supabase.from("profiles").update({ [field]: value }).eq("id", profileId);
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, [field]: value } : p)));
  }

  async function copyPassword() {
    if (!createdUser) return;
    await navigator.clipboard.writeText(createdUser.password);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  }

  const inputClass = (hasError: boolean) =>
    `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 transition-colors ${
      hasError ? "border-red-300 focus:ring-red-300" : "border-gray-200 dark:border-gray-600 focus:ring-violet-400"
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

      <div className="flex-1 overflow-y-auto bg-violet-50/30 dark:bg-gray-950">
        <header className="bg-white dark:bg-gray-900 border-b border-violet-100 dark:border-gray-800 px-8 py-5 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Admin</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Hantera företag och användare</p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-10">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Företag",     value: stats.companies,  icon: "🏢", color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" },
              { label: "Användare",   value: stats.users,      icon: "👤", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
              { label: "Aktiva jobb", value: stats.jobs,       icon: "💼", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
              { label: "Kandidater",  value: stats.candidates, icon: "🙋", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-5 py-4 shadow-sm">
                <div className={`w-9 h-9 ${s.color} rounded-xl flex items-center justify-center text-lg mb-3`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Företag */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Företag</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500">{companies.length} registrerade</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowCompanyForm(!showCompanyForm); setCompanyErrors({}); }}
                className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 cursor-pointer font-medium transition-colors shadow-sm"
              >
                {showCompanyForm ? "Avbryt" : "+ Skapa företag"}
              </button>
            </div>

            {showCompanyForm && (
              <form
                onSubmit={handleCreateCompany}
                className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl p-4 mb-4 shadow-sm space-y-3"
              >
                <div>
                  <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Namn *
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => { setNewCompanyName(e.target.value); setCompanyErrors({}); }}
                    placeholder="t.ex. Acme AB"
                    className={inputClass(!!companyErrors.name)}
                  />
                  {companyErrors.name && <p className="text-xs text-red-500 mt-1">{companyErrors.name}</p>}
                </div>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 disabled:opacity-50 cursor-pointer font-medium transition-colors shadow-sm"
                >
                  {savingCompany ? "Sparar…" : "Spara"}
                </button>
              </form>
            )}

            {companies.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4">Inga företag ännu.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {companies.map((c) => (
                  <div key={c.id} className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
                    <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-violet-600 dark:text-violet-400 text-xs font-bold">
                        {c.name[0]?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Användare */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Användare</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500">{profiles.length} konton</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowUserForm(!showUserForm); setUserErrors({}); }}
                className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 cursor-pointer font-medium transition-colors shadow-sm"
              >
                {showUserForm ? "Avbryt" : "+ Skapa användare"}
              </button>
            </div>

            {showUserForm && (
              <form
                onSubmit={handleCreateUser}
                className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl p-5 mb-4 shadow-sm space-y-4"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Nytt konto</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-post *</label>
                    <input
                      id="user-email"
                      type="text"
                      value={newUserEmail}
                      onChange={(e) => { setNewUserEmail(e.target.value); setUserErrors((p) => ({ ...p, email: undefined })); }}
                      placeholder="kund@företag.se"
                      className={inputClass(!!userErrors.email)}
                    />
                    {userErrors.email && <p className="text-xs text-red-500 mt-1">{userErrors.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Lösenord * <span className="text-gray-400 dark:text-gray-500 font-normal">(min 8 tecken)</span>
                    </label>
                    <input
                      id="user-password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => { setNewUserPassword(e.target.value); setUserErrors((p) => ({ ...p, password: undefined })); }}
                      placeholder="••••••••"
                      className={inputClass(!!userErrors.password)}
                    />
                    {userErrors.password && <p className="text-xs text-red-500 mt-1">{userErrors.password}</p>}
                  </div>
                  <div>
                    <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Roll</label>
                    <select
                      id="user-role"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
                    >
                      <option value="customer">customer</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="user-company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Företag</label>
                    <select
                      id="user-company"
                      value={newUserCompany}
                      onChange={(e) => setNewUserCompany(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
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
                  disabled={savingUser}
                  className="bg-violet-600 text-white text-sm rounded-xl px-5 py-2 hover:bg-violet-700 disabled:opacity-50 cursor-pointer font-medium transition-colors shadow-sm"
                >
                  {savingUser ? "Skapar…" : "Skapa konto"}
                </button>
              </form>
            )}

            <div className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-violet-50 dark:bg-gray-750 border-b border-violet-100 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wide">Användare</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wide">Roll</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wide">Företag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50 dark:divide-gray-700">
                    {profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-violet-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-violet-600 dark:text-violet-400 text-xs font-semibold">
                                {(p.email?.[0] ?? "?").toUpperCase()}
                              </span>
                            </div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-50">{p.email ?? "–"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <select
                            aria-label="Roll"
                            value={p.role}
                            onChange={(e) => handleUpdateProfile(p.id, "role", e.target.value)}
                            className="border border-violet-100 dark:border-gray-600 rounded-lg px-2.5 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                          >
                            <option value="customer">customer</option>
                            <option value="admin">admin</option>
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
                      </tr>
                    ))}
                    {profiles.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
                          Inga användare.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Success modal */}
      {createdUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-violet-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Konto skapat</h2>
              <button
                type="button"
                onClick={() => setCreatedUser(null)}
                className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors cursor-pointer text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
              <span className="text-emerald-500 text-lg">✓</span>
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Kontot skapades!</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">Dela inloggningsuppgifterna med användaren.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">E-post</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{createdUser.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Lösenord</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 font-mono text-sm text-gray-800 dark:text-gray-200">
                    {createdUser.password}
                  </div>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="shrink-0 w-9 h-9 flex items-center justify-center bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors cursor-pointer"
                    title="Kopiera lösenord"
                  >
                    {passwordCopied ? (
                      <span className="text-emerald-500 text-xs">✓</span>
                    ) : (
                      <span className="text-violet-500 text-xs">⎘</span>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Roll</p>
                <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  createdUser.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
                }`}>
                  {createdUser.role === "admin" ? "Admin" : "Kund"}
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-600 dark:text-amber-500 mt-4 flex items-center gap-1.5">
              <span>⚠</span> Kopiera lösenordet nu — det visas inte igen.
            </p>

            <button
              type="button"
              onClick={() => setCreatedUser(null)}
              className="mt-5 w-full bg-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-violet-700 cursor-pointer transition-colors"
            >
              Klar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
