import { useMemo } from "react";
import katex from "katex";

// MathText renders a string that MIXES plain prose with LaTeX, the way our
// questions are written, e.g.:  "If \\(3x - 7 = 2x + 5\\), find \\(x\\)."
//
// It splits the text on the delimiters \( ... \) (inline) and \[ ... \] (block)
// and renders only those spans as math, leaving prose untouched. Anything KaTeX
// can't parse falls back to showing the raw source so nothing silently vanishes.
//
// Props:
//   text : the string to render (may be null/empty)
//   as   : optional wrapper tag name (default "span")

function renderMath(latex, displayMode) {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,   // KaTeX renders a red error node instead of crashing
      errorColor: "#dc2626",
    });
  } catch {
    return null;             // signal caller to show raw fallback
  }
}

// Split text into alternating prose / math tokens.
// Recognizes \( inline \) and \[ block \].
function tokenize(text) {
  const tokens = [];
  // Regex matches either \( ... \) or \[ ... \], non-greedy, across newlines.
  const re = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, m.index) });
    }
    if (m[1] !== undefined) {
      tokens.push({ type: "inline", value: m[1] });
    } else {
      tokens.push({ type: "block", value: m[2] });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

function MathText({ text, as: Tag = "span" }) {
  // Recompute only when the text changes (parsing + KaTeX isn't free).
  const tokens = useMemo(() => (text ? tokenize(text) : []), [text]);

  if (!text) return null;

  return (
    <Tag>
      {tokens.map((tok, i) => {
        if (tok.type === "text") {
          return <span key={i}>{tok.value}</span>;
        }
        const html = renderMath(tok.value, tok.type === "block");
        if (html === null) {
          // Fallback: show the raw LaTeX source so nothing disappears.
          return <span key={i}>{tok.type === "block" ? `\\[${tok.value}\\]` : `\\(${tok.value}\\)`}</span>;
        }
        // KaTeX gives us an HTML string; inject it. This is safe because the
        // input is our own generated question content, not user input.
        return (
          <span
            key={i}
            style={tok.type === "block" ? { display: "block", margin: "0.5rem 0" } : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </Tag>
  );
}

export default MathText;
