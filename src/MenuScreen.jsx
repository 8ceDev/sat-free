import { useState } from "react";
import { TAXONOMY } from "./taxonomy";
import HistoryPanel from "./HistoryPanel";
import ThemeToggle from "./ThemeToggle";

// MenuScreen now renders a two-column layout: the practice setup on the left,
// the answer history on the right. All history data and actions come down from
// App as props and are forwarded to HistoryPanel.
//
// Props:
//   bank     : full question list
//   history  : persistent list of answered-question entries
//   onStart  : callback(filters) -> start a session
//   onRetry  : callback(entry)   -> retry a history question + similar ones
//   onImport : callback(entries) -> merge imported history
//   onClear  : callback()        -> wipe history

function MenuScreen({ bank, history, onStart, onRetry, onImport, onClear }) {
  const [sections, setSections] = useState(new Set());
  const [difficulties, setDifficulties] = useState(new Set());
  const [skills, setSkills] = useState(new Set());
  const [openCategories, setOpenCategories] = useState(new Set());

  function toggle(setState, value) {
    setState((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const matchCount = bank.filter((q) => {
    if (sections.size && !sections.has(q.section)) return false;
    if (difficulties.size && !difficulties.has(q.difficulty)) return false;
    if (skills.size && !skills.has(q.skill)) return false;
    return true;
  }).length;

  function startFiltered() {
    onStart({
      sections: [...sections],
      difficulties: [...difficulties],
      skills: [...skills],
    });
  }

  function startQuick() {
    onStart({ sections: [], difficulties: [], skills: [] });
  }

  const difficultyOptions = [
    { id: 1, label: "Easy" },
    { id: 2, label: "Medium" },
    { id: 3, label: "Hard" },
  ];

  return (
    <div className="menu-layout">
      {/* ---------------- Left column: practice setup ---------------- */}
      <div className="menu-col">
        <div className="menu-header">
          <div>
            <h1 className="screen-title">SAT Practice</h1>
            <p className="subtitle">Pick what to work on, or jump straight in.</p>
          </div>
          <ThemeToggle />
        </div>

        <button className="btn-quick" onClick={startQuick}>
          Quick practice · random questions
        </button>

        <h3 className="section-heading">Section</h3>
        <div className="chip-row">
          {TAXONOMY.sections.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              active={sections.has(s.id)}
              onClick={() => toggle(setSections, s.id)}
            />
          ))}
        </div>

        <h3 className="section-heading">Difficulty</h3>
        <div className="chip-row">
          {difficultyOptions.map((d) => (
            <Chip
              key={d.id}
              label={d.label}
              active={difficulties.has(d.id)}
              onClick={() => toggle(setDifficulties, d.id)}
            />
          ))}
        </div>

        <h3 className="section-heading">Skills</h3>
        <p className="muted" style={{ marginTop: 0 }}>Leave empty to include all skills.</p>
        {TAXONOMY.sections.map((section) => (
          <div key={section.id} style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: "#555", margin: "8px 0 4px" }}>
              {section.label}
            </p>
            {section.categories.map((cat) => {
              const open = openCategories.has(cat.id);
              const selectedInCat = cat.skills.filter((sk) => skills.has(sk.id)).length;
              return (
                <div key={cat.id} className="accordion">
                  <button className="accordion-header" onClick={() => toggle(setOpenCategories, cat.id)}>
                    <span>{open ? "▾" : "▸"} {cat.label}</span>
                    <span className="muted">{selectedInCat > 0 ? `${selectedInCat} selected` : ""}</span>
                  </button>
                  {open && (
                    <div className="accordion-body">
                      {cat.skills.map((sk) => (
                        <label key={sk.id} className="skill-row">
                          <input
                            type="checkbox"
                            checked={skills.has(sk.id)}
                            onChange={() => toggle(setSkills, sk.id)}
                          />
                          <span>{sk.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div className="start-bar">
          <span className="muted">{matchCount} questions match</span>
          <button className="btn-primary" onClick={startFiltered} disabled={matchCount === 0}>
            Practice
          </button>
        </div>
      </div>

      {/* ---------------- Right column: history ---------------- */}
      <HistoryPanel
        bank={bank}
        history={history}
        onRetry={onRetry}
        onImport={onImport}
        onClear={onClear}
      />
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button className={active ? "chip active" : "chip"} onClick={onClick}>
      {label}
    </button>
  );
}

export default MenuScreen;
