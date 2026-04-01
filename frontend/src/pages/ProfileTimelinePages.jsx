import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { Plus, Edit2, Trash2, Megaphone, Users, Rocket, Smile, Hash, Star } from "lucide-react";

const MILESTONE_ICON = {
  first_word: <Megaphone size={16} />,
  first_turn: <Users size={16} />,
  first_walk: <Rocket size={16} />,
  first_smile: <Smile size={16} />,
  first_tooth: <Hash size={16} />,
  custom: <Star size={16} />,
};

const MILESTONE_COLOR = {
  first_word: "#38bdf8",
  first_turn: "#818cf8",
  first_walk: "#34d399",
  first_smile: "#fbbf24",
  first_tooth: "#f87171",
  custom: "#38bdf8",
};

const STATUS_COLOR = {
  completed: "#10b981", // Emerald
  due: "#38bdf8", // Sky
  overdue: "#f43f5e", // Rose
  upcoming: "#64748b", // Slate
};

// Reusable SVG Neon Silhouette (Clean Line Art + Geometric Accessories)
function NeonSilhouette({ heightPx, cx, cy, label, gender = 'female', alpha = 0.8 }) {
  const scale = heightPx / 100;
  const isFemale = gender === 'female';
  const color = isFemale ? "#38bdf8" : "#818cf8"; 
  const shadowColor = isFemale ? "rgba(56,189,248,0.6)" : "rgba(99,102,241,0.6)";

  return (
    <g transform={`translate(${cx}, ${cy - heightPx})`} style={{ opacity: alpha }}>
      <text x={0} y={-10} textAnchor="middle" fontSize={11} fontWeight={600} fill={color} className={`drop-shadow-[0_0_4px_${shadowColor}]`}>
        {label}
      </text>
      
      <g transform={`scale(${scale})`}>
        <g transform="translate(-16, 0)">
          {isFemale && (
             <path d="M16,1 L23,-2 L24,3 Z M16,1 L9,-2 L8,3 Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill="none" className={`drop-shadow-[0_0_8px_${shadowColor}]`} />
          )}

          <circle cx={16} cy={10} r={8} stroke={color} strokeWidth={1.5} fill={isFemale ? "rgba(56,189,248,0.05)" : "rgba(99,102,241,0.05)"} className={`drop-shadow-[0_0_8px_${shadowColor}]`} />
          
          <path
            d="M20,18 C25,18 28,21 28,26 C28,30 25,32 23,32 C23,38 23,45 23,48 C23,50 21,52 19,52 L17,52 L17,40 L15,40 L15,52 L13,52 C11,52 9,50 9,48 C9,45 9,38 9,32 C7,32 4,30 4,26 C4,21 7,18 12,18 Z"
            stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill={isFemale ? "rgba(56,189,248,0.05)" : "rgba(99,102,241,0.05)"} className={`drop-shadow-[0_0_8px_${shadowColor}]`}
          />
        </g>
      </g>
    </g>
  );
}

function TimelineSVG({ childDetail, heightMeasurements, examinationMarkers, milestones, strings }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth || 800));
    ro.observe(el);
    setContainerW(el.clientWidth || 800);
    return () => ro.disconnect();
  }, []);

  if (!childDetail.birthDate) return null;

  const birthDate = dayjs(childDetail.birthDate);
  const today = dayjs();
  const endDate = today.add(2, "month");
  const totalDays = endDate.diff(birthDate, "day");

  const totalMonths = endDate.diff(birthDate, "month");
  const minWidth = Math.max(600, Math.ceil(totalMonths * 14));
  const svgWidth = Math.max(containerW, minWidth);

  const hasHeightData = heightMeasurements.length > 0;
  const silhouetteMaxH = 120;
  const axisY = hasHeightData ? silhouetteMaxH + 60 : 80;
  const pad = { left: 48, right: 32, top: 10, bottom: 60 };
  const usableW = svgWidth - pad.left - pad.right;
  const examY = axisY - 28;
  const milestoneY = axisY + 32;
  const svgH = axisY + 110;

  function dateToX(d) {
    const days = dayjs(d).diff(birthDate, "day");
    return pad.left + (Math.min(Math.max(days, 0), totalDays) / totalDays) * usableW;
  }

  const todayX = dateToX(today);

  const sixMonthTicks = [];
  for (let m = 0; m <= totalMonths + 6; m += 6) {
    const td = birthDate.add(m, "month");
    if (td.isAfter(endDate.add(1, "day"))) break;
    sixMonthTicks.push({ x: dateToX(td), label: m === 0 ? (strings.born || "Birth") : `${td.format("DD.MM.YY")} (${m} months)` });
  }

  const maxMeasuredCm = heightMeasurements.length ? Math.max(...heightMeasurements.map((h) => h.cm)) : 0;
  const refCm = Math.max(maxMeasuredCm, 60);
  const gender = childDetail.gender || "unknown";

  return (
    <div ref={containerRef} className="w-full overflow-x-auto custom-scrollbar pb-6 pt-4">
      <svg width={svgWidth} height={svgH} style={{ display: "block", minWidth }}>
        
        <line x1={pad.left} y1={axisY} x2={pad.left + usableW} y2={axisY} stroke="#475569" strokeWidth={2} />

        {sixMonthTicks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} y1={axisY - 8} x2={t.x} y2={axisY + 8} stroke="#64748b" strokeWidth={1} />
            <text x={t.x} y={axisY + 22} textAnchor="middle" fontSize={10} fill="#94a3b8" transform={i > 0 ? `rotate(-30, ${t.x}, ${axisY + 22})` : undefined}>
              {t.label}
            </text>
          </g>
        ))}

        <g>
          <line x1={todayX} y1={pad.top} x2={todayX} y2={axisY + 44} stroke="#38bdf8" strokeWidth={1} strokeDasharray="4,4" className="drop-shadow-[0_0_4px_rgba(56,189,248,0.5)]" />
          <text x={todayX} y={Math.max(axisY - silhouetteMaxH - 6, pad.top + 12)} textAnchor="middle" fontSize={10} fill="#38bdf8" fontWeight="bold">{strings.today || "Today"}</text>
        </g>

        {heightMeasurements.map((h, i) => {
          const hPx = (h.cm / refCm) * silhouetteMaxH;
          const cx = dateToX(h.date);
          const alpha = 0.22 + (i / Math.max(heightMeasurements.length - 1, 1)) * 0.58;
          return <NeonSilhouette key={i} heightPx={hPx} cx={cx} cy={axisY} label={`${Math.round(h.cm)} cm`} gender={gender} alpha={alpha} />;
        })}

        {examinationMarkers.map((exam, i) => {
          const midDays = (exam.ageMinDays + exam.ageMaxDays) / 2;
          const ex = pad.left + (Math.min(midDays, totalDays) / totalDays) * usableW;
          const color = STATUS_COLOR[exam.status] || "#64748b";
          const yOffset = i % 2 === 0 ? examY - 20 : examY - 33;
          return (
            <g key={`exam-${i}`} style={{ cursor: "pointer" }} onClick={() => (window.location.href = exam.url)}>
              <line x1={ex} y1={examY} x2={ex} y2={axisY} stroke={color} strokeWidth={1} strokeDasharray="2,2" />
              <polygon points={`${ex},${examY - 8} ${ex + 6},${examY} ${ex},${examY + 8} ${ex - 6},${examY}`} fill={color} opacity={0.3} stroke={color} />
              <text x={ex} y={yOffset} textAnchor="middle" fontSize={9} fill={color} fontWeight="bold">{exam.code}</text>
            </g>
          );
        })}

        {milestones.map((m, i) => {
          const mx = dateToX(m.date);
          const color = MILESTONE_COLOR[m.type] || "#38bdf8";
          const yOff = milestoneY + (i % 2) * 20;
          return (
            <g key={`ms-${i}`} style={{ cursor: "pointer" }} onClick={() => (window.location.href = m.editUrl)}>
              <line x1={mx} y1={axisY} x2={mx} y2={yOff - 5} stroke={color} strokeWidth={1} strokeDasharray="2,2" />
              <circle cx={mx} cy={yOff} r={4} fill={color} className={`drop-shadow-[0_0_6px_${color}]`} />
              <text x={mx} y={yOff + 14} textAnchor="middle" fontSize={9} fill={color}>{m.title}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ChildProfileTimelinePage({ bootstrap }) {
  const {
    childDetail = {},
    heightMeasurements = [],
    examinationMarkers = [],
    milestones: initialMilestones = [],
    strings = {},
    urls = {},
    csrfToken = "",
  } = bootstrap;

  const [milestones, setMilestones] = useState(initialMilestones);

  async function handleDeleteMilestone(id) {
    if (!window.confirm(strings.delete || "Delete this milestone?")) return;
    const m = milestones.find((x) => x.id === id);
    if (!m) return;
    await fetch(m.deleteUrl, {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken, "Content-Type": "application/x-www-form-urlencoded" },
      body: "csrfmiddlewaretoken=" + encodeURIComponent(csrfToken),
    });
    setMilestones((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-10">
      
      <div className="glass-card p-6 border border-white/5">
        <TimelineSVG childDetail={childDetail} heightMeasurements={heightMeasurements} examinationMarkers={examinationMarkers} milestones={milestones} strings={strings} />
      </div>

      <div className="glass-card p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
            <h3 className="text-xl font-bold tracking-tight text-white">{strings.milestones || "Milestones"}</h3>
            <a href={urls.addMilestone} className="bg-sky-500/20 border border-sky-500/50 text-sky-400 px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)] hover:bg-sky-500/30 hover:scale-105 transition-all flex items-center gap-2">
              <Plus size={16} /> {strings.addMilestone || "Add"}
            </a>
          </div>
          
          <div className="flex flex-col gap-4">
             {milestones.length === 0 ? (
               <p className="text-slate-500">{strings.noData || "No milestones recorded yet."}</p>
             ) : milestones.map((m) => {
               const IconComponent = MILESTONE_ICON[m.type] || <Star size={16} />;
               const colorId = MILESTONE_COLOR[m.type] || "#38bdf8";

               return (
                 <div key={m.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                       <div style={{ color: colorId }} className={`drop-shadow-[0_0_8px_${colorId}]`}>
                          {IconComponent}
                       </div>
                       <div>
                         <span className="font-bold text-slate-200">{m.title}</span>
                         <span className="text-slate-500 text-sm ml-3 text-xs">{dayjs(m.date).format("DD.MM.YYYY")}</span>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <a href={m.editUrl} className="text-sky-400 p-2 hover:bg-sky-500/20 rounded-lg transition-colors"><Edit2 size={16} /></a>
                       <button onClick={() => handleDeleteMilestone(m.id)} className="text-rose-400 p-2 hover:bg-rose-500/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                 </div>
               );
             })}
          </div>
      </div>
    </div>
  );
}

/* ── SVG Growth Chart ─────────────────────────────────────────── */
function GrowthChart({ title, measurements, percentiles, yLabel, valueKey, color, birthDate }) {
  const containerRef = useRef(null);
  const [w, setW] = useState(400);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 400));
    ro.observe(el);
    setW(el.clientWidth || 400);
    return () => ro.disconnect();
  }, []);

  if (measurements.length === 0) {
    return (
      <div className="glass-card p-5">
        <h4 className="text-sm font-bold text-slate-300 mb-2 tracking-wide">{title}</h4>
        <p className="text-slate-500 text-sm py-6 text-center">—</p>
      </div>
    );
  }

  const pad = { l: 38, r: 12, t: 12, b: 36 };
  const H = 200;
  const W = w;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  // X axis: days from birth
  const refDate = birthDate ? dayjs(birthDate) : dayjs(measurements[0].date);
  const xFromDate = (d) => dayjs(d).diff(refDate, "day");
  const measDays = measurements.map(m => xFromDate(m.date));
  const percDays = percentiles.map(p => p.days);
  const allDays = [...measDays, ...percDays];
  const xMin = 0;
  const xMax = allDays.length ? Math.max(...allDays) + 30 : 100;

  const allVals = measurements.map(m => m[valueKey]);
  const percVals = percentiles.flatMap(p => [p.p3, p.p97]).filter(Boolean);
  const yMin = Math.floor(Math.min(...allVals, ...percVals) * 0.97);
  const yMax = Math.ceil(Math.max(...allVals, ...percVals) * 1.03);

  const sx = (day) => pad.l + ((day - xMin) / (xMax - xMin)) * innerW;
  const sy = (val) => pad.t + innerH - ((val - yMin) / (yMax - yMin)) * innerH;

  // Percentile band path
  const bandPath = (pLow, pHigh) => {
    if (!percentiles.length) return "";
    const top = percentiles.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.days).toFixed(1)},${sy(p[pLow]).toFixed(1)}`).join(" ");
    const bot = [...percentiles].reverse().map((p) => `L${sx(p.days).toFixed(1)},${sy(p[pHigh]).toFixed(1)}`).join(" ");
    return `${top} ${bot} Z`;
  };

  const linePath = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");

  const measPts = measurements.map(m => ({ x: xFromDate(m.date), y: m[valueKey] }));
  const p50pts = percentiles.map(p => ({ x: p.days, y: p.p50 }));

  // Y axis ticks
  const yTicks = [];
  const step = Math.ceil((yMax - yMin) / 4);
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) yTicks.push(v);

  // X axis ticks (every 6 months = ~182 days)
  const xTicks = [];
  for (let d = 0; d <= xMax; d += 182) xTicks.push(d);

  return (
    <div className="glass-card p-5">
      <h4 className="text-sm font-bold text-slate-300 mb-2 tracking-wide">{title}</h4>
      <div ref={containerRef} className="w-full">
        <svg width={W} height={H}>
          {/* Grid */}
          {yTicks.map(v => (
            <line key={v} x1={pad.l} y1={sy(v)} x2={pad.l + innerW} y2={sy(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          ))}

          {/* Percentile bands */}
          {percentiles.length > 0 && (
            <>
              <path d={bandPath("p3", "p97")} fill="rgba(56,189,248,0.07)" />
              <path d={bandPath("p15", "p85")} fill="rgba(56,189,248,0.09)" />
              <path d={linePath(p50pts)} fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth={1} strokeDasharray="3,3" />
            </>
          )}

          {/* Measurement line */}
          {measPts.length > 1 && <path d={linePath(measPts)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}

          {/* Measurement dots */}
          {measPts.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={color} />
          ))}

          {/* Y axis labels */}
          {yTicks.map(v => (
            <text key={v} x={pad.l - 4} y={sy(v) + 4} textAnchor="end" fontSize={9} fill="#64748b">{v}</text>
          ))}
          <text x={pad.l - 28} y={pad.t + innerH / 2} textAnchor="middle" fontSize={9} fill="#64748b" transform={`rotate(-90, ${pad.l - 28}, ${pad.t + innerH / 2})`}>{yLabel}</text>

          {/* X axis labels */}
          {xTicks.map(d => {
            const months = Math.round(d / 30.44);
            return (
              <text key={d} x={sx(d)} y={H - 4} textAnchor="middle" fontSize={9} fill="#64748b">{months}m</text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ── Exam status pill ─────────────────────────────────────────── */
const EXAM_STATUS_STYLE = {
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  due:       "bg-sky-500/15 text-sky-400 border-sky-500/30",
  overdue:   "bg-rose-500/15 text-rose-400 border-rose-500/30",
  upcoming:  "bg-slate-700/50 text-slate-400 border-slate-600/30",
};

export function ChildGeneralPage({ bootstrap }) {
  const {
    childDetail = {},
    heights = [],
    weights = [],
    bmiEntries = [],
    heightPercentiles = [],
    weightPercentiles = [],
    heightMeasurements = [],
    examinationMarkers = [],
    milestones: initialMilestones = [],
    strings: s = {},
    urls = {},
    csrfToken = "",
  } = bootstrap;

  const [milestones, setMilestones] = useState(initialMilestones);

  const birthDate = childDetail.birthDate ? dayjs(childDetail.birthDate) : null;
  const ageMonths = birthDate ? dayjs().diff(birthDate, "month") : null;
  const ageLabel = ageMonths !== null
    ? ageMonths < 24 ? `${ageMonths} months` : `${Math.floor(ageMonths / 12)}y ${ageMonths % 12}m`
    : "";

  async function handleDeleteMilestone(id) {
    if (!window.confirm(s.delete || "Delete this milestone?")) return;
    const m = milestones.find((x) => x.id === id);
    if (!m) return;
    await fetch(m.deleteUrl, {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken, "Content-Type": "application/x-www-form-urlencoded" },
      body: "csrfmiddlewaretoken=" + encodeURIComponent(csrfToken),
    });
    setMilestones((prev) => prev.filter((x) => x.id !== id));
  }

  const overdueExams   = examinationMarkers.filter(e => e.status === "overdue");
  const dueExams       = examinationMarkers.filter(e => e.status === "due");
  const upcomingExams  = examinationMarkers.filter(e => e.status === "upcoming");
  const completedExams = examinationMarkers.filter(e => e.status === "completed");

  return (
    <div className="flex flex-col gap-6 pb-10 w-full max-w-5xl mx-auto">

      {/* Child info header */}
      <div className="glass-panel p-6 md:p-8 rounded-[28px] flex items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-2xl font-bold flex-shrink-0">
          {childDetail.name?.[0] || "?"}
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">{childDetail.name}</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {birthDate && <span>{s.born || "Born"} {birthDate.format("DD.MM.YYYY")}</span>}
            {ageLabel && <span className="ml-3 text-sky-400 font-semibold">{ageLabel}</span>}
          </p>
        </div>
      </div>

      {/* Timeline SVG */}
      <div className="glass-card p-5">
        <h3 className="text-base font-bold text-white mb-1 tracking-tight">{s.milestones || "Timeline"}</h3>
        <TimelineSVG
          childDetail={childDetail}
          heightMeasurements={heightMeasurements}
          examinationMarkers={examinationMarkers}
          milestones={milestones}
          strings={s}
        />
      </div>

      {/* Growth Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <GrowthChart
          title={s.height || "Height"}
          measurements={heights}
          percentiles={heightPercentiles}
          yLabel={s.cm || "cm"}
          valueKey="cm"
          color="#38bdf8"
          birthDate={childDetail.birthDate}
        />
        <GrowthChart
          title={s.weight || "Weight"}
          measurements={weights}
          percentiles={weightPercentiles}
          yLabel={s.kg || "kg"}
          valueKey="kg"
          color="#a78bfa"
          birthDate={childDetail.birthDate}
        />
      </div>

      {/* U-Examinations */}
      {examinationMarkers.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-base font-bold text-white mb-4 tracking-tight">{s.examinations || "U-Examinations"}</h3>
          <div className="flex flex-col gap-2">
            {[...overdueExams, ...dueExams, ...upcomingExams, ...completedExams].map((exam, i) => (
              <a
                key={i}
                href={exam.url}
                className="flex items-center justify-between p-3 rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 hover:border-white/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-200 text-sm w-10">{exam.code}</span>
                  <span className="text-slate-400 text-sm truncate">{exam.name}</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${EXAM_STATUS_STYLE[exam.status] || EXAM_STATUS_STYLE.upcoming}`}>
                  {exam.status}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-white tracking-tight">{s.milestones || "Milestones"}</h3>
          {urls.addMilestone && (
            <a href={urls.addMilestone} className="bg-sky-500/20 border border-sky-500/40 text-sky-400 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-sky-500/30 transition-all flex items-center gap-1.5">
              <Plus size={14} /> {s.addMilestone || "Add"}
            </a>
          )}
        </div>
        {milestones.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">{s.noData || "No milestones recorded yet."}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {milestones.map((m) => {
              const color = MILESTONE_COLOR[m.type] || "#38bdf8";
              return (
                <div key={m.id} className="flex justify-between items-center p-3 bg-white/3 border border-white/5 rounded-xl hover:bg-white/8 transition-colors">
                  <div className="flex items-center gap-3">
                    <div style={{ color }} className="flex-shrink-0">{MILESTONE_ICON[m.type] || <Star size={16} />}</div>
                    <div>
                      <span className="font-semibold text-slate-200 text-sm">{m.title}</span>
                      <span className="text-slate-500 text-xs ml-3">{dayjs(m.date).format("DD.MM.YYYY")}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <a href={m.editUrl} className="text-sky-400 p-1.5 hover:bg-sky-500/20 rounded-lg transition-colors"><Edit2 size={14} /></a>
                    <button onClick={() => handleDeleteMilestone(m.id)} className="text-rose-400 p-1.5 hover:bg-rose-500/20 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
