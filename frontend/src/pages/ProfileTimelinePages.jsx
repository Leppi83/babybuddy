// frontend/src/pages/ProfileTimelinePages.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  StarOutlined,
  SmileOutlined,
  SoundOutlined,
  TeamOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

const STATUS_COLOR = {
  completed: "#52c41a",
  due: "#4db6ff",
  overdue: "#ff4d4f",
  upcoming: "#888888",
};

const MILESTONE_ICON = {
  first_word: <SoundOutlined />,
  first_turn: <TeamOutlined />,
  first_walk: <RocketOutlined />,
  first_smile: <SmileOutlined />,
  first_tooth: <StarOutlined />,
  custom: <StarOutlined />,
};

const MILESTONE_COLOR = {
  first_word: "#69b1ff",
  first_turn: "#b37feb",
  first_walk: "#5cdb8b",
  first_smile: "#ffd666",
  first_tooth: "#ff7875",
  custom: "#4db6ff",
};

// ── Age-appropriate silhouette SVGs ──────────────────────────────────────────
// All drawn in a 32×100 normalized coordinate space, then scaled.

function SwaddledBaby({ scale, color }) {
  // 0–6 months: round head + cocoon bundle body
  return (
    <g transform={`scale(${scale})`}>
      {/* Head */}
      <ellipse cx={16} cy={13} rx={10} ry={11} fill={color} />
      {/* Swaddle bundle */}
      <path
        d="M 6 23 Q 2 36 2 52 Q 2 72 16 75 Q 30 72 30 52 Q 30 36 26 23 Z"
        fill={color}
      />
      {/* Wrap crease lines */}
      <path d="M 5 40 Q 16 44 27 40" stroke={color} strokeWidth={1.5} fill="none" opacity={0.6} />
      <path d="M 4 54 Q 16 58 28 54" stroke={color} strokeWidth={1.5} fill="none" opacity={0.6} />
    </g>
  );
}

function ToddlerMale({ scale, color }) {
  // 6mo–3y male: round head, barrel chest, short arms down, short legs
  return (
    <g transform={`scale(${scale})`}>
      {/* Head */}
      <ellipse cx={16} cy={11} rx={10} ry={11} fill={color} />
      {/* Body */}
      <path d="M 10 22 Q 8 24 8 26 L 8 50 L 24 50 L 24 26 Q 24 24 22 22 Z" fill={color} />
      {/* Left arm */}
      <path d="M 8 27 L 3 44 L 6 45 L 10 31 Z" fill={color} />
      {/* Right arm */}
      <path d="M 24 27 L 29 44 L 26 45 L 22 31 Z" fill={color} />
      {/* Left leg */}
      <path d="M 10 50 L 9 82 L 15 82 L 16 62 Z" fill={color} />
      {/* Right leg */}
      <path d="M 22 50 L 23 82 L 17 82 L 16 62 Z" fill={color} />
    </g>
  );
}

function ToddlerFemale({ scale, color }) {
  // 6mo–3y female: same as male but slightly wider hips
  return (
    <g transform={`scale(${scale})`}>
      {/* Head */}
      <ellipse cx={16} cy={11} rx={10} ry={11} fill={color} />
      {/* Body with wider hips */}
      <path d="M 10 22 Q 8 24 8 26 L 7 46 Q 7 50 16 51 Q 25 50 25 46 L 24 26 Q 24 24 22 22 Z" fill={color} />
      {/* Left arm */}
      <path d="M 8 27 L 3 44 L 6 45 L 10 31 Z" fill={color} />
      {/* Right arm */}
      <path d="M 24 27 L 29 44 L 26 45 L 22 31 Z" fill={color} />
      {/* Left leg */}
      <path d="M 10 51 L 9 82 L 15 82 L 16 63 Z" fill={color} />
      {/* Right leg */}
      <path d="M 22 51 L 23 82 L 17 82 L 16 63 Z" fill={color} />
    </g>
  );
}

function ChildMale({ scale, color }) {
  // 3y+ male: arms extended horizontally, straight silhouette
  return (
    <g transform={`scale(${scale})`}>
      {/* Head */}
      <ellipse cx={16} cy={9} rx={9} ry={9} fill={color} />
      {/* Body */}
      <path d="M 12 18 L 11 54 L 21 54 L 20 18 Z" fill={color} />
      {/* Left arm (horizontal) */}
      <path d="M 11 24 L 0 34 L 1 39 L 12 30 Z" fill={color} />
      {/* Right arm (horizontal) */}
      <path d="M 21 24 L 32 34 L 31 39 L 20 30 Z" fill={color} />
      {/* Left leg */}
      <path d="M 12 54 L 10 90 L 15 90 L 16 66 Z" fill={color} />
      {/* Right leg */}
      <path d="M 20 54 L 22 90 L 17 90 L 16 66 Z" fill={color} />
    </g>
  );
}

function ChildFemale({ scale, color }) {
  // 3y+ female: arms extended, slight waist
  return (
    <g transform={`scale(${scale})`}>
      {/* Head */}
      <ellipse cx={16} cy={9} rx={9} ry={9} fill={color} />
      {/* Body with slight waist */}
      <path d="M 12 18 Q 11 30 10 38 Q 10 46 10 54 Q 13 58 16 58 Q 19 58 22 54 Q 22 46 22 38 Q 21 30 20 18 Z" fill={color} />
      {/* Left arm (horizontal) */}
      <path d="M 10 24 L 0 34 L 1 39 L 11 30 Z" fill={color} />
      {/* Right arm (horizontal) */}
      <path d="M 22 24 L 32 34 L 31 39 L 21 30 Z" fill={color} />
      {/* Left leg */}
      <path d="M 12 58 L 10 90 L 15 90 L 16 68 Z" fill={color} />
      {/* Right leg */}
      <path d="M 20 58 L 22 90 L 17 90 L 16 68 Z" fill={color} />
    </g>
  );
}

function ChildSilhouette({ heightPx, color = "rgba(77,182,255,0.35)", ageMonths = 36, gender = "unknown" }) {
  const scale = heightPx / 100;
  const isFemale = gender === "female";

  if (ageMonths < 6) {
    return <SwaddledBaby scale={scale} color={color} />;
  } else if (ageMonths < 36) {
    return isFemale
      ? <ToddlerFemale scale={scale} color={color} />
      : <ToddlerMale scale={scale} color={color} />;
  } else {
    return isFemale
      ? <ChildFemale scale={scale} color={color} />
      : <ChildMale scale={scale} color={color} />;
  }
}

// ── Timeline SVG canvas ───────────────────────────────────────────────────────
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
  const ageMonthsTotal = today.diff(birthDate, "month");

  // Min-width proportional to age shown
  const totalMonths = endDate.diff(birthDate, "month");
  const minWidth = Math.max(600, Math.ceil(totalMonths * 14));
  const svgWidth = Math.max(containerW, minWidth);

  const hasHeightData = heightMeasurements.length > 0;
  const silhouetteMaxH = 120;
  // axisY: vertical position of the timeline axis line
  // Needs enough space for: exam labels (staggered at examY-20 and examY-33 above examY=axisY-28)
  // Min needed: axisY - 28 - 33 = axisY - 61 >= 10 → axisY >= 71
  // When no height data, just reserve space for exam labels + today text
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

  // 6-month ticks with actual date labels
  const sixMonthTicks = [];
  for (let m = 0; m <= totalMonths + 6; m += 6) {
    const td = birthDate.add(m, "month");
    if (td.isAfter(endDate.add(1, "day"))) break;
    const label =
      m === 0
        ? strings.born || "Birth"
        : `${td.format("DD.MM.YY")} (${m} months)`;
    sixMonthTicks.push({ x: dateToX(td), label });
  }

  // Silhouette reference height
  const maxMeasuredCm = heightMeasurements.length
    ? Math.max(...heightMeasurements.map((h) => h.cm))
    : 0;
  const refCm = Math.max(maxMeasuredCm, 60);
  const gender = childDetail.gender || "unknown";

  return (
    <div ref={containerRef} style={{ width: "100%", overflowX: "auto" }}>
      <svg width={svgWidth} height={svgH} style={{ display: "block", minWidth }}>
        {/* Main axis */}
        <line x1={pad.left} y1={axisY} x2={pad.left + usableW} y2={axisY} stroke="#555" strokeWidth={1.5} />

        {/* 6-month ticks + labels */}
        {sixMonthTicks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} y1={axisY - 8} x2={t.x} y2={axisY + 8} stroke="#888" strokeWidth={1} />
            <text
              x={t.x}
              y={axisY + 22}
              textAnchor="middle"
              fontSize={i === 0 ? 11 : 10}
              fill="#888"
              transform={i > 0 ? `rotate(-35, ${t.x}, ${axisY + 22})` : undefined}
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Today marker */}
        <g>
          <line x1={todayX} y1={pad.top} x2={todayX} y2={axisY + 44} stroke="#4db6ff" strokeWidth={1} strokeDasharray="4,3" />
          <text x={todayX} y={Math.max(axisY - silhouetteMaxH - 6, pad.top + 12)} textAnchor="middle" fontSize={10} fill="#4db6ff">{strings.today || "Today"}</text>
        </g>

        {/* Silhouettes at each height measurement — bottom-anchored to axis */}
        {heightMeasurements.map((h, i) => {
          const hPx = (h.cm / refCm) * silhouetteMaxH;
          const scale = hPx / 100;
          const silW = 32 * scale;
          const cx = dateToX(h.date);
          const alpha = 0.22 + (i / Math.max(heightMeasurements.length - 1, 1)) * 0.58;
          const silTop = axisY - hPx;
          const ageAtMeasure = dayjs(h.date).diff(birthDate, "month");
          return (
            <Tooltip key={i} title={`${Math.round(h.cm)} cm — ${dayjs(h.date).format("DD.MM.YYYY")}`}>
              <g style={{ cursor: "default" }}>
                <g transform={`translate(${cx - silW / 2}, ${silTop})`}>
                  <ChildSilhouette
                    heightPx={hPx}
                    color={`rgba(77,182,255,${alpha.toFixed(2)})`}
                    ageMonths={ageAtMeasure}
                    gender={gender}
                  />
                </g>
                <text x={cx} y={silTop - 4} textAnchor="middle" fontSize={9} fill="#4db6ff">
                  {Math.round(h.cm)} cm
                </text>
              </g>
            </Tooltip>
          );
        })}

        {/* Examination markers (above axis) */}
        {examinationMarkers.map((exam, i) => {
          const midDays = (exam.ageMinDays + exam.ageMaxDays) / 2;
          const ex = pad.left + (Math.min(midDays, totalDays) / totalDays) * usableW;
          const color = STATUS_COLOR[exam.status] || "#888";
          return (
            <g key={i} style={{ cursor: "pointer" }} onClick={() => (window.location.href = exam.url)}>
              <line x1={ex} y1={examY} x2={ex} y2={axisY} stroke={color} strokeWidth={1} strokeDasharray="2,2" />
              <polygon
                points={`${ex},${examY - 8} ${ex + 6},${examY} ${ex},${examY + 8} ${ex - 6},${examY}`}
                fill={color}
                opacity={0.85}
              />
              <title>{exam.code} — {exam.name} ({exam.status})</title>
            </g>
          );
        })}

        {/* Examination code labels (staggered) */}
        {examinationMarkers.map((exam, i) => {
          const midDays = (exam.ageMinDays + exam.ageMaxDays) / 2;
          const ex = pad.left + (Math.min(midDays, totalDays) / totalDays) * usableW;
          const color = STATUS_COLOR[exam.status] || "#888";
          const yOffset = i % 2 === 0 ? examY - 20 : examY - 33;
          return (
            <text key={i} x={ex} y={yOffset} textAnchor="middle" fontSize={9} fill={color} fontWeight="600">
              {exam.code}
            </text>
          );
        })}

        {/* Milestone markers (below axis) */}
        {milestones.map((m, i) => {
          const mx = dateToX(m.date);
          const color = MILESTONE_COLOR[m.type] || "#4db6ff";
          const yOff = milestoneY + (i % 2) * 20;
          return (
            <g key={i} style={{ cursor: "pointer" }} onClick={() => (window.location.href = m.editUrl)}>
              <line x1={mx} y1={axisY} x2={mx} y2={yOff - 5} stroke={color} strokeWidth={1} strokeDasharray="2,2" />
              <circle cx={mx} cy={yOff} r={5} fill={color} opacity={0.85} />
              <text x={mx} y={yOff + 15} textAnchor="middle" fontSize={9} fill={color}>{m.title}</text>
              <title>{m.title}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
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

  const birthDate = childDetail.birthDate ? dayjs(childDetail.birthDate) : null;

  async function handleDeleteMilestone(id) {
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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 12px 80px" }}>
      {/* Timeline SVG */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: "8px 4px" } }}
      >
        <TimelineSVG
          childDetail={childDetail}
          heightMeasurements={heightMeasurements}
          examinationMarkers={examinationMarkers}
          milestones={milestones}
          strings={strings}
        />
      </Card>

      {/* Milestones list */}
      <Card
        size="small"
        title={strings.milestones || "Milestones"}
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} href={urls.addMilestone}>
            {strings.addMilestone || "Add"}
          </Button>
        }
      >
        {milestones.length === 0 ? (
          <Text type="secondary">{strings.noData || "No milestones recorded yet."}</Text>
        ) : (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            {milestones.map((m) => (
              <div
                key={m.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}
              >
                <Space size={8}>
                  <span style={{ color: MILESTONE_COLOR[m.type] || "#4db6ff", fontSize: 16 }}>
                    {MILESTONE_ICON[m.type] || <StarOutlined />}
                  </span>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{m.title}</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      {dayjs(m.date).format("DD.MM.YYYY")}
                    </Text>
                  </div>
                </Space>
                <Space size={4}>
                  <Button type="text" size="small" icon={<EditOutlined />} href={m.editUrl} style={{ color: "#4db6ff" }} />
                  <Popconfirm
                    title={strings.delete || "Delete this milestone?"}
                    onConfirm={() => handleDeleteMilestone(m.id)}
                    okButtonProps={{ danger: true, size: "small" }}
                    cancelButtonProps={{ size: "small" }}
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </Space>
        )}
      </Card>
    </div>
  );
}

// ── General Growth / Percentile Page ────────────────────────────────────────

const PERC_COLORS = {
  p3:  { stroke: "#666", dash: "4,3", label: "P3" },
  p15: { stroke: "#4db6ff", dash: "3,2", label: "P15" },
  p50: { stroke: "#52c41a", dash: null, label: "P50" },
  p85: { stroke: "#4db6ff", dash: "3,2", label: "P85" },
  p97: { stroke: "#666", dash: "4,3", label: "P97" },
};

function PercentileChart({ title, percData, measurements, birthDate, yLabel, color = "#ffd666" }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth || 600));
    ro.observe(el);
    setContainerW(el.clientWidth || 600);
    return () => ro.disconnect();
  }, []);

  if (!percData || percData.length === 0) return null;

  const birth = dayjs(birthDate);
  const svgW = containerW;
  const svgH = 260;
  const pad = { left: 52, right: 20, top: 16, bottom: 44 };
  const usableW = svgW - pad.left - pad.right;
  const usableH = svgH - pad.top - pad.bottom;

  // X domain: 0 to max days in percentile data
  const maxDays = percData[percData.length - 1].days;
  const maxMonths = Math.ceil(maxDays / 30.44);

  // Y domain: min p3 to max p97
  const allValues = percData.flatMap((r) => [r.p3, r.p97]);
  const measValues = measurements.map((m) => m.value);
  const yMin = Math.floor(Math.min(...allValues, ...measValues) * 0.97);
  const yMax = Math.ceil(Math.max(...allValues, ...measValues) * 1.02);

  function xScale(days) {
    return pad.left + (days / maxDays) * usableW;
  }
  function yScale(val) {
    return pad.top + usableH - ((val - yMin) / (yMax - yMin)) * usableH;
  }

  function polyline(key) {
    return percData.map((r) => `${xScale(r.days).toFixed(1)},${yScale(r[key]).toFixed(1)}`).join(" ");
  }

  // X-axis ticks: every 6 months
  const xTicks = [];
  for (let m = 0; m <= maxMonths; m += 6) {
    const days = m * 30.44;
    if (days > maxDays + 15) break;
    xTicks.push({ x: xScale(days), label: m === 0 ? "0" : `${m}m` });
  }

  // Y-axis ticks: ~5 ticks
  const yStep = Math.ceil((yMax - yMin) / 5 / 5) * 5;
  const yTicks = [];
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
    yTicks.push({ y: yScale(v), label: v });
  }

  // Shade band between p15 and p85
  const bandPoints =
    percData.map((r) => `${xScale(r.days).toFixed(1)},${yScale(r.p85).toFixed(1)}`).join(" ") +
    " " +
    [...percData].reverse().map((r) => `${xScale(r.days).toFixed(1)},${yScale(r.p15).toFixed(1)}`).join(" ");

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13 }}>{title}</div>
      <svg width={svgW} height={svgH} style={{ display: "block" }}>
        {/* P15–P85 shaded band */}
        <polygon points={bandPoints} fill={color} opacity={0.10} />

        {/* Percentile curves */}
        {["p3", "p15", "p50", "p85", "p97"].map((k) => {
          const cfg = PERC_COLORS[k];
          return (
            <polyline
              key={k}
              points={polyline(k)}
              fill="none"
              stroke={cfg.stroke}
              strokeWidth={k === "p50" ? 1.5 : 1}
              strokeDasharray={cfg.dash || undefined}
              opacity={0.7}
            />
          );
        })}

        {/* Measurement dots */}
        {measurements.map((m, i) => {
          const ageDays = dayjs(m.date).diff(birth, "day");
          const cx = xScale(ageDays);
          const cy = yScale(m.value);
          return (
            <Tooltip key={i} title={`${m.value} ${yLabel} — ${dayjs(m.date).format("DD.MM.YYYY")}`}>
              <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1} style={{ cursor: "default" }} />
            </Tooltip>
          );
        })}
        {/* Connect measurement dots */}
        {measurements.length > 1 && (
          <polyline
            points={measurements
              .map((m) => {
                const ageDays = dayjs(m.date).diff(birth, "day");
                return `${xScale(ageDays).toFixed(1)},${yScale(m.value).toFixed(1)}`;
              })
              .join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.8}
          />
        )}

        {/* X-axis */}
        <line x1={pad.left} y1={pad.top + usableH} x2={pad.left + usableW} y2={pad.top + usableH} stroke="#555" strokeWidth={1} />
        {xTicks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} y1={pad.top + usableH} x2={t.x} y2={pad.top + usableH + 4} stroke="#666" />
            <text x={t.x} y={pad.top + usableH + 16} textAnchor="middle" fontSize={10} fill="#888">{t.label}</text>
          </g>
        ))}

        {/* Y-axis */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + usableH} stroke="#555" strokeWidth={1} />
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.left - 4} y1={t.y} x2={pad.left} y2={t.y} stroke="#666" />
            <text x={pad.left - 6} y={t.y + 4} textAnchor="end" fontSize={10} fill="#888">{t.label}</text>
          </g>
        ))}

        {/* Percentile labels at right edge */}
        {["p3", "p15", "p50", "p85", "p97"].map((k) => {
          const last = percData[percData.length - 1];
          const cfg = PERC_COLORS[k];
          return (
            <text key={k} x={pad.left + usableW + 3} y={yScale(last[k]) + 4} fontSize={9} fill={cfg.stroke}>
              {cfg.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function ChildGeneralPage({ bootstrap }) {
  const {
    childDetail = {},
    heights = [],
    weights = [],
    bmiEntries = [],
    heightPercentiles = [],
    weightPercentiles = [],
    strings = {},
    urls = {},
  } = bootstrap;

  const birthDate = childDetail.birthDate;

  const heightMeas = heights.map((h) => ({ date: h.date, value: h.cm }));
  const weightMeas = weights.map((w) => ({ date: w.date, value: w.kg }));
  const bmiMeas = bmiEntries.map((b) => ({ date: b.date, value: b.bmi }));

  const heightColumns = [
    { title: strings.date || "Date", dataIndex: "date", key: "date", render: (v) => dayjs(v).format("DD.MM.YYYY") },
    { title: strings.cm || "cm", dataIndex: "cm", key: "cm", render: (v) => v.toFixed(1) },
  ];
  const weightColumns = [
    { title: strings.date || "Date", dataIndex: "date", key: "date", render: (v) => dayjs(v).format("DD.MM.YYYY") },
    { title: strings.kg || "kg", dataIndex: "kg", key: "kg", render: (v) => v.toFixed(2) },
  ];
  const bmiColumns = [
    { title: strings.date || "Date", dataIndex: "date", key: "date", render: (v) => dayjs(v).format("DD.MM.YYYY") },
    { title: "BMI", dataIndex: "bmi", key: "bmi" },
  ];

  const tabItems = [
    {
      key: "height",
      label: strings.height || "Height",
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {birthDate && heightPercentiles.length > 0 && (
            <PercentileChart
              title={`${strings.height || "Height"} (cm) — ${strings.percentiles || "Percentiles"}`}
              percData={heightPercentiles}
              measurements={heightMeas}
              birthDate={birthDate}
              yLabel="cm"
              color="#4db6ff"
            />
          )}
          <Table
            dataSource={heights}
            columns={heightColumns}
            rowKey="date"
            size="small"
            pagination={false}
            locale={{ emptyText: strings.noData || "No data" }}
          />
        </Space>
      ),
    },
    {
      key: "weight",
      label: strings.weight || "Weight",
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {birthDate && weightPercentiles.length > 0 && (
            <PercentileChart
              title={`${strings.weight || "Weight"} (kg) — ${strings.percentiles || "Percentiles"}`}
              percData={weightPercentiles}
              measurements={weightMeas}
              birthDate={birthDate}
              yLabel="kg"
              color="#69b1ff"
            />
          )}
          <Table
            dataSource={weights}
            columns={weightColumns}
            rowKey="date"
            size="small"
            pagination={false}
            locale={{ emptyText: strings.noData || "No data" }}
          />
        </Space>
      ),
    },
    {
      key: "bmi",
      label: "BMI",
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {bmiEntries.length === 0 ? (
            <Typography.Text type="secondary">{strings.noData || "No data recorded yet."}</Typography.Text>
          ) : (
            <Table
              dataSource={bmiEntries}
              columns={bmiColumns}
              rowKey="date"
              size="small"
              pagination={false}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px 12px 80px" }}>
      <Card size="small">
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
