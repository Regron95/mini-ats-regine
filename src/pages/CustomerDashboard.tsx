import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

type Job = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

function CustomerDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? "");
    });
  }, []);

  async function fetchJobs() {
    const { data } = await supabase
      .from("jobs")
      .select("id, title, description, created_at")
      .order("created_at", { ascending: false });
    setJobs(data ?? []);
    setLoading(false);
  }

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .single();

    if (!profile?.company_id) {
      alert("Din användare är inte kopplad till ett företag. Kör SQL:en från steg 6 i Supabase.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("jobs").insert({
      title,
      description,
      company_id: profile.company_id,
    });

    if (error) {
      alert("Fel vid lagring: " + error.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setDescription("");
    setShowForm(false);
    setSaving(false);
    fetchJobs();
  }

  async function handleDeleteJob(jobId: string, jobTitle: string) {
    if (!confirm(`Ta bort jobbet "${jobTitle}"? Alla kandidater kopplade till jobbet tas också bort.`)) return;
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) {
      alert("Fel vid borttagning: " + error.message);
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        email={email}
        links={[{ label: "Jobb", onClick: () => {}, active: true }]}
        onLogout={handleLogout}
      />

      <div className="flex-1 overflow-y-auto bg-violet-50/30">
        <header className="bg-white border-b border-violet-100 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Jobb</h1>
            {!loading && (
              <p className="text-sm text-gray-400 mt-0.5">{jobs.length} jobb totalt</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 cursor-pointer font-medium transition-colors shadow-sm"
          >
            {showForm ? "Avbryt" : "+ Skapa nytt jobb"}
          </button>
        </header>

        <main className="px-8 py-6">
          {showForm && (
            <form
              onSubmit={handleCreateJob}
              className="bg-white border border-violet-100 rounded-2xl p-6 mb-6 space-y-4 shadow-sm"
            >
              <h2 className="font-semibold text-gray-900">Nytt jobb</h2>
              <div>
                <label htmlFor="job-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Titel *
                </label>
                <input
                  id="job-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="t.ex. Frontend-utvecklare"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Beskrivning
                </label>
                <textarea
                  id="job-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Beskriv rollen och vad ni söker…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
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

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-violet-100 rounded-2xl px-6 py-4 animate-pulse">
                  <div className="h-4 bg-violet-100 rounded w-48 mb-2" />
                  <div className="h-3 bg-violet-50 rounded w-72" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <p className="font-semibold text-gray-900 mb-1">Inga jobb ännu</p>
              <p className="text-sm text-gray-400">Klicka på "+ Skapa nytt jobb" för att komma igång.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white border border-violet-100 rounded-2xl px-6 py-4 hover:border-violet-300 hover:shadow-sm transition-all group flex items-center justify-between gap-4"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <p className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">
                      {job.title}
                    </p>
                    {job.description && (
                      <p className="text-sm text-gray-400 mt-0.5 truncate">{job.description}</p>
                    )}
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-300">
                      {new Date(job.created_at).toLocaleDateString("sv-SE")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      className="text-xs text-gray-300 hover:text-rose-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg hover:bg-rose-50"
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default CustomerDashboard;
