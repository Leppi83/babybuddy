// frontend/src/pages/ProfileTimelinePages.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  DatePicker,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
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

const { Title, Text } = Typography;

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

// ── Silhouette SVG path (normalized to 1 unit tall) ──────────────────────────
// A simplified child silhouette: head + torso + legs, drawn to fit a 40×100 box.
function ChildSilhouette({ heightPx, color = "rgba(77,182,255,0.35)", x = 0 }) {
  const scale = heightPx / 100;
  const w = 40 * scale;
  const cx = x + w / 2;
  return (
    <g transform={`translate(${x}, 0) scale(${scale})`}>
      {/* Head */}
      <ellipse cx={20} cy={8} rx={8} ry={9} fill={color} />
      {/* Neck + torso */}
      <path
        d="M 15 17 Q 14 20 13 22 L 11 55 Q 18 58 20 58 Q 22 58 29 55 L 27 22 Q 26 20 25 17 Z"
        fill={color}
      />
      {/* Left arm */}
      <path d="M 13 24 Q 6 32 7 45 Q 9 48 11 47 Q 13 35 16 28 Z" fill={color} />
      {/* Right arm */}
      <path d="M 27 24 Q 34 32 33 45 Q 31 48 29 47 Q 27 35 24 28 Z" fill={color} />
      {/* Left leg */}
      <path d="M 13 54 Q 11 72 11 88 Q 13 92 16 92 Q 18 82 19 68 Z" fill={color} />
      {/* Right leg */}
      <path d="M 27 54 Q 29 72 29 88 Q 27 92 24 92 Q 22 82 21 68 Z" fill={color} />
    </g>
  );
}

// ── Timeline SVG canvas ───────────────────────────────────────────────────────
function TimelineSVG({ childDetail, heightMeasurements, examinationMarkers, milestones, strings }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(el.clientWidth, 600)));
    ro.observe(el);
    setWidth(Math.max(el.clientWidth, 600));
    return () => ro.disconnect();
  }, []);

  if (!childDetail.birthDate) return null;

  const birthDate = dayjs(childDetail.birthDate);
  const today = dayjs();
  const maxDate = birthDate.add(6, "year");
  const endDate = today.isBefore(maxDate) ? today : maxDate;
  const totalDays = endDate.diff(birthDate, "day");

  const pad = { left: 50, right: 30, top: 140, bottom: 60 };
  const usableW = width - pad.left - pad.right;
  const silhouetteMaxH = 110;
  const axisY = pad.top + silhouetteMaxH + 10;
  const examY = axisY - 24;
  const milestoneY = axisY + 28;
  const svgH = axisY + 100;

  function dateToX(d) {
    const days = dayjs(d).diff(birthDate, "day");
    return pad.left + (Math.min(Math.max(days, 0), totalDays) / totalDays) * usableW;
  }

  const todayX = dateToX(today);

  // Year ticks
  const yearTicks = [];
  for (let y = 0; y <= 6; y++) {
    const tickDate = birthDate.add(y, "year");
    if (tickDate.isAfter(endDate.add(10, "day"))) break;
    const tx = dateToX(tickDate);
    yearTicks.push({ x: tx, label: y === 0 ? strings.born || "Birth" : `${y}y` });
  }

  // Quarter ticks
  const quarterTicks = [];
  for (let m = 3; m <= 72; m += 3) {
    const td = birthDate.add(m, "month");
    if (td.isAfter(endDate)) break;
    const tx = dateToX(td);
    quarterTicks.push(tx);
  }

  // Tallest child height → scale silhouettes
  const maxMeasuredCm = heightMeasurements.length
    ? Math.max(...heightMeasurements.map((h) => h.cm))
    : 0;
  // A 6-year-old is roughly 110–120 cm. Scale to fit silhouetteMaxH.
  const refCm = Math.max(maxMeasuredCm, 60);

  return (
    <div ref={containerRef} style={{ width: "100%", overflowX: "auto" }}>
      <svg
        width={width}
        height={svgH}
        style={{ display: "block" }}
      >
        {/* Quarter sub-ticks */}
        {quarterTicks.map((tx, i) => (
          <line key={i} x1={tx} y1={axisY - 4} x2={tx} y2={axisY + 4} stroke="#333" strokeWidth={0.5} />
        ))}

        {/* Main axis */}
        <line x1={pad.left} y1={axisY} x2={pad.left + usableW} y2={axisY} stroke="#555" strokeWidth={1.5} />

        {/* Year ticks + labels */}
        {yearTicks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} y1={axisY - 7} x2={t.x} y2={axisY + 7} stroke="#888" strokeWidth={1} />
            <text x={t.x} y={axisY + 20} textAnchor="middle" fontSize={11} fill="#888">{t.label}</text>
          </g>
        ))}

        {/* Today marker */}
        {today.isBefore(maxDate) && (
          <g>
            <line x1={todayX} y1={pad.top - 10} x2={todayX} y2={axisY + 40} stroke="#4db6ff" strokeWidth={1} strokeDasharray="4,3" />
            <text x={todayX} y={pad.top - 14} textAnchor="middle" fontSize={10} fill="#4db6ff">{strings.today || "Today"}</text>
          </g>
        )}

        {/* Silhouettes at each height measurement — bottom-anchored to axis */}
        {heightMeasurements.map((h, i) => {
          const hPx = (h.cm / refCm) * silhouetteMaxH;
          const scale = hPx / 100;
          const silW = 40 * scale;
          const cx = dateToX(h.date);
          const alpha = 0.25 + (i / Math.max(heightMeasurements.length - 1, 1)) * 0.55;
          // bottom of silhouette (scale*100 tall) sits on axisY
          const silTop = axisY - hPx;
          return (
            <Tooltip key={i} title={`${Math.round(h.cm)} cm — ${dayjs(h.date).format("DD.MM.YYYY")}`}>
              <g style={{ cursor: "default" }}>
                <g transform={`translate(${cx - silW / 2}, ${silTop})`}>
                  <ChildSilhouette
                    heightPx={hPx}
                    color={`rgba(77,182,255,${alpha.toFixed(2)})`}
                    x={0}
                  />
                </g>
                <text x={cx} y={silTop - 3} textAnchor="middle" fontSize={9} fill="#4db6ff">
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
            <g key={i} style={{ cursor: "pointer" }} onClick={() => window.location.href = exam.url}>
              {/* Stem */}
              <line x1={ex} y1={examY} x2={ex} y2={axisY} stroke={color} strokeWidth={1} strokeDasharray="2,2" />
              {/* Diamond */}
              <polygon
                points={`${ex},${examY - 8} ${ex + 6},${examY} ${ex},${examY + 8} ${ex - 6},${examY}`}
                fill={color}
                opacity={0.85}
              />
              <title>{exam.code} — {exam.name} ({exam.status})</title>
            </g>
          );
        })}

        {/* Examination code labels (every other, to avoid overlap) */}
        {examinationMarkers.map((exam, i) => {
          const midDays = (exam.ageMinDays + exam.ageMaxDays) / 2;
          const ex = pad.left + (Math.min(midDays, totalDays) / totalDays) * usableW;
          const color = STATUS_COLOR[exam.status] || "#888";
          const yOffset = i % 2 === 0 ? examY - 20 : examY - 32;
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
          const yOff = milestoneY + (i % 2) * 18;
          return (
            <g key={i} style={{ cursor: "pointer" }} onClick={() => window.location.href = m.editUrl}>
              <line x1={mx} y1={axisY} x2={mx} y2={yOff - 4} stroke={color} strokeWidth={1} strokeDasharray="2,2" />
              <circle cx={mx} cy={yOff} r={5} fill={color} opacity={0.85} />
              <text x={mx} y={yOff + 14} textAnchor="middle" fontSize={9} fill={color}>{m.title}</text>
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
  const today = dayjs();
  const ageYears = birthDate ? today.diff(birthDate, "year") : null;
  const ageMonths = birthDate ? today.diff(birthDate, "month") % 12 : null;

  const milestoneTypeOptions = [
    { value: "first_word", label: strings.firstWord || "First word" },
    { value: "first_turn", label: strings.firstTurn || "First turn" },
    { value: "first_walk", label: strings.firstWalk || "First walk" },
    { value: "first_smile", label: strings.firstSmile || "First smile" },
    { value: "first_tooth", label: strings.firstTooth || "First tooth" },
    { value: "custom", label: strings.custom || "Custom" },
  ];

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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 12px 80px" }}>
      {/* Header */}
      <Space style={{ marginBottom: 20, width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {childDetail.name}
          </Title>
          {birthDate && (
            <Text type="secondary">
              {ageYears !== null ? `${ageYears}y ${ageMonths}m` : ""}
            </Text>
          )}
        </div>
        <Button type="link" href={urls.childDetail} style={{ padding: 0 }}>
          &larr; {strings.back || "Back"}
        </Button>
      </Space>

      {/* Legend */}
      <Space wrap style={{ marginBottom: 12 }}>
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <Tag key={status} color={color} style={{ fontSize: 11 }}>
            {strings[status] || status}
          </Tag>
        ))}
      </Space>

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

      {/* Examination markers legend */}
      {examinationMarkers.length > 0 && (
        <Card size="small" title={strings.examinations || "Examinations"} style={{ marginBottom: 16 }}>
          <Row gutter={[8, 4]}>
            {examinationMarkers.map((exam) => (
              <Col key={exam.code} xs={12} sm={8} md={6} lg={4}>
                <a href={exam.url} style={{ textDecoration: "none" }}>
                  <Tag
                    color={STATUS_COLOR[exam.status]}
                    style={{ width: "100%", textAlign: "center", cursor: "pointer" }}
                  >
                    {exam.code}
                  </Tag>
                </a>
              </Col>
            ))}
          </Row>
        </Card>
      )}

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
