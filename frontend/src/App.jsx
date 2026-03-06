import { useEffect, useRef, useState } from "react";
import {
  App as AntApp,
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Drawer,
  Empty,
  Grid,
  Image,
  Layout,
  Menu,
  Row,
  Select,
  Segmented,
  Space,
  Spin,
  Statistic,
  Tag,
  theme,
  Typography
} from "antd";
import {
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  SettingOutlined,
  SwapOutlined,
  UserOutlined
} from "@ant-design/icons";
import deDE from "antd/locale/de_DE";
import enUS from "antd/locale/en_US";
import dayjs from "dayjs";
import "dayjs/locale/de";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const SECTION_META = {
  diaper: { color: "#ff7875" },
  feedings: { color: "#69b1ff" },
  pumpings: { color: "#b37feb" },
  sleep: { color: "#ffd666" },
  tummytime: { color: "#5cdb8b" }
};

const DASHBOARD_CARD_TITLES = {
  "card.diaper.quick_entry": "Quick Entry",
  "card.diaper.last": "Last Nappy Change",
  "card.diaper.types": "Nappy Changes",
  "card.feedings.last": "Last Feeding",
  "card.feedings.method": "Last Feeding Method",
  "card.feedings.recent": "Recent Feedings",
  "card.feedings.breastfeeding": "Breastfeeding",
  "card.pumpings.last": "Last Pumping",
  "card.sleep.timers": "Timers",
  "card.sleep.quick_timer": "Sleep Timer",
  "card.sleep.last": "Last Sleep",
  "card.sleep.recommendations": "Sleep Recommendations",
  "card.sleep.recent": "Recent Sleep",
  "card.sleep.naps_day": "Today's Naps",
  "card.sleep.statistics": "Statistics",
  "card.sleep.timeline_day": "Sleep Timeline (24h)",
  "card.tummytime.day": "Today's Tummy Time"
};

function asItems(payload) {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
}

function createApiClient(csrfToken) {
  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return null;
    }
    return response.json();
  }

  return {
    get: (url) => request(url, { method: "GET" }),
    postForm: async (url, formData) =>
      fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest"
        },
        body: formData.toString()
      })
  };
}

function AppShell({ bootstrap, children }) {
  const screens = useBreakpoint();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isDesktop = Boolean(screens.md);
  const navItems = [
    {
      key: bootstrap.urls.dashboard,
      icon: <DashboardOutlined />,
      label: bootstrap.strings.dashboard
    },
    {
      key: bootstrap.urls.timeline,
      icon: <SwapOutlined />,
      label: bootstrap.strings.timeline
    },
    {
      key: bootstrap.urls.settings,
      icon: <SettingOutlined />,
      label: bootstrap.strings.settings
    },
    {
      key: "__logout__",
      icon: <LogoutOutlined />,
      label: bootstrap.strings.logout
    }
  ];

  function handleNavClick({ key }) {
    if (key === "__logout__") {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = bootstrap.urls.logout;
      const csrf = document.createElement("input");
      csrf.type = "hidden";
      csrf.name = "csrfmiddlewaretoken";
      csrf.value = bootstrap.csrfToken;
      form.appendChild(csrf);
      document.body.appendChild(form);
      form.submit();
      return;
    }
    window.location.assign(key);
  }

  const selectedItem = navItems.find((item) =>
    item.key !== "__logout__" && bootstrap.currentPath.startsWith(item.key)
  );
  const selectedKey = selectedItem ? selectedItem.key : bootstrap.urls.dashboard;

  const brand = (
    <div className="ant-shell-brand">
      <img src="/static/babybuddy/logo/icon-brand.png" alt="" width="36" height="36" />
      {!collapsed && <span>Baby Buddy</span>}
    </div>
  );

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      items={navItems}
      onClick={handleNavClick}
      className="ant-shell-menu"
    />
  );

  return (
    <Layout className="ant-shell">
      {isDesktop ? (
        <Sider
          width={280}
          collapsedWidth={88}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          theme="light"
          className="ant-shell-sider"
        >
          <div className="ant-shell-sider-inner">
            {brand}
            <Button
              className="ant-shell-collapse"
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
            />
            {menu}
          </div>
        </Sider>
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          placement="left"
          width={300}
          styles={{ body: { padding: 16 } }}
        >
          {brand}
          {menu}
        </Drawer>
      )}
      <Layout>
        <Header className="ant-shell-header">
          <Space size="middle">
            {!isDesktop && (
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setMobileOpen(true)}
              />
            )}
            <div>
              <Text type="secondary">{bootstrap.strings.childDashboard}</Text>
              <Title level={3} style={{ margin: 0, color: "#f8fafc" }}>
                {bootstrap.user.displayName}
              </Title>
            </div>
          </Space>
        </Header>
        <Content className="ant-shell-content">{children}</Content>
      </Layout>
    </Layout>
  );
}

function DashboardHomePage({ bootstrap }) {
  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Space direction="vertical" size={6}>
          <Text type="secondary">{bootstrap.strings.overview}</Text>
          <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
            {bootstrap.strings.dashboard}
          </Title>
          <Text style={{ color: "#cbd5e1" }}>
            React + Ant Design is now the target UI path for Baby Buddy.
          </Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {bootstrap.children.map((child) => (
          <Col xs={24} md={12} xl={8} key={child.id}>
            <Card
              hoverable
              className="ant-dashboard-card"
              cover={
                <div className="ant-child-image-wrap">
                  <Image
                    preview={false}
                    src={child.pictureUrl}
                    alt=""
                    className="ant-child-image"
                  />
                </div>
              }
              actions={[
                <Button
                  type="link"
                  key="open"
                  href={child.dashboardUrl}
                  icon={<DashboardOutlined />}
                >
                  {bootstrap.strings.openDashboard}
                </Button>
              ]}
            >
              <Card.Meta
                avatar={<UserOutlined />}
                title={child.name}
                description={
                  <Space direction="vertical" size={4}>
                    <Text style={{ color: "#cbd5e1" }}>
                      {bootstrap.strings.born}: {child.birthDateLabel}
                    </Text>
                  </Space>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
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

function MiniTimeline({ items, locale }) {
  const hours = Array.from({ length: 24 }, (_, index) => index);

  function minutesBetween(start, end) {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }

  function barForHour(hour) {
    const now = new Date();
    const slotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime());
    slotEnd.setHours(hour + 1, 0, 0, 0);

    let best = null;
    let bestMinutes = 0;

    items.forEach((entry) => {
      const start = new Date(entry.start);
      const end = new Date(entry.end);
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
          minute: "2-digit"
        }).format(new Date(best.start))} - ${new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date(best.end))}`}
      />
    );
  }

  return (
    <div className="ant-timeline">
      <div className="ant-timeline-bars">
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
  );
}

function ChildDashboardPage({ bootstrap }) {
  const ant = AntApp.useApp();
  const api = useRef(createApiClient(bootstrap.csrfToken));
  const [selectedChildId, setSelectedChildId] = useState(String(bootstrap.currentChild.id));
  const [hiddenSections, setHiddenSections] = useState(bootstrap.dashboard.hiddenSections || []);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState({});
  const [diaperDate, setDiaperDate] = useState(dayjs());
  const [diaperTime, setDiaperTime] = useState(dayjs());
  const child = bootstrap.children.find((item) => String(item.id) === String(selectedChildId));
  const locale = bootstrap.locale || "en";

  useEffect(() => {
    loadDashboardData(selectedChildId);
  }, [selectedChildId]);

  async function persistHidden(nextHidden) {
    const payload = new URLSearchParams();
    payload.set("action", "autosave_dashboard_layout");
    payload.set("dashboard_section_order", bootstrap.dashboard.sectionOrder.join(","));
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
      timeStyle: "short"
    }).format(new Date(value));
  }

  function formatTime(value) {
    if (!value) {
      return "n/a";
    }
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit"
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

  async function loadDashboardData(childId) {
    if (!childId) {
      return;
    }

    setLoading(true);
    const query = `child=${encodeURIComponent(childId)}`;

    try {
      const [changes, feedings, pumpings, sleeps, tummyTimes, timers, recommendations] =
        await Promise.all([
          api.current.get(`/api/changes/?${query}&limit=20`),
          api.current.get(`/api/feedings/?${query}&limit=20`),
          api.current.get(`/api/pumping/?${query}&limit=20`),
          api.current.get(`/api/sleep/?${query}&limit=30`),
          api.current.get(`/api/tummy-times/?${query}&limit=20`),
          api.current.get(`/api/timers/?${query}&limit=5`),
          api.current.get(
            `/api/children/${encodeURIComponent(child.slug)}/sleep-recommendations/`
          )
        ]);

      const changeItems = asItems(changes);
      const feedingItems = asItems(feedings);
      const pumpingItems = asItems(pumpings);
      const sleepItems = asItems(sleeps);
      const tummyItems = asItems(tummyTimes);
      const timerItems = asItems(timers);

      const lastChange = changeItems[0];
      const lastFeeding = feedingItems[0];
      const lastPumping = pumpingItems[0];
      const lastSleep = sleepItems[0];
      const feedingsToday = feedingItems.filter((item) => isToday(item.start));
      const napsToday = sleepItems.filter((item) => isToday(item.start) && item.nap);

      const methodCounts = feedingItems.reduce((result, item) => {
        const key = item.method || "unknown";
        result[key] = (result[key] || 0) + 1;
        return result;
      }, {});
      const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0];

      setCards({
        "card.diaper.last": lastChange ? (
          <Space direction="vertical" size={4}>
            <Statistic title="Last recorded" value={formatDateTime(lastChange.time)} />
            <Space wrap>
              <Tag color={lastChange.wet ? "blue" : "default"}>Wet</Tag>
              <Tag color={lastChange.solid ? "gold" : "default"}>Solid</Tag>
            </Space>
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={bootstrap.strings.noData} />
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
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={bootstrap.strings.noData} />
        ),
        "card.feedings.method": topMethod ? (
          <Space direction="vertical" size={4}>
            <Statistic title="Dominant method" value={topMethod[0]} />
            <Text type="secondary">{topMethod[1]} recent entries</Text>
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={bootstrap.strings.noData} />
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
              value={feedingsToday.filter((item) =>
                String(item.method || "").toLowerCase().includes("breast")
              ).length}
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
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={bootstrap.strings.noData} />
        ),
        "card.sleep.timers": (
          <Space direction="vertical" size={4}>
            <Statistic title="Timers" value={timerItems.length} />
            <Text type="secondary">
              {timerItems[0] ? formatTime(timerItems[0].start) : bootstrap.strings.noData}
            </Text>
          </Space>
        ),
        "card.sleep.quick_timer": (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.sleepTimerPending}
          />
        ),
        "card.sleep.last": lastSleep ? (
          <Space direction="vertical" size={4}>
            <Statistic
              title={lastSleep.nap ? "Nap" : "Sleep"}
              value={durationMinutes(lastSleep.duration)}
              suffix="min"
            />
            <Text type="secondary">
              {formatDateTime(lastSleep.start)} - {formatDateTime(lastSleep.end)}
            </Text>
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={bootstrap.strings.noData} />
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
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={bootstrap.strings.noData} />
        ),
        "card.sleep.recent": (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Sleep entries today"
              value={sleepItems.filter((item) => isToday(item.start)).length}
            />
            <Text type="secondary">{sleepItems.length} recent sleep entries</Text>
          </Space>
        ),
        "card.sleep.naps_day": (
          <Space direction="vertical" size={4}>
            <Statistic title="Naps today" value={napsToday.length} />
            <Text type="secondary">
              {napsToday.reduce((acc, item) => acc + durationMinutes(item.duration), 0)} min
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
                        0
                      ) / sleepItems.length
                    )
                  : 0
              }
              suffix="min"
            />
          </Space>
        ),
        "card.sleep.timeline_day": (
          <MiniTimeline items={sleepItems.filter((item) => item.start && item.end)} locale={locale} />
        ),
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
        )
      });
    } catch (error) {
      ant.message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitDiaperEntry(consistency) {
    const payload = new URLSearchParams();
    payload.set("diaper_quick_entry_action", "create");
    payload.set("diaper_entry_date", diaperDate.format("YYYY-MM-DD"));
    payload.set("diaper_entry_time", diaperTime.format("HH:mm"));
    payload.set("diaper_entry_consistency", consistency);

    const response = await api.current.postForm(bootstrap.urls.current, payload);
    if (response.ok) {
      ant.message.success(bootstrap.strings.saved);
      loadDashboardData(selectedChildId);
      return;
    }
    ant.message.error(bootstrap.strings.saveFailed);
  }

  function navigateToChild(nextChildId) {
    const nextChild = bootstrap.children.find(
      (item) => String(item.id) === String(nextChildId)
    );
    if (!nextChild) {
      return;
    }
    setSelectedChildId(String(nextChild.id));
    if (nextChild.slug !== bootstrap.currentChild.slug) {
      const targetUrl = bootstrap.urls.childDashboardTemplate.replace(
        "__CHILD_SLUG__",
        encodeURIComponent(nextChild.slug)
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
                  label: item.name
                }))}
                onChange={navigateToChild}
                style={{ minWidth: 220 }}
              />
              <Button icon={<ReloadOutlined />} onClick={() => loadDashboardData(selectedChildId)}>
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
                    <Col xs={24} lg={cardKey === "card.sleep.timeline_day" ? 24 : 12} key={cardKey}>
                      <SummaryCard
                        title={DASHBOARD_CARD_TITLES[cardKey] || bootstrap.strings.migrationPending}
                      >
                        {cardKey === "card.diaper.quick_entry" ? (
                          <Space direction="vertical" size={12} style={{ width: "100%" }}>
                            <Row gutter={8}>
                              <Col span={12}>
                                <input
                                  type="date"
                                  value={diaperDate.format("YYYY-MM-DD")}
                                  onChange={(event) => setDiaperDate(dayjs(event.target.value))}
                                  className="ant-native-input"
                                />
                              </Col>
                              <Col span={12}>
                                <input
                                  type="time"
                                  value={diaperTime.format("HH:mm")}
                                  onChange={(event) =>
                                    setDiaperTime(dayjs(`2000-01-01T${event.target.value}`))
                                  }
                                  className="ant-native-input"
                                />
                              </Col>
                            </Row>
                            <Segmented
                              block
                              options={[
                                {
                                  label: bootstrap.strings.liquid,
                                  value: "liquid"
                                },
                                {
                                  label: bootstrap.strings.solid,
                                  value: "solid"
                                }
                              ]}
                              onChange={submitDiaperEntry}
                            />
                          </Space>
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

export function App({ bootstrap }) {
  const antLocale = String(bootstrap.locale || "en").startsWith("de") ? deDE : enUS;

  useEffect(() => {
    if (String(bootstrap.locale || "en").startsWith("de")) {
      dayjs.locale("de");
    } else {
      dayjs.locale("en");
    }
  }, [bootstrap.locale]);

  return (
    <ConfigProvider
      locale={antLocale}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#4db6ff",
          colorBgBase: "#020617",
          colorBgContainer: "#0f172a",
          colorBorder: "#1e3a5f",
          borderRadius: 18
        }
      }}
    >
      <AntApp>
        <AppShell bootstrap={bootstrap}>
          {bootstrap.pageType === "dashboard-home" ? (
            <DashboardHomePage bootstrap={bootstrap} />
          ) : (
            <ChildDashboardPage bootstrap={bootstrap} />
          )}
        </AppShell>
      </AntApp>
    </ConfigProvider>
  );
}
