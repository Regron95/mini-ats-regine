import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { logActivity } from "../lib/activity";
import { ADMIN_NAV } from "../lib/adminNav";

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
  cv_url: string | null;
  status: CandidateStatus;
  notes: string | null;
};

type CandidateErrors = {
  name?: string;
  email?: string;
  linkedin_url?: string;
};

const COLUMNS: {
  key: CandidateStatus;
  label: string;
  border: string;
  bg: string;
  dot: string;
}[] = [
  { key: "applied",   label: "Sökt",       border: "border-t-violet-300",  bg: "bg-violet-50 dark:bg-violet-900/20",   dot: "bg-violet-400" },
  { key: "screening", label: "Screening",  border: "border-t-blue-300",    bg: "bg-blue-50 dark:bg-blue-900/20",      dot: "bg-blue-400" },
  { key: "interview", label: "Intervju",   border: "border-t-amber-300",   bg: "bg-amber-50 dark:bg-amber-900/20",    dot: "bg-amber-400" },
  { key: "offer",     label: "Erbjudande", border: "border-t-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/20",dot: "bg-emerald-400" },
  { key: "rejected",  label: "Avvisad",    border: "border-t-rose-300",    bg: "bg-rose-50 dark:bg-rose-900/20",      dot: "bg-rose-400" },
];

const AVATAR_COLORS = [
  "bg-violet-400", "bg-pink-400", "bg-sky-400",
  "bg-emerald-400", "bg-amber-400", "bg-indigo-400", "bg-rose-400",
];

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [jobTitle, setJobTitle] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "customer">("customer");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLinkedin, setNewLinkedin] = useState("");
  const [newCvText, setNewCvText] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<CandidateErrors>({});
  const [newCvFile, setNewCvFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [assessments, setAssessments] = useState<Record<string, Assessment>>({});
  const [assessing, setAssessing] = useState<Record<string, boolean>>({});
  const [mobileColumn, setMobileColumn] = useState<CandidateStatus>("applied");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<CandidateStatus | null>(null);

  useEffect(() => {
    fetchJob();
    fetchCandidates();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setEmail(user?.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single();
      setUserRole((profile?.role as "admin" | "customer") ?? "customer");
    });
  }, [id]);

  async function fetchJob() {
    const { data } = await supabase
      .from("jobs")
      .select("title, is_open")
      .eq("id", id)
      .single();
    if (data) {
      setJobTitle(data.title);
      setIsOpen(data.is_open ?? true);
    }
  }

  async function fetchCandidates() {
    const { data } = await supabase
      .from("candidates")
      .select("id, name, email, linkedin_url, cv_text, cv_url, status, notes")
      .eq("job_id", id)
      .order("created_at", { ascending: true });
    const list = data ?? [];
    setCandidates(list);
    const notesMap: Record<string, string> = {};
    list.forEach((c) => { if (c.notes) notesMap[c.id] = c.notes; });
    setNotes(notesMap);
    setLoading(false);
  }

  async function handleToggleJobOpen() {
    const newValue = !isOpen;
    await supabase.from("jobs").update({ is_open: newValue }).eq("id", id);
    setIsOpen(newValue);
  }

  async function handleSaveNote(candidateId: string, value: string) {
    await supabase
      .from("candidates")
      .update({ notes: value.trim() || null })
      .eq("id", candidateId);
  }

  function validate(): boolean {
    const e: CandidateErrors = {};
    if (!newName.trim()) {
      e.name = "Namn är obligatoriskt";
    } else if (newName.trim().length < 2) {
      e.name = "Minst 2 tecken";
    }
    if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      e.email = "Ogiltig e-postadress";
    }
    if (newLinkedin && !newLinkedin.startsWith("http")) {
      e.linkedin_url = "Måste vara en giltig URL (börja med https://)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    let cvUrl: string | null = null;
    if (newCvFile) {
      const ext = newCvFile.name.split(".").pop() ?? "pdf";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("cvs").upload(path, newCvFile);
      if (uploadError) {
        alert("Fel vid uppladdning av CV: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("cvs").getPublicUrl(path);
      cvUrl = publicUrl;
    }

    const { error } = await supabase.from("candidates").insert({
      job_id: id,
      name: newName.trim(),
      email: newEmail.trim() || null,
      linkedin_url: newLinkedin.trim() || null,
      cv_text: newCvText.trim() || null,
      cv_url: cvUrl,
      status: "applied",
    });

    if (error) {
      alert("Fel vid lagring: " + error.message);
      setSaving(false);
      return;
    }

    setNewName(""); setNewEmail(""); setNewLinkedin(""); setNewCvText(""); setNewCvFile(null);
    setShowForm(false);
    setSaving(false);
    fetchCandidates();
    logActivity("candidate_added", newName.trim(), { job_title: jobTitle });
  }

  async function handleStatusChange(candidateId: string, newStatus: CandidateStatus) {
    const candidate = candidates.find((c) => c.id === candidateId);
    await supabase.from("candidates").update({ status: newStatus }).eq("id", candidateId);
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
    );
    if (candidate) {
      logActivity("status_changed", candidate.name, {
        from_status: candidate.status,
        to_status: newStatus,
      });
    }
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

  const inputClass = (hasError: boolean) =>
    `w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 transition-colors ${
      hasError ? "border-red-300 focus:ring-red-300" : "border-gray-200 dark:border-gray-600 focus:ring-violet-400"
    }`;

  const inInterview = candidates.filter((c) => c.status === "interview").length;
  const withOffer = candidates.filter((c) => c.status === "offer").length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        email={email}
        role={userRole}
        links={
          userRole === "admin"
            ? ADMIN_NAV.map((item) => ({
                label: item.label,
                onClick: () => navigate(item.path),
                active: false,
              }))
            : [{ label: "← Mina jobb", onClick: () => navigate("/dashboard") }]
        }
        onLogout={async () => await supabase.auth.signOut()}
      />

      <div className="flex-1 overflow-hidden flex flex-col bg-violet-50/30 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-violet-100 dark:border-gray-800 px-4 sm:px-6 py-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs text-violet-400 dark:text-violet-500 font-medium uppercase tracking-wide">Jobb</p>
                <button
                  type="button"
                  onClick={handleToggleJobOpen}
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                    isOpen
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {isOpen ? "● Öppen" : "○ Stängd"}
                </button>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{jobTitle}</h1>
              {!loading && candidates.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {candidates.length} kandidater
                  {inInterview > 0 && ` · ${inInterview} i intervju`}
                  {withOffer > 0 && ` · ${withOffer} erbjudanden`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Sök kandidat…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2 text-sm w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 dark:bg-gray-800 dark:text-white focus:bg-white dark:focus:bg-gray-700 transition-colors"
                />
                <span className="absolute left-2.5 top-2.5 text-gray-300 text-xs">🔍</span>
              </div>
              <button
                type="button"
                onClick={() => { setShowForm(!showForm); setErrors({}); }}
                className="bg-violet-600 text-white text-sm rounded-xl px-4 py-2 hover:bg-violet-700 cursor-pointer font-medium transition-colors shadow-sm shrink-0"
              >
                {showForm ? "Avbryt" : "+ Lägg till"}
              </button>
            </div>
          </div>
        </header>

        {/* Candidate form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 border-b border-violet-100 dark:border-gray-800 px-4 sm:px-6 py-4 shrink-0 overflow-y-auto max-h-80">
            <form onSubmit={handleAddCandidate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="cand-name" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Namn *</label>
                  <input
                    id="cand-name"
                    type="text"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                    placeholder="Anna Svensson"
                    className={inputClass(!!errors.name)}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="cand-email" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">E-post</label>
                  <input
                    id="cand-email"
                    type="text"
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                    placeholder="anna@exempel.se"
                    className={inputClass(!!errors.email)}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="cand-linkedin" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">LinkedIn URL</label>
                  <input
                    id="cand-linkedin"
                    type="text"
                    value={newLinkedin}
                    onChange={(e) => { setNewLinkedin(e.target.value); setErrors((p) => ({ ...p, linkedin_url: undefined })); }}
                    placeholder="https://linkedin.com/in/…"
                    className={inputClass(!!errors.linkedin_url)}
                  />
                  {errors.linkedin_url && <p className="text-xs text-red-500 mt-1">{errors.linkedin_url}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="cand-cv-file" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  CV-fil <span className="text-gray-300 dark:text-gray-600 font-normal">(PDF, Word)</span>
                </label>
                <label
                  htmlFor="cand-cv-file"
                  className={`flex items-center gap-2 w-full border rounded-xl px-3 py-2 text-sm cursor-pointer transition-colors bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 ${newCvFile ? "text-gray-800 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}
                >
                  <span className="shrink-0">📄</span>
                  <span className="truncate">{newCvFile ? newCvFile.name : "Välj fil…"}</span>
                  {newCvFile && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setNewCvFile(null); }}
                      className="ml-auto text-gray-300 hover:text-rose-400 transition-colors shrink-0"
                    >×</button>
                  )}
                </label>
                <input
                  id="cand-cv-file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="sr-only"
                  onChange={(e) => setNewCvFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <label htmlFor="cand-cv" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  CV-text <span className="text-gray-300 dark:text-gray-600 font-normal">(för AI-bedömning)</span>
                </label>
                <textarea
                  id="cand-cv"
                  value={newCvText}
                  onChange={(e) => setNewCvText(e.target.value)}
                  rows={3}
                  placeholder="Klistra in CV-text här…"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 transition-colors"
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

        {/* Mobile column picker */}
        <div className="flex gap-2 px-4 pt-4 overflow-x-auto pb-1 lg:hidden shrink-0">
          {COLUMNS.map((col) => {
            const count = filtered.filter((c) => c.status === col.key).length;
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => setMobileColumn(col.key)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  mobileColumn === col.key
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-300"
                }`}
              >
                {col.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-6 py-4">
          {loading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Laddar…</p>
          ) : (
            <div className="flex gap-4 h-full">
              {COLUMNS.map((col) => {
                const colCandidates = filtered.filter((c) => c.status === col.key);
                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
                    onDrop={() => {
                      if (draggingId && draggingId !== col.key) {
                        handleStatusChange(draggingId, col.key);
                      }
                      setDragOverCol(null);
                      setDraggingId(null);
                    }}
                    className={`${col.key !== mobileColumn ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-64 lg:shrink-0 rounded-2xl border-t-4 ${col.border} overflow-hidden shadow-sm transition-colors ${
                      dragOverCol === col.key
                        ? "bg-violet-50 dark:bg-violet-900/20 border border-violet-300 dark:border-violet-600"
                        : "bg-white dark:bg-gray-800 border border-violet-100 dark:border-gray-700"
                    }`}
                  >
                    <div className={`px-4 py-3 flex items-center justify-between border-b border-violet-50 dark:border-gray-700 ${col.bg} shrink-0`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{col.label}</h3>
                      </div>
                      <span className="text-xs bg-white/80 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 rounded-full px-2 py-0.5 font-medium shadow-sm">
                        {colCandidates.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {colCandidates.map((c) => {
                        const assessment = assessments[c.id];
                        const isAssessing = assessing[c.id];
                        return (
                          <div
                            key={c.id}
                            draggable
                            onDragStart={() => setDraggingId(c.id)}
                            onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                            className={`bg-white dark:bg-gray-700 rounded-xl p-3 border border-violet-100 dark:border-gray-600 shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${draggingId === c.id ? "opacity-40" : "opacity-100"}`}
                          >
                            <div className="flex items-start gap-2.5 mb-2">
                              <div className={`w-8 h-8 rounded-full ${getAvatarColor(c.name)} flex items-center justify-center shrink-0`}>
                                <span className="text-white text-xs font-bold">{getInitials(c.name)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{c.name}</p>
                                {c.email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.email}</p>}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {c.cv_url && (
                                <a
                                  href={c.cv_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 hover:underline flex items-center gap-1"
                                >
                                  📄 CV
                                </a>
                              )}
                              {c.linkedin_url && (
                                <a
                                  href={c.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 hover:underline"
                                >
                                  LinkedIn
                                </a>
                              )}
                            </div>

                            <select
                              aria-label={`Status för ${c.name}`}
                              value={c.status}
                              onChange={(e) => handleStatusChange(c.id, e.target.value as CandidateStatus)}
                              className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                            >
                              {COLUMNS.map((s) => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                              ))}
                            </select>

                            <textarea
                              value={notes[c.id] ?? ""}
                              onChange={(e) => setNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              onBlur={(e) => handleSaveNote(c.id, e.target.value)}
                              placeholder="Anteckning…"
                              rows={2}
                              className="mt-2 w-full text-xs border border-gray-100 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-gray-50 dark:bg-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-300 resize-none placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors"
                            />

                            {c.cv_text && (
                              <button
                                type="button"
                                onClick={() => handleAssessCV(c)}
                                disabled={isAssessing}
                                className="mt-2 w-full text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 rounded-lg px-2 py-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/30 disabled:opacity-50 cursor-pointer font-medium transition-colors"
                              >
                                {isAssessing ? "Bedömer…" : "✦ Bedöm CV"}
                              </button>
                            )}

                            {assessment && (
                              <div className="mt-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 p-2.5 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500 dark:text-gray-400 font-medium">Matchning</span>
                                  <span className={`font-bold text-sm ${
                                    assessment.matchning >= 7 ? "text-emerald-600 dark:text-emerald-400"
                                    : assessment.matchning >= 4 ? "text-amber-500 dark:text-amber-400"
                                    : "text-rose-500 dark:text-rose-400"
                                  }`}>
                                    {assessment.matchning}/10
                                  </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{assessment.sammanfattning}</p>
                                {assessment.styrkor.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Styrkor</p>
                                    <ul className="space-y-0.5 text-gray-600 dark:text-gray-400">
                                      {assessment.styrkor.map((s, i) => (
                                        <li key={i} className="flex gap-1"><span className="text-emerald-500 shrink-0">+</span><span>{s}</span></li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {assessment.svagheter.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-rose-600 dark:text-rose-400 mb-1">Svagheter</p>
                                    <ul className="space-y-0.5 text-gray-600 dark:text-gray-400">
                                      {assessment.svagheter.map((s, i) => (
                                        <li key={i} className="flex gap-1"><span className="text-rose-400 shrink-0">−</span><span>{s}</span></li>
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
                        <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-6">Inga kandidater</p>
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
