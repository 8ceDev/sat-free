// Visual renders the structured `visual` object from a question into an actual
// table / chart / figure, drawn with SVG so it scales and themes cleanly.
// Every branch matches a shape from schema.py. If a type is unrecognized or the
// data is malformed, it renders nothing rather than crashing.
//
// Props:
//   visual : the question.visual object (or null)

const AXIS = "var(--text-muted)";
const INK = "var(--text)";
const ACCENT = "var(--accent)";

function Visual({ visual }) {
  if (!visual || !visual.type) return null;

  let body = null;
  switch (visual.type) {
    case "table": body = <TableView v={visual} />; break;
    case "bar_chart": body = <BarChart v={visual} />; break;
    case "line_chart": body = <LineChart v={visual} />; break;
    case "scatter": body = <Scatter v={visual} />; break;
    case "dot_plot": body = <DotPlot v={visual} />; break;
    case "coordinate": body = <Coordinate v={visual} />; break;
    case "figure": body = <Figure v={visual} />; break;
    default: return null;
  }

  const caption = visual.caption || visual.title; // accept either name
  return (
    <figure className="visual">
      {body}
      {caption && <figcaption className="visual-caption">{caption}</figcaption>}
    </figure>
  );
}

/* ----------------------------- Table ----------------------------- */
function TableView({ v }) {
  const headers = v.headers || [];
  const rows = v.rows || [];
  return (
    <table className="data-table">
      {headers.length > 0 && (
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
      )}
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

/* --------------------------- Bar chart --------------------------- */
function BarChart({ v }) {
  const W = 360, H = 240, pad = 40;
  const cats = v.categories || [];
  const series = v.series || [];
  const allVals = series.flatMap((s) => s.values || []);
  const max = Math.max(1, ...allVals);
  const groupW = (W - pad * 2) / Math.max(1, cats.length);
  const barW = groupW / Math.max(1, series.length) * 0.8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      <Axes W={W} H={H} pad={pad} xLabel={v.x_label} yLabel={v.y_label} />
      {cats.map((cat, ci) => (
        series.map((s, si) => {
          const val = (s.values || [])[ci] || 0;
          const h = (val / max) * (H - pad * 2);
          const x = pad + ci * groupW + si * barW + groupW * 0.1;
          const y = H - pad - h;
          return <rect key={ci + "-" + si} x={x} y={y} width={barW} height={h}
                       fill={si === 0 ? ACCENT : "var(--accent-soft)"} stroke={ACCENT} />;
        })
      ))}
      {cats.map((cat, ci) => (
        <text key={ci} x={pad + ci * groupW + groupW / 2} y={H - pad + 14}
              fontSize="10" textAnchor="middle" fill={AXIS}>{cat}</text>
      ))}
      <text x={pad - 6} y={pad} fontSize="10" textAnchor="end" fill={AXIS}>{max}</text>
      <text x={pad - 6} y={H - pad} fontSize="10" textAnchor="end" fill={AXIS}>0</text>
    </svg>
  );
}

/* --------------------------- Line chart -------------------------- */
function LineChart({ v }) {
  const W = 360, H = 240, pad = 40;
  const xs = v.x_values || [];
  const series = v.series || [];
  const allVals = series.flatMap((s) => s.values || []);
  const maxY = Math.max(1, ...allVals);
  const minY = Math.min(0, ...allVals);
  const maxX = Math.max(1, ...xs);
  const minX = Math.min(0, ...xs);
  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (W - pad * 2);
  const sy = (y) => H - pad - ((y - minY) / (maxY - minY || 1)) * (H - pad * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      <Axes W={W} H={H} pad={pad} xLabel={v.x_label} yLabel={v.y_label} />
      {series.map((s, si) => {
        const pts = (s.values || []).map((y, i) => `${sx(xs[i])},${sy(y)}`).join(" ");
        return <polyline key={si} points={pts} fill="none" stroke={ACCENT} strokeWidth="2" />;
      })}
      <text x={pad - 6} y={pad} fontSize="10" textAnchor="end" fill={AXIS}>{maxY}</text>
      <text x={pad - 6} y={H - pad} fontSize="10" textAnchor="end" fill={AXIS}>{minY}</text>
      <text x={pad} y={H - pad + 14} fontSize="10" textAnchor="middle" fill={AXIS}>{minX}</text>
      <text x={W - pad} y={H - pad + 14} fontSize="10" textAnchor="middle" fill={AXIS}>{maxX}</text>
    </svg>
  );
}

/* ---------------------------- Scatter ---------------------------- */
function Scatter({ v }) {
  const W = 360, H = 240, pad = 40;
  const pts = v.points || [];
  const xsArr = pts.map((p) => p[0]);
  const ysArr = pts.map((p) => p[1]);
  const maxX = Math.max(1, ...xsArr), minX = Math.min(0, ...xsArr);
  const maxY = Math.max(1, ...ysArr), minY = Math.min(0, ...ysArr);
  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (W - pad * 2);
  const sy = (y) => H - pad - ((y - minY) / (maxY - minY || 1)) * (H - pad * 2);

  // Best-fit line can arrive as {slope,intercept} (schema) or as `line`:
  // [[x1,y1],[x2,y2]] endpoints (improvised). Normalize to two screen points.
  let fitLine = null;
  if (v.line_of_best_fit) {
    fitLine = {
      x1: sx(minX), y1: sy(v.line_of_best_fit.slope * minX + v.line_of_best_fit.intercept),
      x2: sx(maxX), y2: sy(v.line_of_best_fit.slope * maxX + v.line_of_best_fit.intercept),
    };
  } else if (Array.isArray(v.line) && v.line.length === 2) {
    fitLine = { x1: sx(v.line[0][0]), y1: sy(v.line[0][1]), x2: sx(v.line[1][0]), y2: sy(v.line[1][1]) };
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      <Axes W={W} H={H} pad={pad} xLabel={v.x_label} yLabel={v.y_label} />
      {fitLine && (
        <line x1={fitLine.x1} y1={fitLine.y1} x2={fitLine.x2} y2={fitLine.y2}
          stroke={ACCENT} strokeWidth="2" strokeDasharray="5 4" />
      )}
      {pts.map((p, i) => <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r="3.5" fill={ACCENT} />)}
      <text x={pad - 6} y={pad} fontSize="10" textAnchor="end" fill={AXIS}>{maxY}</text>
      <text x={pad - 6} y={H - pad} fontSize="10" textAnchor="end" fill={AXIS}>{minY}</text>
      <text x={pad} y={H - pad + 14} fontSize="10" textAnchor="middle" fill={AXIS}>{minX}</text>
      <text x={W - pad} y={H - pad + 14} fontSize="10" textAnchor="middle" fill={AXIS}>{maxX}</text>
    </svg>
  );
}

/* ---------------------------- Dot plot --------------------------- */
function DotPlot({ v }) {
  const W = 360, H = 160, pad = 40;
  // Prefer raw `values`; fall back to reconstructing from `counts` if that's
  // all that was provided.
  let vals = v.values || [];
  if (vals.length === 0 && v.counts && typeof v.counts === "object") {
    vals = [];
    for (const [val, n] of Object.entries(v.counts)) {
      for (let i = 0; i < n; i++) vals.push(Number(val));
    }
  }
  if (vals.length === 0) return null;

  const min = Math.min(...vals), max = Math.max(...vals);
  const sx = (x) => pad + ((x - min) / (max - min || 1)) * (W - pad * 2);
  const counts = {};
  const positions = vals.map((val) => {
    counts[val] = (counts[val] || 0) + 1;
    return { val, stack: counts[val] };
  });
  const uniqueVals = [...new Set(vals)].sort((a, b) => a - b);
  const axisLabel = v.axis_label || v.x_axis_label; // accept either name

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={AXIS} />
      {positions.map((p, i) => (
        <circle key={i} cx={sx(p.val)} cy={H - pad - 6 - (p.stack - 1) * 11} r="4" fill={ACCENT} />
      ))}
      {uniqueVals.map((val, i) => (
        <text key={i} x={sx(val)} y={H - pad + 14} fontSize="10" textAnchor="middle" fill={AXIS}>{val}</text>
      ))}
      {axisLabel && <text x={W / 2} y={H - 6} fontSize="11" textAnchor="middle" fill={AXIS}>{axisLabel}</text>}
    </svg>
  );
}

/* -------------------------- Coordinate --------------------------- */
function Coordinate({ v }) {
  const W = 300, H = 300, pad = 20;
  const [xmin, xmax] = v.x_range || [-10, 10];
  const [ymin, ymax] = v.y_range || [-10, 10];
  const sx = (x) => pad + ((x - xmin) / (xmax - xmin || 1)) * (W - pad * 2);
  const sy = (y) => H - pad - ((y - ymin) / (ymax - ymin || 1)) * (H - pad * 2);

  // --- Normalize the many shapes DeepSeek emits into one internal form. ---
  // points may be [{x,y,label}] (our schema) OR [[x,y], ...] (improvised).
  const points = (v.points || []).map((p) =>
    Array.isArray(p) ? { x: p[0], y: p[1], label: null } : p
  );
  // A curve can arrive as: curves:[{expr}] (schema), or a bare string in
  // `function` / `equation` / `expr` (improvised). Normalize all to expr list.
  const curves = [];
  for (const c of v.curves || []) {
    if (c && c.expr) curves.push(c.expr);
  }
  for (const key of ["function", "equation", "expr"]) {
    if (typeof v[key] === "string") curves.push(stripEquation(v[key]));
  }
  // vertex is extra info some parabola questions include; show it as a point.
  if (Array.isArray(v.vertex) && v.vertex.length === 2) {
    points.push({ x: v.vertex[0], y: v.vertex[1], label: null });
  }

  // Turn "y = 2(x - 1)^2 + 3" into an evaluable "2*(x - 1)**2 + 3".
  function stripEquation(s) {
    let e = s.replace(/^\s*y\s*=\s*/i, "").replace(/\^/g, "**");
    // insert * for implicit multiplication like 2(x-1) -> 2*(x-1)
    e = e.replace(/(\d)\s*\(/g, "$1*(").replace(/\)\s*\(/g, ")*(");
    return e;
  }

  function curvePoints(expr) {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const x = xmin + (i / 80) * (xmax - xmin);
      let y;
      try {
        // eslint-disable-next-line no-new-func
        y = Function("x", `"use strict"; return (${expr});`)(x);
      } catch { y = NaN; }
      if (Number.isFinite(y)) pts.push(`${sx(x)},${sy(y)}`);
    }
    return pts.join(" ");
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      {/* axes through origin (clamped into view) */}
      <line x1={sx(xmin)} y1={sy(0)} x2={sx(xmax)} y2={sy(0)} stroke={AXIS} />
      <line x1={sx(0)} y1={sy(ymin)} x2={sx(0)} y2={sy(ymax)} stroke={AXIS} />
      {(v.lines || []).map((ln, i) => (
        <line key={"l" + i}
          x1={sx(xmin)} y1={sy(ln.slope * xmin + ln.intercept)}
          x2={sx(xmax)} y2={sy(ln.slope * xmax + ln.intercept)}
          stroke={ACCENT} strokeWidth="2" />
      ))}
      {curves.map((expr, i) => (
        <polyline key={"c" + i} points={curvePoints(expr)} fill="none" stroke={ACCENT} strokeWidth="2" />
      ))}
      {(v.circles || []).map((c, i) => (
        <circle key={"ci" + i} cx={sx(c.cx)} cy={sy(c.cy)}
          r={Math.abs(sx(c.cx + c.r) - sx(c.cx))} fill="none" stroke={ACCENT} strokeWidth="2" />
      ))}
      {points.map((p, i) => (
        <g key={"p" + i}>
          <circle cx={sx(p.x)} cy={sy(p.y)} r="3.5" fill={INK} />
          {p.label && <text x={sx(p.x) + 6} y={sy(p.y) - 6} fontSize="11" fill={INK}>{p.label}</text>}
        </g>
      ))}
    </svg>
  );
}

/* ----------------------------- Figure ---------------------------- */
// Geometry figures use an abstract coordinate space; we compute the bounding
// box of all primitives, then scale to fit the SVG with a margin.
function Figure({ v }) {
  const W = 320, H = 260, pad = 30;
  const prims = v.primitives || [];

  const allPts = [];
  for (const p of prims) {
    if (p.at) allPts.push(p.at);
    if (p.from) allPts.push(p.from);
    if (p.to) allPts.push(p.to);
    if (p.center) allPts.push(p.center);
    if (p.points) allPts.push(...p.points);
  }
  if (allPts.length === 0) return null;
  const xs = allPts.map((p) => p[0]), ys = allPts.map((p) => p[1]);
  let minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  // include circle radii in the bounds
  for (const p of prims) {
    if (p.kind === "circle" && p.center) {
      minX = Math.min(minX, p.center[0] - p.r); maxX = Math.max(maxX, p.center[0] + p.r);
      minY = Math.min(minY, p.center[1] - p.r); maxY = Math.max(maxY, p.center[1] + p.r);
    }
  }
  const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
  const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
  const sx = (x) => pad + (x - minX) * scale;
  const sy = (y) => H - pad - (y - minY) * scale; // flip y so up is positive

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      {prims.map((p, i) => {
        switch (p.kind) {
          case "segment":
          case "line":
          case "length_mark":
            return (
              <g key={i}>
                <line x1={sx(p.from[0])} y1={sy(p.from[1])} x2={sx(p.to[0])} y2={sy(p.to[1])}
                      stroke={INK} strokeWidth="1.5" />
                {p.measure && <text x={(sx(p.from[0]) + sx(p.to[0])) / 2 + 4}
                  y={(sy(p.from[1]) + sy(p.to[1])) / 2 - 4} fontSize="11" fill={AXIS}>{p.measure}</text>}
              </g>
            );
          case "angle_arc": {
            // Draw a small arc at `at` between start_angle and end_angle.
            const r = (p.radius || 0.8) * scale;
            const a0 = ((p.start_angle || 0) * Math.PI) / 180;
            const a1 = ((p.end_angle || 0) * Math.PI) / 180;
            const cx = sx(p.at[0]), cy = sy(p.at[1]);
            // note: y is flipped on screen, so subtract sin
            const x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0);
            const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
            const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
            return (
              <path key={i} d={`M ${x0} ${y0} A ${r} ${r} 0 ${large} 0 ${x1} ${y1}`}
                    fill="none" stroke={AXIS} strokeWidth="1" />
            );
          }
          case "polygon":
            return <polygon key={i} points={p.points.map((pt) => `${sx(pt[0])},${sy(pt[1])}`).join(" ")}
                            fill="var(--accent-soft)" stroke={INK} strokeWidth="1.5" />;
          case "circle":
            return <circle key={i} cx={sx(p.center[0])} cy={sy(p.center[1])}
                           r={p.r * scale} fill="none" stroke={INK} strokeWidth="1.5" />;
          case "point":
            return (
              <g key={i}>
                <circle cx={sx(p.at[0])} cy={sy(p.at[1])} r="3" fill={INK} />
                {p.label && <text x={sx(p.at[0]) + 5} y={sy(p.at[1]) - 5} fontSize="11" fill={INK}>{p.label}</text>}
              </g>
            );
          case "angle_mark":
            return p.measure ? (
              <text key={i} x={sx(p.at[0])} y={sy(p.at[1])} fontSize="11" fill={AXIS}>{p.measure}</text>
            ) : null;
          default:
            return null;
        }
      })}
      {v.not_to_scale && (
        <text x={W - 4} y={H - 4} fontSize="9" textAnchor="end" fill={AXIS} fontStyle="italic">
          Figure not to scale
        </text>
      )}
    </svg>
  );
}

/* ------------------------- shared axes --------------------------- */
function Axes({ W, H, pad, xLabel, yLabel }) {
  return (
    <g>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={AXIS} />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke={AXIS} />
      {xLabel && <text x={W / 2} y={H - 6} fontSize="11" textAnchor="middle" fill={AXIS}>{xLabel}</text>}
      {yLabel && (
        <text x={12} y={H / 2} fontSize="11" textAnchor="middle" fill={AXIS}
              transform={`rotate(-90 12 ${H / 2})`}>{yLabel}</text>
      )}
    </g>
  );
}

export default Visual;
