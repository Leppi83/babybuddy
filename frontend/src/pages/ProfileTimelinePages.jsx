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

// Minimal fallback for General Page during transition
export function ChildGeneralPage({ bootstrap }) {
  const s = bootstrap.strings || {};
  return <div className="p-8 text-slate-400 text-center glass-card">Child General Page (Pending Tailwind Port)</div>;
}
