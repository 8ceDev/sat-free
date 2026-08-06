import { useState } from "react";
import { TAXONOMY } from "./taxonomy";
import ReviewModal from "./ReviewModal";

// HistoryPanel shows every previously answered question. Entries are stored
// compactly (question id + result), so we "rehydrate" the full question by
// looking its id up in the bank. Entries whose question isn't in the current
// bank (e.g. after swapping pilot.json for the full bank) are hidden.
//
// Props:
//   bank     : full question list (for rehydration)
//   history  : [{ qid, selectedIndex, correct, at }, ...]
//   onRetry  : callback(entry) -> start a retry session
//   onImport : callback(entries) -> merge imported entries
//   onClear  : callback() -> wipe history

// Build a quick id -> question lookup table once per render. A Map makes each
// lookup instant instead of scanning the whole bank per entry.
function buildLookup(bank) {
  const map = new Map();
  for (const q of bank) map.set(q.id, q);
  return map;
}

// Flatten the taxonomy into id -> pretty label maps for tags.
const SKILL_LABELS = {};
const SECTION_LABELS = {};
for (const s of TAXONOMY.sections) {
  SECTION_LABELS[s.id] = s.label;
  for (const c of s.categories) {
    for (const sk of c.skills) SKILL_LABELS[sk.id] = sk.label;
  }
}
const DIFFICULTY_LABELS = { 1: "Easy", 2: "Medium", 3: "Hard" };

function HistoryPanel({ bank, history, onRetry, onImport, onClear }) {
  const [sortBy, setSortBy] = useState("newest");   // newest | oldest | skill
  const [show, setShow] = useState("all");          // all | missed | correct
  const [reviewing, setReviewing] = useState(null); // entry being viewed, or null

  const lookup = buildLookup(bank);

  // Pair each entry with its question; drop entries whose question is gone.
  let items = history
    .map((entry) => ({ entry, question: lookup.get(entry.qid) }))
    .filter((item) => item.question);

  if (show === "missed") items = items.filter((i) => !i.entry.correct);
  if (show === "correct") items = items.filter((i) => i.entry.correct);

  if (sortBy === "newest") items.sort((a, b) => b.entry.at - a.entry.at);
  if (sortBy === "oldest") items.sort((a, b) => a.entry.at - b.entry.at);
  if (sortBy === "skill")
    items.sort(
      (a, b) =>
        (SKILL_LABELS[a.question.skill] || "").localeCompare(
          SKILL_LABELS[b.question.skill] || ""
        ) || b.entry.at - a.entry.at
    );

  function exportHistory() {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sat-practice-history.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    file
      .text()
      .then((text) => {
        const data = JSON.parse(text);
        if (Array.isArray(data)) onImport(data);
        else alert("That file doesn't look like exported history.");
      })
      .catch(() => alert("Couldn't read that file."));
    e.target.value = ""; // allow re-importing the same file later
  }

  return (
    <div className="history-col">
      <h2 className="section-heading" style={{ marginTop: 0 }}>History</h2>

      <div className="history-tools">
        <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="skill">By skill</option>
        </select>
        <select className="select" value={show} onChange={(e) => setShow(e.target.value)}>
          <option value="all">All</option>
          <option value="missed">Missed only</option>
          <option value="correct">Correct only</option>
        </select>
        <button className="btn-small" onClick={exportHistory} disabled={history.length === 0}>
          Export
        </button>
        <label className="btn-small" style={{ cursor: "pointer" }}>
          Import
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            style={{ display: "none" }}
          />
        </label>
        <button
          className="btn-small"
          onClick={() => {
            if (confirm("Clear all history? This can't be undone.")) onClear();
          }}
          disabled={history.length === 0}
        >
          Clear
        </button>
      </div>

      {items.length === 0 ? (
        <p className="muted">
          {history.length === 0
            ? "Answered questions will show up here."
            : "No entries match this filter."}
        </p>
      ) : (
        <div className="history-list">
          {items.map(({ entry, question }) => (
            <div key={entry.qid + "@" + entry.at} className="history-card">
              <div className="tag-row">
                <span className={entry.correct ? "tag ok" : "tag miss"}>
                  {entry.correct ? "✓ Correct" : "✗ Missed"}
                </span>
                <span className="tag">{SKILL_LABELS[question.skill] || question.skill}</span>
                <span className="tag">{DIFFICULTY_LABELS[question.difficulty]}</span>
              </div>
              <p className="history-preview">{preview(question.stem)}</p>
              <div className="card-actions">
                <button className="btn-small" onClick={() => onRetry(entry)}>
                  Retry
                </button>
                <button className="btn-small" onClick={() => setReviewing(entry)}>
                  View answer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewing && (
        <ReviewModal
          question={lookup.get(reviewing.qid)}
          selectedIndex={reviewing.selectedIndex}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}

function preview(text, max = 110) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export default HistoryPanel;
