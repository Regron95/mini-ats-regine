import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

type CandidateStatus = "applied" | "screening" | "interview" | "offer" | "rejected";

type Assessment = {
  sammanfattning: string;
  styrkor: string[];
  svagheter: string[];
  matchning: number;
};

type Candidate = {
  id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  cv_text: string | null;
  status: CandidateStatus;
};

const COLUMNS: {
  key: CandidateStatus;
  label: string;
  border: string;
  bg: string;
  dot: string;
}[] = [
  { key: "applied",   label: "Sökt",       border: "border-t-violet-300", bg: "bg-violet-50",  dot: "bg-violet-400" },
  { key: "screening", label: "Screening",  border: "border-t-blue-300",   bg: "bg-blue-50",    dot: "bg-blue-400" },
  { key: "interview", label: "Intervju",   border: "border-t-amber-300",  bg: "bg-amber-50",   dot: "bg-amber-400" },
  { key: "offer",     label: "Erbjudande", border: "border-t-emerald-300",bg: "bg-emerald-50", dot: "bg-emerald-400" },
  { key: "rejected",  label: "Avvisad",    border: "border-t-rose-300",   bg: "bg-rose-50",    dot: "bg-rose-400" },
];

const AVATAR_COLORS = [
  "bg-violet-400", "bg-pink-400", "bg-sky-400",
  "bg-emerald-400", "bg-amber-400", "bg-indigo-400", "bg-rose-400",
];

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [jobTitle, setJobTitle] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLinkedin, setNewLinkedin] = useState("");
  const [newCvText, setNewCvText] = useState("");
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [assessments, setAssessments] = useState<Record<string, Assessment>>({});
  const [assessing, setAssessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchJob();
    fetchCandidates();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? "");
    });
  }, [id]);

  async function fetchJob() {
    const { data } = await supabase
      .from("jobs")
      .select("title")
      .eq("id", id)
      .single();
    if (data) setJobTitle(data.title);
  }

  async function fetchCandidates() {
    const { data } = await supabase
      .from("candidates")
      .select("id, name, email, linkedin_url, cv_text, status")
      .eq("job_id", id)
      .order("created_at", { ascending: true });
    setCandidates(data ?? []);
    setLoading(false);
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("candidates").insert({
      job_id: id,
      name: newName,
      email: newEmail || null,
      linkedin_url: newLinkedin || null,
      cv_text: newCvText || null,
      status: "applied",
    });

    if (error) {
      alert("Fel vid lagring: " + error.message);
      setSaving(false);
      return;
    }

    setNewName("");
    setNewEmail("");
    setNewLinkedin("");
    setNewCvText("");
    setShowForm(false);
    setSaving(false);
    fetchCandidates();
  }

  async function handleStatusChange(candidateId: string, newStatus: CandidateStatus) {
    await supabase
      .from("candidates")
      .update({ status: newStatus })
      .eq("id", candidateId);
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
    );
  }

  async function handleAssessCV(candidate: Candidate) {
    setAssessing((prev) => ({ ...prev, [candidate.id]: true }));

    const { data, error } = await supabase.functions.invoke("assess-cv", {
      body: { cv_text: candidate.cv_text, job_title: jobTitle },
    });

    if (error || !data) {
      alert("Fel vid CV-bedömning: " + (error?.message ?? "Okänt fel"));
      setAssessing((prev) => ({ ...prev, [candidate.id]: false }));
      return;
    }

    setAssessments((prev) => ({ ...prev, [candidate.id]: data as Assessment }));
    setAssessing((prev) => ({ ...prev, [candidate.id]: false }));
  }

  const filtered = candidates.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        email={email}
        links={[{ label: "← Alla jobb", onClick: () => navigate("/dashboard") }]}
        onLogout={async () => await supabase.auth.signOut()}
      />

      <div className="flex-1 overflow-hidden flex flex-col bg-violet-50/30">
        <header className="bg-white border-b border-violet-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs text-violet-400 mb-0.5 font-medium uppercase tracking-wide">Jobb</p>
            <h1 className="text-lg font-semibold text-gray-900">{jobTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Sök kandidat…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 focus:bg-white transition-colors"
              />
              <span className="absolute left-2.5 top-2.5 text-gray-300 text-xs">🔍</span>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 cursor-pointer font-medium transition-colors shadow-sm"
            >
              {showForm ? "Avbryt" : "+ Lägg till kandidat"}
            </button>
          </div>
        </header>

        {showForm && (
          <div className="bg-white border-b border-violet-100 px-6 py-4 shrink-0">
            <form onSubmit={handleAddCandidate} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="cand-name" className="block text-xs font-medium text-gray-600 mb-1">
                    Namn *
                  </label>
                  <input
                    id="cand-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    placeholder="Anna Svensson"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="cand-email" className="block text-xs font-medium text-gray-600 mb-1">
                    E-post
                  </label>
                  <input
                    id="cand-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="anna@exempel.se"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="cand-linkedin" className="block text-xs font-medium text-gray-600 mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    id="cand-linkedin"
                    type="url"
                    value={newLinkedin}
                    onChange={(e) => setNewLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cand-cv" className="block text-xs font-medium text-gray-600 mb-1">
                  CV-text <span className="text-gray-300 font-normal">(för AI-bedömning)</span>
                </label>
                <textarea
                  id="cand-cv"
                  value={newCvText}
                  onChange={(e) => setNewCvText(e.target.value)}
                  rows={4}
                  placeholder="Klistra in CV-text här…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-violet-600 text-white text-sm rounded-xl px-5 py-2 hover:bg-violet-700 disabled:opacity-50 cursor-pointer font-medium transition-colors shadow-sm"
              >
                {saving ? "Sparar…" : "Spara kandidat"}
              </button>
            </form>
          </div>
        )}

        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-5">
          {loading ? (
            <p className="text-sm text-gray-400">Laddar…</p>
          ) : (
            <div className="flex gap-4 h-full">
              {COLUMNS.map((col) => {
                const colCandidates = filtered.filter((c) => c.status === col.key);
                return (
                  <div
                    key={col.key}
                    className={`shrink-0 w-64 bg-white rounded-2xl border border-violet-100 border-t-4 ${col.border} flex flex-col overflow-hidden shadow-sm`}
                  >
                    <div className={`px-4 py-3 flex items-center justify-between border-b border-violet-50 ${col.bg}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                      </div>
                      <span className="text-xs bg-white/80 text-gray-500 rounded-full px-2 py-0.5 font-medium shadow-sm">
                        {colCandidates.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {colCandidates.map((c) => {
                        const assessment = assessments[c.id];
                        const isAssessing = assessing[c.id];
                        return (
                          <div key={c.id} className="bg-white rounded-xl p-3 border border-violet-100 shadow-sm">
                            <div className="flex items-start gap-2.5 mb-2">
                              <div
                                className={`w-8 h-8 rounded-full ${getAvatarColor(c.name)} flex items-center justify-center shrink-0`}
                              >
                                <span className="text-white text-xs font-bold">{getInitials(c.name)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 leading-tight">{c.name}</p>
                                {c.email && (
                                  <p className="text-xs text-gray-400 truncate">{c.email}</p>
                                )}
                              </div>
                            </div>

                            {c.linkedin_url && (
                              <a
                                href={c.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-violet-500 hover:text-violet-700 hover:underline block mb-2 truncate"
                              >
                                LinkedIn
                              </a>
                            )}

                            <select
                              aria-label={`Status för ${c.name}`}
                              value={c.status}
                              onChange={(e) =>
                                handleStatusChange(c.id, e.target.value as CandidateStatus)
                              }
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer text-gray-600"
                            >
                              {COLUMNS.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>

                            {c.cv_text && (
                              <button
                                type="button"
                                onClick={() => handleAssessCV(c)}
                                disabled={isAssessing}
                                className="mt-2 w-full text-xs bg-violet-50 text-violet-600 border border-violet-200 rounded-lg px-2 py-1.5 hover:bg-violet-100 disabled:opacity-50 cursor-pointer font-medium transition-colors"
                              >
                                {isAssessing ? "Bedömer…" : "✦ Bedöm CV"}
                              </button>
                            )}

                            {assessment && (
                              <div className="mt-2 rounded-xl bg-violet-50 border border-violet-100 p-2.5 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500 font-medium">Matchning</span>
                                  <span
                                    className={`font-bold text-sm ${
                                      assessment.matchning >= 7
                                        ? "text-emerald-600"
                                        : assessment.matchning >= 4
                                        ? "text-amber-500"
                                        : "text-rose-500"
                                    }`}
                                  >
                                    {assessment.matchning}/10
                                  </span>
                                </div>
                                <p className="text-gray-600 leading-relaxed">{assessment.sammanfattning}</p>
                                {assessment.styrkor.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-emerald-700 mb-1">Styrkor</p>
                                    <ul className="space-y-0.5 text-gray-600">
                                      {assessment.styrkor.map((s, i) => (
                                        <li key={i} className="flex gap-1">
                                          <span className="text-emerald-500 shrink-0">+</span>
                                          <span>{s}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {assessment.svagheter.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-rose-600 mb-1">Svagheter</p>
                                    <ul className="space-y-0.5 text-gray-600">
                                      {assessment.svagheter.map((s, i) => (
                                        <li key={i} className="flex gap-1">
                                          <span className="text-rose-400 shrink-0">−</span>
                                          <span>{s}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {colCandidates.length === 0 && (
                        <p className="text-xs text-gray-300 text-center py-6">Inga kandidater</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobDetailPage;
