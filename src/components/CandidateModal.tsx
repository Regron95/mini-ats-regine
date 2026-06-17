import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export type CandidateDetail = {
  id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  cv_text: string | null;
  cv_url: string | null;
  status: string;
  notes: string | null;
  job_id: string;
  created_at: string;
};

type Props = {
  candidate: CandidateDetail;
  jobTitle: string;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: string) => void;
};

const STATUS_OPTIONS = [
  { value: "applied",   label: "Sökt",       color: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400" },
  { value: "screening", label: "Screening",  color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  { value: "interview", label: "Intervju",   color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
  { value: "offer",     label: "Erbjudande", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  { value: "rejected",  label: "Avvisad",    color: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
];

const AVATAR_COLORS = [
  "bg-violet-400", "bg-pink-400", "bg-sky-400",
  "bg-emerald-400", "bg-amber-400", "bg-indigo-400", "bg-rose-400",
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

function CandidateModal({ candidate, jobTitle, onClose, onStatusChange }: Props) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(candidate.status);
  const [notes, setNotes] = useState(candidate.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    await supabase.from("candidates").update({ status: newStatus }).eq("id", candidate.id);
    onStatusChange(candidate.id, newStatus);
  }

  async function handleSaveNotes() {
    await supabase.from("candidates").update({ notes: notes.trim() || null }).eq("id", candidate.id);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 1500);
  }

  function handleOpenKanban() {
    onClose();
    navigate(`/jobs/${candidate.job_id}`);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-violet-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4 border-b border-violet-50 dark:border-gray-800">
          <div className={`w-12 h-12 rounded-full ${getAvatarColor(candidate.name)} flex items-center justify-center shrink-0`}>
            <span className="text-white text-sm font-bold">{getInitials(candidate.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">{candidate.name}</h2>
            {candidate.email && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{candidate.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors cursor-pointer text-2xl leading-none shrink-0"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Job */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-0.5">Söker till</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{jobTitle}</p>
            </div>
            <button
              type="button"
              onClick={handleOpenKanban}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 cursor-pointer transition-colors shrink-0 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30"
            >
              Öppna kanban →
            </button>
          </div>

          {/* Status pills */}
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-2">Status</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(opt.value)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                    status === opt.value
                      ? opt.color + " ring-2 ring-offset-1 ring-current"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* CV-fil */}
          {candidate.cv_url && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-1">CV</p>
              <a
                href={candidate.cv_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
              >
                📄 Ladda ned CV
              </a>
            </div>
          )}

          {/* LinkedIn */}
          {candidate.linkedin_url && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-1">LinkedIn</p>
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-violet-600 dark:text-violet-400 hover:underline break-all"
              >
                {candidate.linkedin_url}
              </a>
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Anteckning</p>
              {notesSaved && <span className="text-xs text-emerald-500">✓ Sparad</span>}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Lägg till en anteckning om kandidaten…"
              rows={3}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white dark:focus:bg-gray-700 resize-none transition-colors"
            />
          </div>

          {/* CV text */}
          {candidate.cv_text && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-2">CV-text</p>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed font-mono">
                {candidate.cv_text}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-xs text-gray-300 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800 pt-4">
            Tillagd {new Date(candidate.created_at).toLocaleDateString("sv-SE")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default CandidateModal;
