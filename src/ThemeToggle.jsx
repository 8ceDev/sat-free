import { useEffect, useState } from "react";

// ThemeToggle lets the user pick Light, Dark, or System.
//   - "system" (default) follows the browser/OS via prefers-color-scheme and
//     updates live if the user changes their OS setting mid-session.
//   - The choice persists in localStorage.
// It works by setting  data-theme="light|dark"  on <html>; the CSS in index.css
// defines the variable values for each. "system" resolves to light or dark and
// re-resolves when the OS preference changes.

const THEME_KEY = "sat-drill-theme";

function getStoredChoice() {
  try {
    return localStorage.getItem(THEME_KEY) || "system";
  } catch {
    return "system";
  }
}

// Apply the resolved theme (light|dark) to the document root.
function applyResolved(choice) {
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = choice === "system" ? (prefersDark ? "dark" : "light") : choice;
  document.documentElement.setAttribute("data-theme", resolved);
}

function ThemeToggle() {
  const [choice, setChoice] = useState(getStoredChoice);

  // Apply on mount and whenever the choice changes.
  useEffect(() => {
    applyResolved(choice);
    try {
      localStorage.setItem(THEME_KEY, choice);
    } catch {}
  }, [choice]);

  // If following the system, re-apply when the OS preference flips live.
  useEffect(() => {
    if (choice !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyResolved("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [choice]);

  const options = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
    { id: "system", label: "System" },
  ];

  return (
    <div className="theme-toggle">
      {options.map((o) => (
        <button
          key={o.id}
          className={choice === o.id ? "theme-btn active" : "theme-btn"}
          onClick={() => setChoice(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
