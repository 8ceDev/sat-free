import { useState, useEffect } from "react";
import MenuScreen from "./MenuScreen";
import DrillScreen from "./DrillScreen";
import "./index.css";

// App is the controller. It loads the bank, decides which scene shows, and
// owns the two pieces of long-lived data: the active session and the answer
// history. History now persists across visits via localStorage.

const HISTORY_KEY = "sat-drill-history-v1";

function App() {
  const [bank, setBank] = useState([]);
  const [screen, setScreen] = useState("menu");   // "menu" | "drill"
  const [session, setSession] = useState([]);
  // Lazy initializer: the function runs ONCE on startup to read saved history.
  const [history, setHistory] = useState(() => loadHistory());

  useEffect(() => {
        fetch(import.meta.env.BASE_URL + "bank.json")      .then((res) => res.json())
      .then((data) => setBank(data));
  }, []);

  // Auto-save: this effect runs every time `history` changes.
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("Could not save history:", e);
    }
  }, [history]);

  function startSession(filters) {
    const chosen = filterQuestions(bank, filters);
    setSession(shuffle(chosen));
    setScreen("drill");
  }

  // Retry from history: the original question first, then every other
  // question with the SAME SKILL (difficulty deliberately ignored), shuffled.
  function retryFromHistory(entry) {
    const original = bank.find((q) => q.id === entry.qid);
    if (!original) return;
    const similar = shuffle(
      bank.filter((q) => q.skill === original.skill && q.id !== original.id)
    );
    setSession([original, ...similar]);
    setScreen("drill");
  }

  function recordAnswer(question, selectedIndex) {
    const entry = {
      qid: question.id,                               // compact: store id, not the question
      selectedIndex,
      correct: selectedIndex === question.correct_index,
      at: Date.now(),
    };
    setHistory((prev) => [...prev, entry]);
  }

  // Merge imported entries, skipping exact duplicates (same question + timestamp).
  function importHistory(entries) {
    const valid = entries.filter(isValidEntry);
    setHistory((prev) => {
      const seen = new Set(prev.map((e) => e.qid + "@" + e.at));
      const merged = [...prev];
      for (const e of valid) {
        const key = e.qid + "@" + e.at;
        if (!seen.has(key)) {
          merged.push(e);
          seen.add(key);
        }
      }
      return merged;
    });
  }

  function clearHistory() {
    setHistory([]);
  }

  function goToMenu() {
    setScreen("menu");
  }

  if (bank.length === 0) {
    return <p className="container">Loading questions…</p>;
  }

  if (screen === "drill") {
    return (
      <DrillScreen questions={session} onAnswer={recordAnswer} onExit={goToMenu} />
    );
  }

  return (
    <MenuScreen
      bank={bank}
      history={history}
      onStart={startSession}
      onRetry={retryFromHistory}
      onImport={importHistory}
      onClear={clearHistory}
    />
  );
}

// ---------------------------------------------------------------------------
// Helpers (plain logic, no React)
// ---------------------------------------------------------------------------

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isValidEntry) : [];
  } catch {
    return [];
  }
}

function isValidEntry(e) {
  return (
    e &&
    typeof e.qid === "string" &&
    typeof e.selectedIndex === "number" &&
    typeof e.correct === "boolean" &&
    typeof e.at === "number"
  );
}

function filterQuestions(bank, filters) {
  const { sections = [], difficulties = [], skills = [] } = filters;
  return bank.filter((q) => {
    if (sections.length && !sections.includes(q.section)) return false;
    if (difficulties.length && !difficulties.includes(q.difficulty)) return false;
    if (skills.length && !skills.includes(q.skill)) return false;
    return true;
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default App;
