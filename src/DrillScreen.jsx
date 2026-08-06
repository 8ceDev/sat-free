import { useState } from "react";
import MathText from "./MathText";
import Visual from "./Visual";

// DrillScreen is a scene. Props:
//   questions : the filtered list to drill through
//   onAnswer  : callback to report an answer up to App (for history)
//   onExit    : callback to return to the menu

function DrillScreen({ questions, onAnswer, onExit }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);

  if (questions.length === 0) {
    return (
      <div className="container">
        <p>No questions match those filters.</p>
        <button className="btn-primary" onClick={onExit}>Back to menu</button>
      </div>
    );
  }

  const q = questions[current];
  const answered = selected !== null;
  const isLast = current === questions.length - 1;

  function handleSelect(choiceIndex) {
    if (answered) return;
    setSelected(choiceIndex);
    onAnswer(q, choiceIndex);
  }

  function handleNext() {
    setSelected(null);
    if (!isLast) setCurrent(current + 1);
    else onExit();
  }

  return (
    <div className="container">
      <div className="drill-top">
        <button className="btn-link" onClick={onExit}>← Menu</button>
        <span className="muted">{current + 1} / {questions.length}</span>
      </div>

      <p className="skill-tag">{q.skill}</p>

      {/* Reading passage(s) */}
      {q.passage && (
        <div className="passage-box">
          <MathText text={q.passage.text} />
          {q.passage.text_b && (
            <>
              <hr className="passage-divider" />
              <MathText text={q.passage.text_b} />
            </>
          )}
          {q.passage.attribution && <p className="attribution">{q.passage.attribution}</p>}
        </div>
      )}

      {/* Rhetorical-synthesis style bullet notes */}
      {q.notes && q.notes.length > 0 && (
        <ul className="notes-list">
          {q.notes.map((note, i) => <li key={i}><MathText text={note} /></li>)}
        </ul>
      )}

      {/* Chart / table / figure */}
      {q.visual && <Visual visual={q.visual} />}

      <h2 className="stem"><MathText text={q.stem} /></h2>

      <div className="choice-list">
        {q.choices.map((choice, i) => {
          let cls = "choice";
          if (answered && i === q.correct_index) cls += " correct";
          else if (answered && i === selected) cls += " wrong";
          if (answered) cls += " locked";
          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)}>
              <strong>{choice.label}.</strong> <MathText text={choice.text} />
            </button>
          );
        })}
      </div>

      {answered && (
        <div style={{ marginTop: "1.5rem" }}>
          <p style={{ fontWeight: 600 }}>
            {selected === q.correct_index ? "Correct!" : "Not quite."}
          </p>
          <p className="explanation"><MathText text={q.explanation} /></p>
          <button className="btn-primary" onClick={handleNext}>
            {isLast ? "Finish" : "Next question"}
          </button>
        </div>
      )}
    </div>
  );
}

export default DrillScreen;
