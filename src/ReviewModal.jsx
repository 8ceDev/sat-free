import MathText from "./MathText";
import Visual from "./Visual";

// ReviewModal shows one past question in full, read-only, with the correct
// choice green and the user's pick red if wrong. Overlay click closes; inner
// click doesn't (stopPropagation).
//
// Props:
//   question, selectedIndex, onClose

function ReviewModal({ question, selectedIndex, onClose }) {
  if (!question) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="drill-top">
          <span className="skill-tag" style={{ marginTop: 0 }}>{question.skill}</span>
          <button className="btn-link" onClick={onClose}>Close ✕</button>
        </div>

        {question.passage && (
          <div className="passage-box" style={{ marginTop: 12 }}>
            <MathText text={question.passage.text} />
            {question.passage.text_b && (
              <>
                <hr className="passage-divider" />
                <MathText text={question.passage.text_b} />
              </>
            )}
          </div>
        )}

        {question.notes && question.notes.length > 0 && (
          <ul className="notes-list">
            {question.notes.map((note, i) => <li key={i}><MathText text={note} /></li>)}
          </ul>
        )}

        {question.visual && <Visual visual={question.visual} />}

        <h2 className="stem"><MathText text={question.stem} /></h2>

        <div className="choice-list">
          {question.choices.map((choice, i) => {
            let cls = "choice locked";
            if (i === question.correct_index) cls += " correct";
            else if (i === selectedIndex) cls += " wrong";
            return (
              <div key={i} className={cls}>
                <strong>{choice.label}.</strong> <MathText text={choice.text} />
              </div>
            );
          })}
        </div>

        <p style={{ fontWeight: 600, marginTop: "1.25rem" }}>Explanation</p>
        <p className="explanation"><MathText text={question.explanation} /></p>
      </div>
    </div>
  );
}

export default ReviewModal;
