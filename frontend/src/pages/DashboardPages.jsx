import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  App as AntApp,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Grid,
  Input,
  List,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Tag,
  TimePicker,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  asItems,
  APP_DATE_FORMAT,
  APP_TIME_FORMAT,
  createApiClient,
  DASHBOARD_CARD_TITLES,
  durationMinutesFromValue,
  formatAppDateTime,
  formatAppTime,
  formatDurationCompact,
  formatElapsedSeconds,
  SECTION_META,
} from "../lib/app-utils";

const { Text, Title } = Typography;

function formatMinuteValue(minutes) {
  return Number.isFinite(minutes) ? minutes : 0;
}

function SettingsCardPicker({
  bootstrap,
  selectedItems,
  setSelectedItems,
  statusText,
}) {
  const [activeAvailable, setActiveAvailable] = useState(null);
  const [activeSelected, setActiveSelected] = useState(null);
  const availableItems = bootstrap.settings.dashboard.availableItems.filter(
    (item) => !selectedItems.includes(item.value),
  );

  function addItem(value) {
    if (!value || selectedItems.includes(value)) {
      return;
    }
    setSelectedItems([...selectedItems, value]);
    setActiveAvailable(null);
  }

  function removeItem(value) {
    setSelectedItems(selectedItems.filter((item) => item !== value));
    setActiveSelected(null);
  }

  function moveItem(direction) {
    if (!activeSelected) {
      return;
    }
    const index = selectedItems.indexOf(activeSelected);
    if (index === -1) {
      return;
    }
    const nextItems = [...selectedItems];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= nextItems.length) {
      return;
    }
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
    setSelectedItems(nextItems);
  }

  function labelFor(value) {
    return (
      bootstrap.settings.dashboard.availableItems.find(
        (item) => item.value === value,
      )?.label || value
    );
  }

  return (
    <Card className="ant-section-card" title={bootstrap.strings.dashboardCards}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Text type="secondary">{bootstrap.strings.available}</Text>
          <List
            className="ant-picker-list"
            bordered
            locale={{ emptyText: bootstrap.strings.noItemsAvailable }}
            dataSource={availableItems}
            renderItem={(item) => (
              <List.Item
                className={activeAvailable === item.value ? "is-active" : ""}
                actions={[
                  <Button
                    type="link"
                    key="add"
                    onClick={() => addItem(item.value)}
                  >
                    +
                  </Button>,
                ]}
                onClick={() => setActiveAvailable(item.value)}
              >
                {item.label}
              </List.Item>
            )}
          />
        </Col>
        <Col xs={24} lg={0}>
          <Space wrap style={{ marginTop: 4, marginBottom: 4 }}>
            <Button
              size="small"
              onClick={() => addItem(activeAvailable)}
              disabled={!activeAvailable}
            >
              + {bootstrap.strings.add}
            </Button>
            <Button
              size="small"
              onClick={() => {
                if (availableItems.length) {
                  setSelectedItems([
                    ...selectedItems,
                    ...availableItems.map((item) => item.value),
                  ]);
                }
              }}
              disabled={!availableItems.length}
            >
              {bootstrap.strings.addAll}
            </Button>
            <Button
              size="small"
              onClick={() => setSelectedItems([])}
              disabled={!selectedItems.length}
            >
              {bootstrap.strings.removeAll}
            </Button>
            <Button
              size="small"
              onClick={() => removeItem(activeSelected)}
              disabled={!activeSelected}
            >
              − {bootstrap.strings.remove}
            </Button>
            <Button
              size="small"
              onClick={() => moveItem("up")}
              disabled={!activeSelected}
            >
              {bootstrap.strings.moveUp}
            </Button>
            <Button
              size="small"
              onClick={() => moveItem("down")}
              disabled={!activeSelected}
            >
              {bootstrap.strings.moveDown}
            </Button>
          </Space>
        </Col>
        <Col xs={0} lg={4}>
          <Space
            direction="vertical"
            style={{ width: "100%", justifyContent: "center", height: "100%" }}
          >
            <Button
              block
              onClick={() => addItem(activeAvailable)}
              disabled={!activeAvailable}
            >
              &gt;
            </Button>
            <Button
              block
              onClick={() => {
                if (availableItems.length) {
                  setSelectedItems([
                    ...selectedItems,
                    ...availableItems.map((item) => item.value),
                  ]);
                }
              }}
              disabled={!availableItems.length}
            >
              &gt;&gt;
            </Button>
            <Button
              block
              onClick={() => setSelectedItems([])}
              disabled={!selectedItems.length}
            >
              &lt;&lt;
            </Button>
            <Button
              block
              onClick={() => removeItem(activeSelected)}
              disabled={!activeSelected}
            >
              &lt;
            </Button>
            <Button
              block
              onClick={() => moveItem("up")}
              disabled={!activeSelected}
            >
              {bootstrap.strings.moveUp}
            </Button>
            <Button
              block
              onClick={() => moveItem("down")}
              disabled={!activeSelected}
            >
              {bootstrap.strings.moveDown}
            </Button>
          </Space>
        </Col>
        <Col xs={24} lg={10}>
          <Text type="secondary">{bootstrap.strings.selected}</Text>
          <List
            className="ant-picker-list"
            bordered
            locale={{ emptyText: bootstrap.strings.noItemsSelected }}
            dataSource={selectedItems}
            renderItem={(value) => (
              <List.Item
                className={activeSelected === value ? "is-active" : ""}
                actions={[
                  <Button
                    type="link"
                    key="remove"
                    onClick={() => removeItem(value)}
                  >
                    −
                  </Button>,
                ]}
                onClick={() => setActiveSelected(value)}
              >
                {labelFor(value)}
              </List.Item>
            )}
          />
        </Col>
      </Row>
      <Text type="secondary" style={{ display: "block", marginTop: 12 }}>
        {statusText}
      </Text>
    </Card>
  );
}

export function SettingsPage({ bootstrap }) {
  const ant = AntApp.useApp();
  const api = useRef(createApiClient(bootstrap.csrfToken));
  const [form] = Form.useForm();
  const [selectedItems, setSelectedItems] = useState(
    bootstrap.settings.dashboard.visibleItems,
  );
  const [statusText, setStatusText] = useState(bootstrap.strings.saved);
  const [apiKey, setApiKey] = useState(bootstrap.settings.apiKey);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    form.setFieldsValue({
      first_name: bootstrap.settings.profile.firstName,
      last_name: bootstrap.settings.profile.lastName,
      email: bootstrap.settings.profile.email,
      language: bootstrap.settings.preferences.language,
      timezone: bootstrap.settings.preferences.timezone,
      pagination_count: bootstrap.settings.preferences.paginationCount,
      dashboard_refresh_rate: bootstrap.settings.dashboard.refreshRate,
      dashboard_hide_empty: bootstrap.settings.dashboard.hideEmpty,
      dashboard_hide_age: bootstrap.settings.dashboard.hideAge,
    });
  }, [bootstrap, form]);

  // Autosave dashboard visible items when selectedItems changes
  useEffect(() => {
    // Skip autosave on initial load
    const isInitialLoad =
      selectedItems.length ===
        bootstrap.settings.dashboard.visibleItems.length &&
      selectedItems.every((item) =>
        bootstrap.settings.dashboard.visibleItems.includes(item),
      );

    if (isInitialLoad) return;

    const timer = setTimeout(async () => {
      const values = form.getFieldsValue();
      const payload = new URLSearchParams();
      payload.set("action", "autosave_all_settings");
      payload.set("first_name", values.first_name || "");
      payload.set("last_name", values.last_name || "");
      payload.set("email", values.email || "");
      payload.set("language", values.language || "");
      payload.set("timezone", values.timezone || "");
      payload.set("pagination_count", values.pagination_count || "");
      payload.set(
        "dashboard_refresh_rate",
        values.dashboard_refresh_rate || "",
      );
      payload.set("dashboard_hide_age", values.dashboard_hide_age || "");
      payload.set("dashboard_visible_items", selectedItems.join(","));
      if (values.dashboard_hide_empty) {
        payload.set("dashboard_hide_empty", "on");
      }

      try {
        await api.current.postForm(bootstrap.urls.self, payload);
      } catch (error) {
        // Silent fail for autosave
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedItems, bootstrap, form, api]);

  function choiceOptions(key) {
    return bootstrap.settings.choices[key].map((choice) => ({
      value: choice.value,
      label: choice.label,
    }));
  }

  async function saveSettings(values) {
    setStatusText(bootstrap.strings.saving);
    setErrorText("");
    const payload = new URLSearchParams();
    payload.set("action", "autosave_all_settings");
    payload.set("first_name", values.first_name || "");
    payload.set("last_name", values.last_name || "");
    payload.set("email", values.email || "");
    payload.set("language", values.language || "");
    payload.set("timezone", values.timezone || "");
    payload.set("pagination_count", values.pagination_count || "");
    payload.set("dashboard_refresh_rate", values.dashboard_refresh_rate || "");
    payload.set("dashboard_hide_age", values.dashboard_hide_age || "");
    payload.set("dashboard_visible_items", selectedItems.join(","));
    if (values.dashboard_hide_empty) {
      payload.set("dashboard_hide_empty", "on");
    }
    payload.set("next", bootstrap.urls.self);

    const response = await api.current.postForm(bootstrap.urls.self, payload);
    const data = await response.json();
    if (!response.ok || !data.saved) {
      const firstKey = Object.keys(data.errors || {})[0];
      const firstError = firstKey
        ? data.errors[firstKey]?.[0]?.message
        : bootstrap.strings.saveFailed;
      setStatusText(bootstrap.strings.saveFailed);
      setErrorText(firstError || bootstrap.strings.saveFailed);
      return;
    }
    setStatusText(bootstrap.strings.saved);
    ant.message.success(bootstrap.strings.settingsSaved);
  }

  async function regenerateApiKey() {
    const payload = new URLSearchParams();
    payload.set("api_key_regenerate", "1");
    const response = await api.current.postForm(bootstrap.urls.self, payload);
    const data = await response.json();
    if (response.ok && data.api_key) {
      setApiKey(data.api_key);
      ant.message.success(data.message || bootstrap.strings.apiKeyRegenerated);
      return;
    }
    ant.message.error(bootstrap.strings.saveFailed);
  }

  const siteLinks = [
    {
      key: "apiBrowser",
      label: bootstrap.strings.apiBrowser,
      href: bootstrap.settings.links.apiBrowser,
    },
    bootstrap.settings.links.siteSettings
      ? {
          key: "siteSettings",
          label: bootstrap.strings.siteSettings,
          href: bootstrap.settings.links.siteSettings,
        }
      : null,
    bootstrap.settings.links.tags
      ? {
          key: "tags",
          label: bootstrap.strings.tags,
          href: bootstrap.settings.links.tags,
        }
      : null,
    bootstrap.settings.links.users
      ? {
          key: "users",
          label: bootstrap.strings.users,
          href: bootstrap.settings.links.users,
        }
      : null,
    bootstrap.settings.links.databaseAdmin
      ? {
          key: "databaseAdmin",
          label: bootstrap.strings.databaseAdmin,
          href: bootstrap.settings.links.databaseAdmin,
        }
      : null,
  ].filter(Boolean);

  const supportLinks = [
    {
      key: "sourceCode",
      label: bootstrap.strings.sourceCode,
      href: bootstrap.settings.links.sourceCode,
    },
    {
      key: "chatSupport",
      label: bootstrap.strings.chatSupport,
      href: bootstrap.settings.links.chatSupport,
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Space direction="vertical" size={6}>
          <Text type="secondary">{bootstrap.strings.settings}</Text>
          <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
            {bootstrap.strings.userSettings}
          </Title>
          <Text style={{ color: "#cbd5e1" }}>
            Ant Design settings now replace the previous template-based profile
            panel.
          </Text>
        </Space>
      </Card>

      {errorText ? <Alert type="error" message={errorText} showIcon /> : null}

      <Form layout="vertical" form={form} onFinish={saveSettings}>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card
              className="ant-section-card"
              title={bootstrap.strings.profile}
            >
              <Form.Item name="first_name" label={bootstrap.strings.firstName}>
                <Input />
              </Form.Item>
              <Form.Item name="last_name" label={bootstrap.strings.lastName}>
                <Input />
              </Form.Item>
              <Form.Item name="email" label={bootstrap.strings.email}>
                <Input type="email" />
              </Form.Item>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card
              className="ant-section-card"
              title={bootstrap.strings.preferences}
            >
              <Form.Item name="language" label={bootstrap.strings.language}>
                <Select options={choiceOptions("language")} />
              </Form.Item>
              <Form.Item name="timezone" label={bootstrap.strings.timezone}>
                <Select
                  showSearch
                  options={choiceOptions("timezone")}
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name="pagination_count"
                label={bootstrap.strings.pagination}
              >
                <Select options={choiceOptions("paginationCount")} />
              </Form.Item>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card
              className="ant-section-card"
              title={bootstrap.strings.dashboardPreferences}
            >
              <Form.Item
                name="dashboard_refresh_rate"
                label={bootstrap.strings.refreshRate}
              >
                <Select options={choiceOptions("refreshRate")} />
              </Form.Item>
              <Form.Item
                name="dashboard_hide_age"
                label={bootstrap.strings.hideAge}
              >
                <Select options={choiceOptions("hideAge")} />
              </Form.Item>
              <Form.Item
                name="dashboard_hide_empty"
                label={bootstrap.strings.hideEmpty}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card className="ant-section-card" title={bootstrap.strings.api}>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Input value={apiKey} readOnly />
                <Button danger onClick={regenerateApiKey}>
                  {bootstrap.strings.regenerate}
                </Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24}>
            <SettingsCardPicker
              bootstrap={bootstrap}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              statusText={statusText}
            />
          </Col>
          <Col xs={24}>
            <Card
              className="ant-section-card"
              title={bootstrap.strings.siteSupport}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Text type="secondary">{bootstrap.strings.site}</Text>
                  <List
                    className="ant-link-list"
                    dataSource={siteLinks}
                    renderItem={(item) => (
                      <List.Item>
                        <a href={item.href}>{item.label}</a>
                      </List.Item>
                    )}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text type="secondary">{bootstrap.strings.support}</Text>
                  <List
                    className="ant-link-list"
                    dataSource={supportLinks}
                    renderItem={(item) => (
                      <List.Item>
                        <a href={item.href}>{item.label}</a>
                      </List.Item>
                    )}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
        <div style={{ marginTop: 20 }}>
          <Button type="primary" htmlType="submit" size="large">
            {bootstrap.strings.submit}
          </Button>
        </div>
      </Form>
    </Space>
  );
}

function SummaryCard({ title, children }) {
  return (
    <Card size="small" className="ant-summary-card" title={title}>
      {children}
    </Card>
  );
}

function MiniTimeline({ items, locale, currentTime, strings }) {
  const screens = Grid.useBreakpoint();
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const now = currentTime ? new Date(currentTime) : new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const dayEnd = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const currentMinutes = (now.getTime() - startOfDay.getTime()) / 60000;
  const currentTimePercent = Math.max(
    0,
    Math.min(100, (currentMinutes / (24 * 60)) * 100),
  );

  // Determine hour label interval based on screen size
  let hourLabelInterval = 3; // default for mobile (xs, sm)
  if (screens.lg) {
    hourLabelInterval = 1; // desktop: every hour
  } else if (screens.md) {
    hourLabelInterval = 2; // tablet: every 2nd hour
  }

  function minutesBetween(start, end) {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }

  function barForHour(hour) {
    const slotStart = new Date(
      startOfDay.getFullYear(),
      startOfDay.getMonth(),
      startOfDay.getDate(),
      hour,
      0,
      0,
      0,
    );
    const slotEnd = new Date(slotStart.getTime());
    slotEnd.setHours(hour + 1, 0, 0, 0);

    let best = null;
    let bestMinutes = 0;

    items.forEach((entry) => {
      const start = new Date(entry.start);
      const end = new Date(entry.end);
      if (end <= startOfDay || start >= dayEnd) {
        return;
      }
      const overlapStart = start > slotStart ? start : slotStart;
      const overlapEnd = end < slotEnd ? end : slotEnd;
      const overlap = minutesBetween(overlapStart, overlapEnd);
      if (overlap > bestMinutes) {
        bestMinutes = overlap;
        best = entry;
      }
    });

    if (!best || bestMinutes === 0) {
      return null;
    }

    const height = Math.max(10, Math.round((bestMinutes / 60) * 100));
    const durationLabel = formatDurationCompact(
      best.duration || bestMinutes * 60,
    );
    return (
      <div
        className={`ant-timeline-bar ${best.nap ? "nap" : "sleep"}`}
        style={{ height: `${height}%` }}
        title={`${formatAppTime(best.start)} - ${formatAppTime(best.end)} • ${durationLabel}`}
      />
    );
  }

  return (
    <div className="ant-timeline">
      <div className="ant-timeline-legend">
        <span className="ant-timeline-legend-item">
          <i className="ant-timeline-legend-dot sleep" />
          <span>{strings.sleep}</span>
        </span>
        <span className="ant-timeline-legend-item">
          <i className="ant-timeline-legend-dot nap" />
          <span>{strings.nap}</span>
        </span>
        <span className="ant-timeline-legend-item">
          <i className="ant-timeline-legend-dot now" />
          <span>
            {strings.now} {formatAppTime(now)}
          </span>
        </span>
      </div>
      <div className="ant-timeline-stage">
        <div className="ant-timeline-bars">
          <span
            className="ant-timeline-now-line"
            style={{ left: `${currentTimePercent}%` }}
          />
          {hours.map((hour) => (
            <div key={hour} className="ant-timeline-slot">
              {barForHour(hour)}
            </div>
          ))}
        </div>
        <div className="ant-timeline-axis">
          {hours.map((hour) => (
            <span
              key={hour}
              style={
                hour % hourLabelInterval !== 0
                  ? { visibility: "hidden" }
                  : undefined
              }
            >
              {String(hour).padStart(2, "0")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SleepWeekChart({ sleepItems }) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const N = 7;
  const days = Array.from({ length: N }, (_, i) => {
    const day = dayjs().subtract(N - 1 - i, "day");
    return {
      date: day.format("YYYY-MM-DD"),
      label: day.format("ddd"),
      minutes: 0,
    };
  });

  sleepItems.forEach((item) => {
    if (!item.start) return;
    const itemDate = dayjs(item.start).format("YYYY-MM-DD");
    const bucket = days.find((d) => d.date === itemDate);
    if (bucket) {
      bucket.minutes += durationMinutesFromValue(item.duration);
    }
  });

  const maxMinutes = Math.max(60, ...days.map((d) => d.minutes));
  const yMax = Math.ceil(maxMinutes / 60) * 60;

  // SVG layout constants
  const VW = 620;
  const VH = 150;
  const PAD_L = 38;
  const PAD_R = 10;
  const PAD_T = 24;
  const PAD_B = 22;
  const CW = VW - PAD_L - PAD_R;
  const CH = VH - PAD_T - PAD_B;

  const pts = days.map((d, i) => ({
    ...d,
    x: PAD_L + (i / (N - 1)) * CW,
    y: PAD_T + CH * (1 - d.minutes / yMax),
  }));

  // Catmull-Rom → cubic Bézier for smooth line
  const ALPHA = 1 / 6;
  let linePath = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * ALPHA;
    const cp1y = p1.y + (p2.y - p0.y) * ALPHA;
    const cp2x = p2.x - (p3.x - p1.x) * ALPHA;
    const cp2y = p2.y - (p3.y - p1.y) * ALPHA;
    linePath += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)},${cp2x.toFixed(2)} ${cp2y.toFixed(2)},${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  const areaPath = `${linePath} L ${pts[N - 1].x.toFixed(2)} ${(PAD_T + CH).toFixed(2)} L ${pts[0].x.toFixed(2)} ${(PAD_T + CH).toFixed(2)} Z`;

  const maxH = yMax / 60;
  const yGridLines = Array.from({ length: maxH + 1 }, (_, h) => ({
    y: PAD_T + CH * (1 - h / maxH),
    label: `${h}h`,
  })).filter((_, h) => maxH <= 4 || h % 2 === 0);

  // Responsive font sizes and line width
  const yAxisFontSize = isMobile ? "12" : "9";
  const valueLabelFontSize = isMobile ? "11" : "8";
  const dayLabelFontSize = isMobile ? "12" : "10";
  const lineWidth = isMobile ? "2" : "1.8";

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <linearGradient id="sleepWeekGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd666" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffd666" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="sleepWeekClip">
          <rect x={PAD_L} y={PAD_T} width={CW} height={CH} />
        </clipPath>
      </defs>

      {/* Horizontal grid lines + Y-axis hour labels */}
      {yGridLines.map(({ y, label }) => (
        <g key={label}>
          <line
            x1={PAD_L}
            y1={y}
            x2={PAD_L + CW}
            y2={y}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
          <text
            x={PAD_L - 5}
            y={y + 4}
            textAnchor="end"
            fontSize={yAxisFontSize}
            fill="rgba(255,255,255,0.35)"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Filled area under the curve */}
      <path
        d={areaPath}
        fill="url(#sleepWeekGrad)"
        clipPath="url(#sleepWeekClip)"
      />

      {/* Smooth line */}
      <path
        d={linePath}
        fill="none"
        stroke="#ffd666"
        strokeWidth={lineWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath="url(#sleepWeekClip)"
      />

      {/* Dots + value labels + day labels */}
      {pts.map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r="4.5" fill="#ffd666" />
          {pt.minutes > 0 && (
            <text
              x={pt.x}
              y={pt.y - 10}
              textAnchor="middle"
              fontSize={valueLabelFontSize}
              fontWeight="600"
              fill="#ffd666"
            >
              {formatDurationCompact(pt.minutes * 60)}
            </text>
          )}
          <text
            x={pt.x}
            y={VH - 4}
            textAnchor="middle"
            fontSize={dayLabelFontSize}
            fill="rgba(255,255,255,0.55)"
          >
            {pt.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ChildDashboardPage({ bootstrap }) {
  const ant = AntApp.useApp();
  const api = useRef(createApiClient(bootstrap.csrfToken));
  const [selectedChildId, setSelectedChildId] = useState(
    String(bootstrap.currentChild.id),
  );
  const [hiddenSections, setHiddenSections] = useState(
    bootstrap.dashboard.hiddenSections || [],
  );
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState({});
  const [dashboardData, setDashboardData] = useState({
    sleepItems: [],
    weekSleepItems: [],
  });
  const [diaperDate, setDiaperDate] = useState(dayjs());
  const [diaperTime, setDiaperTime] = useState(dayjs());
  const [diaperConsistency, setDiaperConsistency] = useState("liquid");
  const [feedingStartDate, setFeedingStartDate] = useState(dayjs());
  const [feedingStartTime, setFeedingStartTime] = useState(dayjs());
  const [feedingEndDate, setFeedingEndDate] = useState(dayjs());
  const [feedingEndTime, setFeedingEndTime] = useState(dayjs());
  const [feedingType, setFeedingType] = useState("breast_milk");
  const [breastfeedingStartDate, setBreastfeedingStartDate] = useState(dayjs());
  const [breastfeedingStartTime, setBreastfeedingStartTime] = useState(dayjs());
  const [breastfeedingEndDate, setBreastfeedingEndDate] = useState(dayjs());
  const [breastfeedingEndTime, setBreastfeedingEndTime] = useState(dayjs());
  const [breastfeedingSide, setBreastfeedingSide] = useState("left");
  const [pumpingStartDate, setPumpingStartDate] = useState(dayjs());
  const [pumpingStartTime, setPumpingStartTime] = useState(dayjs());
  const [pumpingEndDate, setPumpingEndDate] = useState(dayjs());
  const [pumpingEndTime, setPumpingEndTime] = useState(dayjs());
  const [pumpingAmount, setPumpingAmount] = useState("");
  const [pumpingSide, setPumpingSide] = useState("left");
  const [sleepTimer, setSleepTimer] = useState(bootstrap.sleepTimer || {});
  const [sleepTimerPaused, setSleepTimerPaused] = useState(false);
  const [sleepTimerPauseStart, setSleepTimerPauseStart] = useState(null);
  const [sleepTimerFrozenSeconds, setSleepTimerFrozenSeconds] = useState(0);
  const [sleepTimerBreaks, setSleepTimerBreaks] = useState([]);
  const [submittingDiaper, setSubmittingDiaper] = useState(false);
  const [submittingFeeding, setSubmittingFeeding] = useState(false);
  const [submittingBreastfeeding, setSubmittingBreastfeeding] = useState(false);
  const [submittingPumping, setSubmittingPumping] = useState(false);
  const [submittingSleepTimer, setSubmittingSleepTimer] = useState(false);
  const [submittingSleepEntry, setSubmittingSleepEntry] = useState(false);
  const [sleepEntryStartDate, setSleepEntryStartDate] = useState(dayjs());
  const [sleepEntryStartTime, setSleepEntryStartTime] = useState(dayjs());
  const [sleepEntryEndDate, setSleepEntryEndDate] = useState(dayjs());
  const [sleepEntryEndTime, setSleepEntryEndTime] = useState(dayjs());
  const [sleepEntryType, setSleepEntryType] = useState("sleep");
  const [selectedQuickEntrySegment, setSelectedQuickEntrySegment] =
    useState("sleep");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const child = bootstrap.children.find(
    (item) => String(item.id) === String(selectedChildId),
  );
  const locale = bootstrap.locale || "en";

  useEffect(() => {
    loadDashboardData(selectedChildId);
  }, [selectedChildId]);

  useEffect(() => {
    setSleepTimer(bootstrap.sleepTimer || {});
  }, [bootstrap.currentChild.id, bootstrap.sleepTimer]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function persistHidden(nextHidden) {
    const payload = new URLSearchParams();
    payload.set("action", "autosave_dashboard_layout");
    payload.set(
      "dashboard_section_order",
      bootstrap.dashboard.sectionOrder.join(","),
    );
    payload.set("dashboard_hidden_sections", nextHidden.join(","));

    try {
      await api.current.postForm(bootstrap.urls.layout, payload);
    } catch (error) {
      ant.message.error(bootstrap.strings.saveFailed);
    }
  }

  function toggleSection(sectionId) {
    const nextHidden = hiddenSections.includes(sectionId)
      ? hiddenSections.filter((item) => item !== sectionId)
      : [...hiddenSections, sectionId];
    setHiddenSections(nextHidden);
    persistHidden(nextHidden);
  }

  function durationMinutes(value) {
    return durationMinutesFromValue(value);
  }

  function isToday(value) {
    const date = new Date(value);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }

  async function loadDashboardData(childId, options = {}) {
    if (!childId) {
      return;
    }

    const { background = false } = options;
    if (!background) {
      setLoading(true);
    }
    const query = `child=${encodeURIComponent(childId)}`;

    try {
      const sevenDaysAgo = dayjs()
        .subtract(7, "day")
        .startOf("day")
        .toISOString();
      const [
        changes,
        feedings,
        pumpings,
        sleeps,
        tummyTimes,
        timers,
        recommendations,
        weekSleeps,
      ] = await Promise.all([
        api.current.get(`/api/changes/?${query}&limit=20`),
        api.current.get(`/api/feedings/?${query}&limit=20`),
        api.current.get(`/api/pumping/?${query}&limit=20`),
        api.current.get(`/api/sleep/?${query}&limit=30`),
        api.current.get(`/api/tummy-times/?${query}&limit=20`),
        api.current.get(`/api/timers/?${query}&limit=5`),
        api.current.get(
          `/api/children/${encodeURIComponent(child.slug)}/sleep-recommendations/`,
        ),
        api.current.get(
          `/api/sleep/?${query}&start_min=${encodeURIComponent(sevenDaysAgo)}&limit=200`,
        ),
      ]);

      const changeItems = asItems(changes);
      const feedingItems = asItems(feedings);
      const pumpingItems = asItems(pumpings);
      const sleepItems = asItems(sleeps);
      const tummyItems = asItems(tummyTimes);
      const timerItems = asItems(timers);
      const weekSleepItems = asItems(weekSleeps);
      setDashboardData({ sleepItems, weekSleepItems });

      const lastChange = changeItems[0];
      const lastFeeding = feedingItems[0];
      const lastPumping = pumpingItems[0];
      const lastSleep = sleepItems[0];
      const feedingsToday = feedingItems.filter((item) => isToday(item.start));
      const napsToday = sleepItems.filter(
        (item) => isToday(item.start) && item.nap,
      );
      const validSleepItems = sleepItems.filter(
        (item) => durationMinutes(item.duration) > 0,
      );

      const methodCounts = feedingItems.reduce((result, item) => {
        const key = item.method || "unknown";
        result[key] = (result[key] || 0) + 1;
        return result;
      }, {});
      const topMethod = Object.entries(methodCounts).sort(
        (a, b) => b[1] - a[1],
      )[0];

      setCards({
        "card.diaper.last": lastChange ? (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Last recorded"
              value={formatAppDateTime(lastChange.time)}
            />
            <Space wrap>
              <Tag color={lastChange.wet ? "blue" : "default"}>Wet</Tag>
              <Tag color={lastChange.solid ? "gold" : "default"}>Solid</Tag>
            </Space>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.diaper.types": (
          <Space direction="vertical" size={6}>
            <Statistic
              title="Changes today"
              value={changeItems.filter((item) => isToday(item.time)).length}
            />
            <Text type="secondary">{changeItems.length} recent entries</Text>
          </Space>
        ),
        "card.feedings.last": lastFeeding ? (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Duration"
              value={formatMinuteValue(durationMinutes(lastFeeding.duration))}
              suffix="min"
            />
            <Text type="secondary">{formatAppDateTime(lastFeeding.start)}</Text>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.feedings.method": topMethod ? (
          <Space direction="vertical" size={4}>
            <Statistic title="Dominant method" value={topMethod[0]} />
            <Text type="secondary">{topMethod[1]} recent entries</Text>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.feedings.recent": (
          <Space direction="vertical" size={4}>
            <Statistic title="Feedings today" value={feedingsToday.length} />
            <Text type="secondary">{feedingItems.length} recent feedings</Text>
          </Space>
        ),
        "card.feedings.breastfeeding": (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Breastfeeding today"
              value={
                feedingsToday.filter((item) =>
                  String(item.method || "")
                    .toLowerCase()
                    .includes("breast"),
                ).length
              }
            />
          </Space>
        ),
        "card.pumpings.last": lastPumping ? (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Last pumping"
              value={formatMinuteValue(durationMinutes(lastPumping.duration))}
              suffix="min"
            />
            <Text type="secondary">{formatAppDateTime(lastPumping.start)}</Text>
            {lastPumping.side ? <Tag>{lastPumping.side}</Tag> : null}
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.sleep.timers": (
          <Space direction="vertical" size={4}>
            <Statistic title="Timers" value={timerItems.length} />
            <Text type="secondary">
              {timerItems[0]
                ? formatAppTime(timerItems[0].start)
                : bootstrap.strings.noData}
            </Text>
          </Space>
        ),
        "card.quick_entry.consolidated": null,
        "card.diaper.quick_entry": null,
        "card.feedings.quick_entry": null,
        "card.feedings.breast_quick_entry": null,
        "card.pumpings.quick_entry": null,
        "card.sleep.quick_timer": null,
        "card.sleep.last": lastSleep ? (
          <Space direction="vertical" size={4}>
            <Statistic
              title={lastSleep.nap ? "Nap" : "Sleep"}
              value={formatMinuteValue(durationMinutes(lastSleep.duration))}
              suffix="min"
            />
            <Text type="secondary">
              {formatAppDateTime(lastSleep.start)} -{" "}
              {formatAppDateTime(lastSleep.end)}
            </Text>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.sleep.recommendations": recommendations ? (
          <Space direction="vertical" size={8}>
            <Card size="small">
              <Text strong>Nap</Text>
              <br />
              <Text type="secondary">
                {recommendations.nap?.ideal
                  ? `Ideal ${formatAppTime(recommendations.nap.ideal)}`
                  : bootstrap.strings.noData}
              </Text>
            </Card>
            <Card size="small">
              <Text strong>Bedtime</Text>
              <br />
              <Text type="secondary">
                {recommendations.bedtime?.target_bedtime
                  ? `Target ${formatAppTime(recommendations.bedtime.target_bedtime)}`
                  : bootstrap.strings.noData}
              </Text>
            </Card>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.sleep.recent": (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Sleep entries today"
              value={sleepItems.filter((item) => isToday(item.start)).length}
            />
            <Text type="secondary">
              {sleepItems.length} recent sleep entries
            </Text>
          </Space>
        ),
        "card.sleep.naps_day": (
          <Space direction="vertical" size={4}>
            <Statistic title="Naps today" value={napsToday.length} />
            <Text type="secondary">
              {napsToday.reduce(
                (acc, item) => acc + durationMinutes(item.duration),
                0,
              )}{" "}
              min
            </Text>
          </Space>
        ),
        "card.sleep.statistics": (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Average sleep"
              value={
                validSleepItems.length
                  ? Math.round(
                      validSleepItems.reduce(
                        (acc, item) => acc + durationMinutes(item.duration),
                        0,
                      ) / validSleepItems.length,
                    )
                  : 0
              }
              suffix="min"
            />
          </Space>
        ),
        "card.sleep.timeline_day": null,
        "card.tummytime.day": (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Tummy time today"
              value={tummyItems
                .filter((item) => isToday(item.start))
                .reduce((acc, item) => acc + durationMinutes(item.duration), 0)}
              suffix="min"
            />
            <Text type="secondary">{tummyItems.length} recent entries</Text>
          </Space>
        ),
      });
    } catch (error) {
      ant.message.error(error.message);
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }

  async function submitSleepTimerAction(action) {
    const payload = new URLSearchParams();
    payload.set("sleep_timer_action", action);

    setSubmittingSleepTimer(true);
    try {
      const response = await api.current.postForm(
        bootstrap.urls.current,
        payload,
      );
      if (!response.ok) {
        ant.message.error(bootstrap.strings.saveFailed);
        return;
      }

      if (action === "start") {
        setSleepTimer({
          running: true,
          startIso: new Date().toISOString(),
          elapsedSeconds: 0,
        });
        setSleepTimerPaused(false);
        setSleepTimerFrozenSeconds(0);
        setSleepTimerBreaks([]);
      } else if (action === "pause") {
        const currentElapsed = Math.max(
          Number(sleepTimer.elapsedSeconds) || 0,
          Math.floor(
            (currentTime -
              new Date(sleepTimer.startIso || currentTime).getTime()) /
              1000,
          ),
        );
        setSleepTimerFrozenSeconds(currentElapsed);
        setSleepTimerPaused(true);
        setSleepTimerPauseStart(Date.now());
      } else if (action === "resume") {
        if (sleepTimerPauseStart) {
          const pauseDuration = Math.floor(
            (Date.now() - sleepTimerPauseStart) / 1000,
          );
          setSleepTimerBreaks([
            ...sleepTimerBreaks,
            { duration: pauseDuration },
          ]);
        }
        setSleepTimer({
          running: true,
          startIso: new Date().toISOString(),
          elapsedSeconds: sleepTimerFrozenSeconds,
        });
        setSleepTimerPaused(false);
        setSleepTimerPauseStart(null);
        setSleepTimerFrozenSeconds(0);
      } else if (action === "save") {
        // Determine sleep type based on elapsed time (< 90 min = nap, >= 90 min = sleep)
        const durationMinutes = sleepTimerFrozenSeconds / 60;
        const sleepType = durationMinutes < 90 ? "nap" : "sleep";
        payload.set("sleep_timer_type", sleepType);

        const response2 = await api.current.postForm(
          bootstrap.urls.current,
          payload,
        );
        if (!response2.ok) {
          ant.message.error(bootstrap.strings.saveFailed);
          setSubmittingSleepTimer(false);
          return;
        }

        setSleepTimer({
          running: false,
          startIso: null,
          elapsedSeconds: 0,
        });
        setSleepTimerPaused(false);
        setSleepTimerPauseStart(null);
        setSleepTimerFrozenSeconds(0);
        ant.message.success(bootstrap.strings.sleepEntrySaved);
        await loadDashboardData(selectedChildId, { background: true });
      } else {
        setSleepTimer({
          running: false,
          startIso: null,
          elapsedSeconds: 0,
        });
        setSleepTimerPaused(false);
        setSleepTimerPauseStart(null);
        setSleepTimerFrozenSeconds(0);
        ant.message.success(bootstrap.strings.sleepEntrySaved);
        await loadDashboardData(selectedChildId, { background: true });
      }
    } finally {
      setSubmittingSleepTimer(false);
    }
  }

  async function submitDiaperEntry() {
    const payload = new URLSearchParams();
    payload.set("diaper_quick_entry_action", "create");
    payload.set("diaper_entry_date", diaperDate.format("YYYY-MM-DD"));
    payload.set("diaper_entry_time", diaperTime.format("HH:mm"));
    payload.set("diaper_entry_consistency", diaperConsistency);

    setSubmittingDiaper(true);
    try {
      const response = await api.current.postForm(
        bootstrap.urls.current,
        payload,
      );
      if (response.ok) {
        ant.message.success(bootstrap.strings.saved);
        await loadDashboardData(selectedChildId);
        return;
      }
      ant.message.error(bootstrap.strings.saveFailed);
    } finally {
      setSubmittingDiaper(false);
    }
  }

  async function submitFeedingEntry() {
    const payload = new URLSearchParams();
    payload.set("feeding_quick_entry_action", "create");
    payload.set(
      "feeding_entry_start_date",
      feedingStartDate.format("YYYY-MM-DD"),
    );
    payload.set("feeding_entry_start_time", feedingStartTime.format("HH:mm"));
    payload.set("feeding_entry_end_date", feedingEndDate.format("YYYY-MM-DD"));
    payload.set("feeding_entry_end_time", feedingEndTime.format("HH:mm"));
    payload.set("feeding_entry_type", feedingType);

    setSubmittingFeeding(true);
    try {
      const response = await api.current.postForm(
        bootstrap.urls.current,
        payload,
      );
      if (response.ok) {
        ant.message.success(bootstrap.strings.feedingSaved);
        await loadDashboardData(selectedChildId);
        return;
      }
      ant.message.error(bootstrap.strings.saveFailed);
    } finally {
      setSubmittingFeeding(false);
    }
  }

  async function submitBreastfeedingEntry() {
    const payload = new URLSearchParams();
    payload.set("breastfeeding_quick_entry_action", "create");
    payload.set(
      "breastfeeding_entry_start_date",
      breastfeedingStartDate.format("YYYY-MM-DD"),
    );
    payload.set(
      "breastfeeding_entry_start_time",
      breastfeedingStartTime.format("HH:mm"),
    );
    payload.set(
      "breastfeeding_entry_end_date",
      breastfeedingEndDate.format("YYYY-MM-DD"),
    );
    payload.set(
      "breastfeeding_entry_end_time",
      breastfeedingEndTime.format("HH:mm"),
    );
    payload.set("breastfeeding_entry_side", breastfeedingSide);

    setSubmittingBreastfeeding(true);
    try {
      const response = await api.current.postForm(
        bootstrap.urls.current,
        payload,
      );
      if (response.ok) {
        ant.message.success(bootstrap.strings.breastfeedingSaved);
        await loadDashboardData(selectedChildId);
        return;
      }
      ant.message.error(bootstrap.strings.saveFailed);
    } finally {
      setSubmittingBreastfeeding(false);
    }
  }

  async function submitPumpingEntry() {
    const payload = new URLSearchParams();
    payload.set("pumping_quick_entry_action", "create");
    payload.set(
      "pumping_entry_start_date",
      pumpingStartDate.format("YYYY-MM-DD"),
    );
    payload.set("pumping_entry_start_time", pumpingStartTime.format("HH:mm"));
    payload.set("pumping_entry_end_date", pumpingEndDate.format("YYYY-MM-DD"));
    payload.set("pumping_entry_end_time", pumpingEndTime.format("HH:mm"));
    payload.set("pumping_entry_amount", pumpingAmount);
    payload.set("pumping_entry_side", pumpingSide);

    setSubmittingPumping(true);
    try {
      const response = await api.current.postForm(
        bootstrap.urls.current,
        payload,
      );
      if (response.ok) {
        ant.message.success(bootstrap.strings.pumpingSaved);
        await loadDashboardData(selectedChildId);
        return;
      }
      ant.message.error(bootstrap.strings.saveFailed);
    } finally {
      setSubmittingPumping(false);
    }
  }

  async function submitSleepEntry() {
    const durationMinutes = sleepEntryEndDate
      .hours(sleepEntryEndTime.hours())
      .minutes(sleepEntryEndTime.minutes())
      .diff(
        sleepEntryStartDate
          .hours(sleepEntryStartTime.hours())
          .minutes(sleepEntryStartTime.minutes()),
        "minutes",
      );
    const autoType = durationMinutes < 90 ? "nap" : "sleep";

    const payload = new URLSearchParams();
    payload.set("sleep_manual_entry_action", "create");
    payload.set(
      "sleep_entry_start_date",
      sleepEntryStartDate.format("YYYY-MM-DD"),
    );
    payload.set("sleep_entry_start_time", sleepEntryStartTime.format("HH:mm"));
    payload.set("sleep_entry_end_date", sleepEntryEndDate.format("YYYY-MM-DD"));
    payload.set("sleep_entry_end_time", sleepEntryEndTime.format("HH:mm"));
    payload.set("sleep_entry_type", autoType);

    setSubmittingSleepEntry(true);
    try {
      const response = await api.current.postForm(
        bootstrap.urls.current,
        payload,
      );
      if (response.ok) {
        ant.message.success(bootstrap.strings.sleepEntrySaved);
        await loadDashboardData(selectedChildId);
        return;
      }
      ant.message.error(bootstrap.strings.saveFailed);
    } finally {
      setSubmittingSleepEntry(false);
    }
  }

  function renderDateTimeInputs({
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
  }) {
    return (
      <>
        <Row gutter={8}>
          <Col span={12}>
            <label className="ant-dashboard-inline-label ant-dashboard-inline-label--compact">
              {bootstrap.strings.startDate}
            </label>
            <DatePicker
              value={startDate}
              format={APP_DATE_FORMAT}
              onChange={(value) => value && setStartDate(value)}
              className="ant-dashboard-picker ant-dashboard-picker--compact"
              inputReadOnly
            />
          </Col>
          <Col span={12}>
            <label className="ant-dashboard-inline-label ant-dashboard-inline-label--compact">
              {bootstrap.strings.startTime}
            </label>
            <TimePicker
              value={startTime}
              format={APP_TIME_FORMAT}
              onChange={(value) => value && setStartTime(value)}
              className="ant-dashboard-picker ant-dashboard-picker--compact"
              inputReadOnly
            />
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={12}>
            <label className="ant-dashboard-inline-label ant-dashboard-inline-label--compact">
              {bootstrap.strings.endDate}
            </label>
            <DatePicker
              value={endDate}
              format={APP_DATE_FORMAT}
              onChange={(value) => value && setEndDate(value)}
              className="ant-dashboard-picker ant-dashboard-picker--compact"
              inputReadOnly
            />
          </Col>
          <Col span={12}>
            <label className="ant-dashboard-inline-label ant-dashboard-inline-label--compact">
              {bootstrap.strings.endTime}
            </label>
            <TimePicker
              value={endTime}
              format={APP_TIME_FORMAT}
              onChange={(value) => value && setEndTime(value)}
              className="ant-dashboard-picker ant-dashboard-picker--compact"
              inputReadOnly
            />
          </Col>
        </Row>
      </>
    );
  }

  function renderSleepTimerCard() {
    const timerElapsedSeconds = sleepTimer.running
      ? Math.max(
          Number(sleepTimer.elapsedSeconds) || 0,
          Math.floor(
            (currentTime -
              new Date(sleepTimer.startIso || currentTime).getTime()) /
              1000,
          ),
        )
      : Number(sleepTimer.elapsedSeconds) || 0;

    return (
      <Row gutter={[16, 16]} className="ant-sleep-timer-layout">
        <Col xs={24} xl={8}>
          <Space
            direction="vertical"
            size={16}
            className="ant-sleep-timer-card"
            style={{ width: "100%" }}
          >
            <Statistic
              title={bootstrap.strings.sleepTimer}
              value={formatElapsedSeconds(timerElapsedSeconds)}
            />
            <Space wrap>
              <Tag color={sleepTimer.running ? "gold" : "default"}>
                {sleepTimer.running
                  ? bootstrap.strings.running
                  : bootstrap.strings.ready}
              </Tag>
            </Space>
            <Button
              type="primary"
              size="large"
              loading={submittingSleepTimer}
              onClick={() =>
                submitSleepTimerAction(sleepTimer.running ? "stop" : "start")
              }
            >
              {sleepTimer.running
                ? bootstrap.strings.stop
                : bootstrap.strings.start}
            </Button>
          </Space>
        </Col>
        <Col xs={24} xl={16}>
          <Card
            size="small"
            title={bootstrap.strings.manualEntry}
            style={{ width: "100%" }}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {renderDateTimeInputs({
                startDate: sleepEntryStartDate,
                setStartDate: setSleepEntryStartDate,
                startTime: sleepEntryStartTime,
                setStartTime: setSleepEntryStartTime,
                endDate: sleepEntryEndDate,
                setEndDate: setSleepEntryEndDate,
                endTime: sleepEntryEndTime,
                setEndTime: setSleepEntryEndTime,
              })}
              <Segmented
                block
                value={sleepEntryType}
                options={[
                  { label: bootstrap.strings.sleep, value: "sleep" },
                  { label: bootstrap.strings.nap, value: "nap" },
                ]}
                onChange={setSleepEntryType}
              />
              <Button
                type="primary"
                size="large"
                loading={submittingSleepEntry}
                onClick={submitSleepEntry}
                className="ant-diaper-save"
              >
                {bootstrap.strings.save}
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    );
  }

  function renderFeedingQuickCard() {
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {renderDateTimeInputs({
          startDate: feedingStartDate,
          setStartDate: setFeedingStartDate,
          startTime: feedingStartTime,
          setStartTime: setFeedingStartTime,
          endDate: feedingEndDate,
          setEndDate: setFeedingEndDate,
          endTime: feedingEndTime,
          setEndTime: setFeedingEndTime,
        })}
        <Segmented
          block
          value={feedingType}
          options={[
            { label: bootstrap.strings.solid, value: "solid" },
            { label: bootstrap.strings.babyFood, value: "baby_food" },
            { label: bootstrap.strings.breastMilk, value: "breast_milk" },
          ]}
          onChange={setFeedingType}
        />
        <Button
          type="primary"
          size="large"
          loading={submittingFeeding}
          onClick={submitFeedingEntry}
          className="ant-diaper-save"
        >
          {bootstrap.strings.save}
        </Button>
      </Space>
    );
  }

  function renderBreastfeedingQuickCard() {
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {renderDateTimeInputs({
          startDate: breastfeedingStartDate,
          setStartDate: setBreastfeedingStartDate,
          startTime: breastfeedingStartTime,
          setStartTime: setBreastfeedingStartTime,
          endDate: breastfeedingEndDate,
          setEndDate: setBreastfeedingEndDate,
          endTime: breastfeedingEndTime,
          setEndTime: setBreastfeedingEndTime,
        })}
        <Segmented
          block
          value={breastfeedingSide}
          options={[
            { label: bootstrap.strings.left, value: "left" },
            { label: bootstrap.strings.right, value: "right" },
          ]}
          onChange={setBreastfeedingSide}
        />
        <Button
          type="primary"
          size="large"
          loading={submittingBreastfeeding}
          onClick={submitBreastfeedingEntry}
          className="ant-diaper-save"
        >
          {bootstrap.strings.save}
        </Button>
      </Space>
    );
  }

  function renderPumpingQuickCard() {
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {renderDateTimeInputs({
          startDate: pumpingStartDate,
          setStartDate: setPumpingStartDate,
          startTime: pumpingStartTime,
          setStartTime: setPumpingStartTime,
          endDate: pumpingEndDate,
          setEndDate: setPumpingEndDate,
          endTime: pumpingEndTime,
          setEndTime: setPumpingEndTime,
        })}
        <Row gutter={8}>
          <Col span={12}>
            <label className="ant-dashboard-inline-label">
              {bootstrap.strings.amount}
            </label>
            <Input
              value={pumpingAmount}
              onChange={(event) => setPumpingAmount(event.target.value)}
              className="ant-native-input"
              inputMode="decimal"
              addonAfter="ml"
            />
          </Col>
        </Row>
        <Row gutter={[8, 0]}>
          <Col span={24}>
            <label className="ant-dashboard-inline-label">
              {bootstrap.strings.side}
            </label>
            <Segmented
              block
              value={pumpingSide}
              options={[
                { label: bootstrap.strings.left, value: "left" },
                { label: bootstrap.strings.right, value: "right" },
                { label: bootstrap.strings.both, value: "both" },
              ]}
              onChange={setPumpingSide}
            />
          </Col>
        </Row>
        <Button
          type="primary"
          size="large"
          loading={submittingPumping}
          onClick={submitPumpingEntry}
          className="ant-diaper-save"
        >
          {bootstrap.strings.save}
        </Button>
      </Space>
    );
  }

  function renderQuickEntryCard() {
    const segmentColors = {
      diaper: "#ff4d4f",
      sleep: "#fa8c16",
      feeding: "#1890ff",
      breastfeeding: "#722ed1",
      pumping: "#13c2c2",
    };

    const segments = [
      { label: bootstrap.strings.sleep, value: "sleep" },
      { label: "Diaper", value: "diaper" },
      { label: bootstrap.strings.feedings, value: "feeding" },
      { label: "Breastfeeding", value: "breastfeeding" },
      { label: bootstrap.strings.pumpings, value: "pumping" },
    ];

    const renderSegmentLabel = (segment) => (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: segmentColors[segment.value],
          }}
        />
        {segment.label}
      </span>
    );

    return (
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Segmented
          block
          value={selectedQuickEntrySegment}
          options={segments.map((segment) => ({
            label: renderSegmentLabel(segment),
            value: segment.value,
          }))}
          onChange={setSelectedQuickEntrySegment}
          style={{ width: "100%" }}
        />
        {selectedQuickEntrySegment === "sleep" && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Row gutter={24}>
              <Col xs={24} md={11}>
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {renderDateTimeInputs({
                    startDate: sleepEntryStartDate,
                    setStartDate: setSleepEntryStartDate,
                    startTime: sleepEntryStartTime,
                    setStartTime: setSleepEntryStartTime,
                    endDate: sleepEntryEndDate,
                    setEndDate: setSleepEntryEndDate,
                    endTime: sleepEntryEndTime,
                    setEndTime: setSleepEntryEndTime,
                  })}
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Duration &lt; 90 min is saved as nap, ≥ 90 min as sleep
                  </Text>
                </Space>
              </Col>
              <Col xs={1} md={1}>
                <div
                  style={{
                    width: "1px",
                    height: "100%",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Space
                  direction="vertical"
                  size={16}
                  className="ant-sleep-timer-card"
                  style={{ width: "100%" }}
                >
                  {sleepTimer.running && sleepTimerPaused ? (
                    <Row gutter={16}>
                      <Col xs={12}>
                        <Statistic
                          title={bootstrap.strings.sleepTimer}
                          value={formatElapsedSeconds(sleepTimerFrozenSeconds)}
                        />
                      </Col>
                      <Col xs={12}>
                        <Statistic
                          title="Pause"
                          value={formatElapsedSeconds(
                            sleepTimerPauseStart
                              ? Math.floor(
                                  (currentTime - sleepTimerPauseStart) / 1000,
                                )
                              : 0,
                          )}
                        />
                      </Col>
                    </Row>
                  ) : (
                    <Statistic
                      title={bootstrap.strings.sleepTimer}
                      value={formatElapsedSeconds(
                        sleepTimer.running
                          ? Math.max(
                              Number(sleepTimer.elapsedSeconds) || 0,
                              Math.floor(
                                (currentTime -
                                  new Date(
                                    sleepTimer.startIso || currentTime,
                                  ).getTime()) /
                                  1000,
                              ),
                            )
                          : Number(sleepTimer.elapsedSeconds) || 0,
                      )}
                    />
                  )}
                  <Space wrap>
                    <Tag color={sleepTimer.running ? "gold" : "default"}>
                      {sleepTimer.running
                        ? sleepTimerPaused
                          ? "Paused"
                          : bootstrap.strings.running
                        : bootstrap.strings.ready}
                    </Tag>
                  </Space>
                </Space>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col xs={24} md={11}>
                <Button
                  type="primary"
                  size="large"
                  loading={submittingSleepEntry}
                  onClick={submitSleepEntry}
                  style={{ width: "100%" }}
                >
                  {bootstrap.strings.save}
                </Button>
              </Col>
              <Col xs={1} md={1} />
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    size="large"
                    loading={submittingSleepTimer}
                    onClick={() => {
                      if (!sleepTimer.running) {
                        submitSleepTimerAction("start");
                      } else if (sleepTimerPaused) {
                        submitSleepTimerAction("resume");
                      } else {
                        submitSleepTimerAction("pause");
                      }
                    }}
                    style={{ width: "100%" }}
                  >
                    {!sleepTimer.running
                      ? bootstrap.strings.start
                      : sleepTimerPaused
                        ? "Resume"
                        : "Pause"}
                  </Button>
                  {sleepTimer.running && (
                    <Button
                      type="primary"
                      size="large"
                      loading={submittingSleepTimer}
                      onClick={() => submitSleepTimerAction("save")}
                      style={{ width: "100%" }}
                    >
                      {bootstrap.strings.save}
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>
          </Space>
        )}
        {selectedQuickEntrySegment === "diaper" && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Row gutter={8}>
              <Col span={12}>
                <DatePicker
                  value={diaperDate}
                  format={APP_DATE_FORMAT}
                  onChange={(value) => value && setDiaperDate(value)}
                  className="ant-dashboard-picker"
                  inputReadOnly
                />
              </Col>
              <Col span={12}>
                <TimePicker
                  value={diaperTime}
                  format={APP_TIME_FORMAT}
                  onChange={(value) => value && setDiaperTime(value)}
                  className="ant-dashboard-picker"
                  inputReadOnly
                />
              </Col>
            </Row>
            <Segmented
              block
              value={diaperConsistency}
              options={[
                {
                  label: bootstrap.strings.liquid,
                  value: "liquid",
                },
                {
                  label: bootstrap.strings.solid,
                  value: "solid",
                },
              ]}
              onChange={setDiaperConsistency}
            />
            <Button
              type="primary"
              size="large"
              loading={submittingDiaper}
              onClick={submitDiaperEntry}
              className="ant-diaper-save"
            >
              {bootstrap.strings.save}
            </Button>
          </Space>
        )}
        {selectedQuickEntrySegment === "feeding" && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Row gutter={8}>
              <Col span={12}>
                <DatePicker
                  value={feedingStartDate}
                  format={APP_DATE_FORMAT}
                  onChange={(value) => value && setFeedingStartDate(value)}
                  className="ant-dashboard-picker"
                  inputReadOnly
                />
              </Col>
              <Col span={12}>
                <TimePicker
                  value={feedingStartTime}
                  format={APP_TIME_FORMAT}
                  onChange={(value) => value && setFeedingStartTime(value)}
                  className="ant-dashboard-picker"
                  inputReadOnly
                />
              </Col>
            </Row>
            <Segmented
              block
              value={feedingType}
              options={[
                { label: bootstrap.strings.solid, value: "solid" },
                {
                  label: bootstrap.strings.babyFood,
                  value: "baby_food",
                },
                {
                  label: bootstrap.strings.breastMilk,
                  value: "breast_milk",
                },
              ]}
              onChange={setFeedingType}
            />
            <Button
              type="primary"
              size="large"
              loading={submittingFeeding}
              onClick={submitFeedingEntry}
              className="ant-diaper-save"
            >
              {bootstrap.strings.save}
            </Button>
          </Space>
        )}
        {selectedQuickEntrySegment === "breastfeeding" && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Row gutter={8}>
              <Col span={12}>
                <DatePicker
                  value={breastfeedingStartDate}
                  format={APP_DATE_FORMAT}
                  onChange={(value) =>
                    value && setBreastfeedingStartDate(value)
                  }
                  className="ant-dashboard-picker"
                  inputReadOnly
                />
              </Col>
              <Col span={12}>
                <TimePicker
                  value={breastfeedingEndTime}
                  format={APP_TIME_FORMAT}
                  onChange={(value) => value && setBreastfeedingEndTime(value)}
                  className="ant-dashboard-picker"
                  inputReadOnly
                />
              </Col>
            </Row>
            <Segmented
              block
              value={breastfeedingSide}
              options={[
                { label: bootstrap.strings.left, value: "left" },
                { label: bootstrap.strings.right, value: "right" },
              ]}
              onChange={setBreastfeedingSide}
            />
            <Button
              type="primary"
              size="large"
              loading={submittingBreastfeeding}
              onClick={submitBreastfeedingEntry}
              className="ant-diaper-save"
            >
              {bootstrap.strings.save}
            </Button>
          </Space>
        )}
        {selectedQuickEntrySegment === "pumping" && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Row gutter={8}>
              <Col span={12}>
                <DatePicker
                  value={pumpingStartDate}
                  format={APP_DATE_FORMAT}
                  onChange={(value) => value && setPumpingStartDate(value)}
                  className="ant-dashboard-picker"
                  inputReadOnly
                />
              </Col>
              <Col span={12}>
                <TimePicker
                  value={pumpingEndTime}
                  format={APP_TIME_FORMAT}
                  onChange={(value) => value && setPumpingEndTime(value)}
                  className="ant-dashboard-picker"
                  inputReadOnly
                />
              </Col>
            </Row>
            <Row gutter={8}>
              <Col span={12}>
                <label className="ant-dashboard-inline-label">
                  {bootstrap.strings.amount}
                </label>
                <Input
                  value={pumpingAmount}
                  onChange={(event) => setPumpingAmount(event.target.value)}
                  className="ant-native-input"
                  inputMode="decimal"
                  addonAfter="ml"
                />
              </Col>
            </Row>
            <label className="ant-dashboard-inline-label">
              {bootstrap.strings.side}
            </label>
            <Segmented
              block
              value={pumpingSide}
              options={[
                {
                  label: bootstrap.strings.left,
                  value: "left",
                },
                {
                  label: bootstrap.strings.right,
                  value: "right",
                },
                {
                  label: bootstrap.strings.both,
                  value: "both",
                },
              ]}
              onChange={setPumpingSide}
            />
            <Button
              type="primary"
              size="large"
              loading={submittingPumping}
              onClick={submitPumpingEntry}
              className="ant-diaper-save"
            >
              {bootstrap.strings.save}
            </Button>
          </Space>
        )}
      </Space>
    );
  }

  function renderSleepTimelineCard() {
    return (
      <MiniTimeline
        items={dashboardData.sleepItems.filter(
          (item) => item.start && item.end,
        )}
        locale={locale}
        currentTime={currentTime}
        strings={bootstrap.strings}
      />
    );
  }

  function navigateToChild(nextChildId) {
    const nextChild = bootstrap.children.find(
      (item) => String(item.id) === String(nextChildId),
    );
    if (!nextChild) {
      return;
    }
    setSelectedChildId(String(nextChild.id));
    if (nextChild.slug !== bootstrap.currentChild.slug) {
      const targetUrl = bootstrap.urls.childDashboardTemplate.replace(
        "__CHILD_SLUG__",
        encodeURIComponent(nextChild.slug),
      );
      window.location.assign(targetUrl);
    }
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space size={14} align="center">
              <Avatar
                src={child?.pictureUrl}
                size={64}
                className="ant-dashboard-child-avatar"
              />
              <Space direction="vertical" size={2}>
                <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
                  {child?.name || bootstrap.currentChild.name}
                </Title>
                {child?.birthDateLabel ? (
                  <Text type="secondary">{child.birthDateLabel}</Text>
                ) : null}
              </Space>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Select
                value={selectedChildId}
                options={bootstrap.children.map((item) => ({
                  value: String(item.id),
                  label: item.name,
                }))}
                onChange={navigateToChild}
                style={{ minWidth: 220 }}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadDashboardData(selectedChildId)}
              >
                {bootstrap.strings.refresh}
              </Button>
              {bootstrap.urls.addChild ? (
                <Button href={bootstrap.urls.addChild}>
                  {bootstrap.strings.addChild}
                </Button>
              ) : null}
            </Space>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="ant-loading-shell">
          <Spin size="large" />
        </div>
      ) : (
        bootstrap.dashboard.sectionOrder.map((sectionId) => {
          const cardKeys = bootstrap.dashboard.cardsBySection[sectionId] || [];
          if (!cardKeys.length) {
            return null;
          }
          const hidden = hiddenSections.includes(sectionId);
          return (
            <Card
              key={sectionId}
              className="ant-section-card"
              title={
                <Space>
                  <Badge color={SECTION_META[sectionId]?.color} />
                  <span>{bootstrap.strings[sectionId] || sectionId}</span>
                </Space>
              }
              extra={
                <Button type="link" onClick={() => toggleSection(sectionId)}>
                  {hidden ? bootstrap.strings.show : bootstrap.strings.hide}
                </Button>
              }
            >
              {!hidden && (
                <Row gutter={[16, 16]}>
                  {cardKeys
                    .filter(
                      (cardKey) =>
                        cardKey !== "card.diaper.quick_entry" &&
                        cardKey !== "card.feedings.quick_entry" &&
                        cardKey !== "card.feedings.breast_quick_entry" &&
                        cardKey !== "card.pumpings.quick_entry" &&
                        cardKey !== "card.sleep.quick_timer",
                    )
                    .map((cardKey) => (
                      <Col
                        xs={24}
                        lg={
                          cardKey === "card.sleep.timeline_day" ||
                          cardKey === "card.sleep.week_chart" ||
                          cardKey === "card.quick_entry.consolidated"
                            ? 24
                            : 12
                        }
                        key={cardKey}
                      >
                        <SummaryCard
                          title={
                            DASHBOARD_CARD_TITLES[cardKey] ||
                            bootstrap.strings.migrationPending
                          }
                        >
                          {cardKey === "card.quick_entry.consolidated" ? (
                            renderQuickEntryCard()
                          ) : cardKey === "card.sleep.timeline_day" ? (
                            renderSleepTimelineCard()
                          ) : cardKey === "card.sleep.week_chart" ? (
                            <SleepWeekChart
                              sleepItems={dashboardData.weekSleepItems}
                            />
                          ) : (
                            cards[cardKey] || (
                              <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={bootstrap.strings.migrationPending}
                              />
                            )
                          )}
                        </SummaryCard>
                      </Col>
                    ))}
                </Row>
              )}
            </Card>
          );
        })
      )}
    </Space>
  );
}
