import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  App as AntApp,
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Form,
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
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  asItems,
  createApiClient,
  DASHBOARD_CARD_TITLES,
  formatElapsedSeconds,
  SECTION_META,
} from "../lib/app-utils";

const { Text, Title } = Typography;

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
        <Col xs={24} lg={4}>
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
    return (
      <div
        className={`ant-timeline-bar ${best.nap ? "nap" : "sleep"}`}
        style={{ height: `${height}%` }}
        title={`${new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(best.start))} - ${new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(best.end))}`}
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
          <span>{strings.now}</span>
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
            <span key={hour}>{String(hour).padStart(2, "0")}</span>
          ))}
        </div>
      </div>
    </div>
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
  const [dashboardData, setDashboardData] = useState({ sleepItems: [] });
  const [diaperDate, setDiaperDate] = useState(dayjs());
  const [diaperTime, setDiaperTime] = useState(dayjs());
  const [diaperConsistency, setDiaperConsistency] = useState("liquid");
  const [sleepTimer, setSleepTimer] = useState(bootstrap.sleepTimer || {});
  const [submittingDiaper, setSubmittingDiaper] = useState(false);
  const [submittingSleepTimer, setSubmittingSleepTimer] = useState(false);
  const [submittingSleepEntry, setSubmittingSleepEntry] = useState(false);
  const [sleepEntryStartDate, setSleepEntryStartDate] = useState(dayjs());
  const [sleepEntryStartTime, setSleepEntryStartTime] = useState(dayjs());
  const [sleepEntryEndDate, setSleepEntryEndDate] = useState(dayjs());
  const [sleepEntryEndTime, setSleepEntryEndTime] = useState(dayjs());
  const [sleepEntryType, setSleepEntryType] = useState("sleep");
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

  function formatDateTime(value) {
    if (!value) {
      return "n/a";
    }
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatTime(value) {
    if (!value) {
      return "n/a";
    }
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function durationMinutes(value) {
    if (value == null) {
      return 0;
    }
    return Math.round(Number(value) / 60);
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
      const [
        changes,
        feedings,
        pumpings,
        sleeps,
        tummyTimes,
        timers,
        recommendations,
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
      ]);

      const changeItems = asItems(changes);
      const feedingItems = asItems(feedings);
      const pumpingItems = asItems(pumpings);
      const sleepItems = asItems(sleeps);
      const tummyItems = asItems(tummyTimes);
      const timerItems = asItems(timers);
      setDashboardData({ sleepItems });

      const lastChange = changeItems[0];
      const lastFeeding = feedingItems[0];
      const lastPumping = pumpingItems[0];
      const lastSleep = sleepItems[0];
      const feedingsToday = feedingItems.filter((item) => isToday(item.start));
      const napsToday = sleepItems.filter(
        (item) => isToday(item.start) && item.nap,
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
              value={formatDateTime(lastChange.time)}
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
              value={durationMinutes(lastFeeding.duration)}
              suffix="min"
            />
            <Text type="secondary">{formatDateTime(lastFeeding.start)}</Text>
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
              value={durationMinutes(lastPumping.duration)}
              suffix="min"
            />
            <Text type="secondary">{formatDateTime(lastPumping.start)}</Text>
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
                ? formatTime(timerItems[0].start)
                : bootstrap.strings.noData}
            </Text>
          </Space>
        ),
        "card.sleep.quick_timer": null,
        "card.sleep.last": lastSleep ? (
          <Space direction="vertical" size={4}>
            <Statistic
              title={lastSleep.nap ? "Nap" : "Sleep"}
              value={durationMinutes(lastSleep.duration)}
              suffix="min"
            />
            <Text type="secondary">
              {formatDateTime(lastSleep.start)} -{" "}
              {formatDateTime(lastSleep.end)}
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
                  ? `Ideal ${formatTime(recommendations.nap.ideal)}`
                  : bootstrap.strings.noData}
              </Text>
            </Card>
            <Card size="small">
              <Text strong>Bedtime</Text>
              <br />
              <Text type="secondary">
                {recommendations.bedtime?.target_bedtime
                  ? `Target ${formatTime(recommendations.bedtime.target_bedtime)}`
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
                sleepItems.length
                  ? Math.round(
                      sleepItems.reduce(
                        (acc, item) => acc + durationMinutes(item.duration),
                        0,
                      ) / sleepItems.length,
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
      } else {
        setSleepTimer({
          running: false,
          startIso: null,
          elapsedSeconds: 0,
        });
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

  async function submitSleepEntry() {
    const payload = new URLSearchParams();
    payload.set("sleep_manual_entry_action", "create");
    payload.set(
      "sleep_entry_start_date",
      sleepEntryStartDate.format("YYYY-MM-DD"),
    );
    payload.set("sleep_entry_start_time", sleepEntryStartTime.format("HH:mm"));
    payload.set("sleep_entry_end_date", sleepEntryEndDate.format("YYYY-MM-DD"));
    payload.set("sleep_entry_end_time", sleepEntryEndTime.format("HH:mm"));
    payload.set("sleep_entry_type", sleepEntryType);

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
          {sleepTimer.running && (
            <Text type="secondary">{bootstrap.strings.sleepTimerActive}</Text>
          )}
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
        <Card
          size="small"
          title={bootstrap.strings.manualEntry}
          style={{ width: "100%" }}
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Row gutter={8}>
              <Col span={12}>
                <label className="ant-dashboard-inline-label">
                  {bootstrap.strings.startDate}
                </label>
                <input
                  type="date"
                  value={sleepEntryStartDate.format("YYYY-MM-DD")}
                  onChange={(event) =>
                    setSleepEntryStartDate(dayjs(event.target.value))
                  }
                  className="ant-native-input"
                />
              </Col>
              <Col span={12}>
                <label className="ant-dashboard-inline-label">
                  {bootstrap.strings.startTime}
                </label>
                <input
                  type="time"
                  value={sleepEntryStartTime.format("HH:mm")}
                  onChange={(event) =>
                    setSleepEntryStartTime(
                      dayjs(`2000-01-01T${event.target.value}`),
                    )
                  }
                  className="ant-native-input"
                />
              </Col>
            </Row>
            <Row gutter={8}>
              <Col span={12}>
                <label className="ant-dashboard-inline-label">
                  {bootstrap.strings.endDate}
                </label>
                <input
                  type="date"
                  value={sleepEntryEndDate.format("YYYY-MM-DD")}
                  onChange={(event) =>
                    setSleepEntryEndDate(dayjs(event.target.value))
                  }
                  className="ant-native-input"
                />
              </Col>
              <Col span={12}>
                <label className="ant-dashboard-inline-label">
                  {bootstrap.strings.endTime}
                </label>
                <input
                  type="time"
                  value={sleepEntryEndTime.format("HH:mm")}
                  onChange={(event) =>
                    setSleepEntryEndTime(
                      dayjs(`2000-01-01T${event.target.value}`),
                    )
                  }
                  className="ant-native-input"
                />
              </Col>
            </Row>
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
            <Space direction="vertical" size={4}>
              <Text type="secondary">{bootstrap.strings.childDashboard}</Text>
              <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
                {bootstrap.currentChild.name}
              </Title>
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
                  {cardKeys.map((cardKey) => (
                    <Col
                      xs={24}
                      lg={cardKey === "card.sleep.timeline_day" ? 24 : 12}
                      key={cardKey}
                    >
                      <SummaryCard
                        title={
                          DASHBOARD_CARD_TITLES[cardKey] ||
                          bootstrap.strings.migrationPending
                        }
                      >
                        {cardKey === "card.diaper.quick_entry" ? (
                          <Space
                            direction="vertical"
                            size={12}
                            style={{ width: "100%" }}
                          >
                            <Row gutter={8}>
                              <Col span={12}>
                                <input
                                  type="date"
                                  value={diaperDate.format("YYYY-MM-DD")}
                                  onChange={(event) =>
                                    setDiaperDate(dayjs(event.target.value))
                                  }
                                  className="ant-native-input"
                                />
                              </Col>
                              <Col span={12}>
                                <input
                                  type="time"
                                  value={diaperTime.format("HH:mm")}
                                  onChange={(event) =>
                                    setDiaperTime(
                                      dayjs(`2000-01-01T${event.target.value}`),
                                    )
                                  }
                                  className="ant-native-input"
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
                        ) : (
                          (cardKey === "card.sleep.quick_timer" &&
                            renderSleepTimerCard()) ||
                          (cardKey === "card.sleep.timeline_day" &&
                            renderSleepTimelineCard()) ||
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
