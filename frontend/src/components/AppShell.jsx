import React, { useState, useEffect } from "react";
import {
  Alert,
  Button,
  Drawer,
  Grid,
  Layout,
  Menu,
  Select,
  Space,
  Typography,
} from "antd";
import {
  BulbOutlined,
  PlusOutlined,
  HomeOutlined,
  HistoryOutlined,
  EllipsisOutlined,
  DesktopOutlined,
  EditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Content, Sider } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

/* ── localStorage helpers ──────────────────────────────────────── */
const CHILDREN_CACHE_KEY = "bb_nav_children";
const SELECTED_SLUG_KEY = "bb_selected_child";

function readChildrenCache() {
  try {
    return JSON.parse(localStorage.getItem(CHILDREN_CACHE_KEY) || "[]");
  } catch {
    return [];
  }
}
function readSelectedSlug() {
  try {
    return localStorage.getItem(SELECTED_SLUG_KEY) || null;
  } catch {
    return null;
  }
}
function writeChildrenCache(children) {
  try {
    localStorage.setItem(CHILDREN_CACHE_KEY, JSON.stringify(children));
  } catch {}
}
function writeSelectedSlug(slug) {
  try {
    localStorage.setItem(SELECTED_SLUG_KEY, slug);
  } catch {}
}

/* ── Theme switcher ────────────────────────────────────────────── */
function ThemeSwitcher({ themeMode, onThemeModeChange, compact = false }) {
  const modes = [
    { key: "light", icon: <SunOutlined />, label: "Light theme" },
    { key: "dark", icon: <MoonOutlined />, label: "Dark theme" },
    { key: "system", icon: <DesktopOutlined />, label: "System theme" },
  ];
  return (
    <div className={`ant-theme-switcher ${compact ? "is-compact" : ""}`}>
      {modes.map((mode) => (
        <Button
          key={mode.key}
          type={themeMode === mode.key ? "primary" : "text"}
          icon={mode.icon}
          aria-label={mode.label}
          title={mode.label}
          onClick={() => onThemeModeChange(mode.key)}
          className="ant-theme-switcher-btn"
        />
      ))}
    </div>
  );
}

/* ── Child selector in sidebar ─────────────────────────────────── */
function ChildNavSelector({ children, selectedSlug, collapsed }) {
  if (!children.length) return null;

  function onChange(slug) {
    writeSelectedSlug(slug);
    const child = children.find((c) => c.slug === slug);
    if (child?.dashboardUrl) window.location.assign(child.dashboardUrl);
  }

  if (collapsed) {
    const child = children.find((c) => c.slug === selectedSlug);
    return (
      <div
        className="ant-child-selector ant-child-selector--collapsed"
        title={child?.name || ""}
        onClick={() => {
          // On collapse, cycle through children
          const idx = children.findIndex((c) => c.slug === selectedSlug);
          const next = children[(idx + 1) % children.length];
          onChange(next.slug);
        }}
      >
        <UserOutlined style={{ fontSize: 16, opacity: 0.7 }} />
        <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>
          {child?.name?.split(" ")[0]?.slice(0, 6) ?? "?"}
        </span>
      </div>
    );
  }

  return (
    <div className="ant-child-selector">
      <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block" }}>
        {children.length > 1 ? "Child" : children[0]?.name}
      </Text>
      {children.length > 1 ? (
        <Select
          value={selectedSlug || undefined}
          onChange={onChange}
          options={children.map((c) => ({ value: c.slug, label: c.name }))}
          style={{ width: "100%" }}
          size="middle"
          placeholder="Select child"
        />
      ) : (
        <Text strong style={{ fontSize: 15 }}>
          {children[0]?.name}
        </Text>
      )}
    </div>
  );
}

/* ── Main AppShell ─────────────────────────────────────────────── */
export function AppShell({
  bootstrap,
  children,
  themeMode,
  effectiveTheme,
  onThemeModeChange,
}) {
  const screens = useBreakpoint();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Build nav children: prefer bootstrap.children, fall back to localStorage
  const navChildren = bootstrap.children?.length
    ? bootstrap.children
    : readChildrenCache();

  // Selected child: prefer bootstrap.currentChild, fall back to localStorage
  const selectedSlug =
    bootstrap.currentChild?.slug ||
    readSelectedSlug() ||
    navChildren[0]?.slug ||
    null;

  // Cache to localStorage whenever we have fresh data
  useEffect(() => {
    if (bootstrap.children?.length) writeChildrenCache(bootstrap.children);
    if (bootstrap.currentChild?.slug) writeSelectedSlug(bootstrap.currentChild.slug);
  }, []);

  function handleLogout() {
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
  }

  const isDesktop = Boolean(screens.md);
  const isAuthLayout = bootstrap.layout === "auth";
  const s = bootstrap.strings;

  // Quick Entry URL: append selected child slug when available
  const quickEntryUrl = selectedSlug
    ? `${bootstrap.urls.quickEntry}?child=${selectedSlug}`
    : bootstrap.urls.quickEntry;

  // Build topic URLs: prefer bootstrap.urls.topicPages (dashboard page);
  // fall back to constructing from selectedSlug (all other pages).
  const topicPages =
    bootstrap.urls.topicPages ||
    (selectedSlug
      ? {
          sleep: `/children/${selectedSlug}/topics/sleep/`,
          feeding: `/children/${selectedSlug}/topics/feeding/`,
          diaper: `/children/${selectedSlug}/topics/diaper/`,
          pumping: `/children/${selectedSlug}/topics/pumping/`,
        }
      : null);

  const insightsMenuItem = {
    key: "insights-menu",
    icon: <BulbOutlined />,
    label: s.insights || "Insights",
    children: topicPages
      ? [
          { key: topicPages.sleep, label: s.sleepLabel || "Sleep" },
          { key: topicPages.feeding, label: s.feedingLabel || "Feeding" },
          { key: topicPages.diaper, label: s.diaperLabel || "Diaper" },
          { key: topicPages.pumping, label: s.pumpingLabel || "Pumping" },
        ]
      : [
          {
            key: "__no-child__",
            label: s.selectChildFirst || "Select a child first",
            disabled: true,
          },
        ],
  };

  const navItems = [
    {
      key: bootstrap.urls.dashboard,
      icon: <HomeOutlined />,
      label: s.dashboard,
    },
    {
      key: quickEntryUrl,
      icon: <EditOutlined />,
      label: s.quickEntry || "Quick Entry",
    },
    insightsMenuItem,
    {
      key: bootstrap.urls.timeline,
      icon: <HistoryOutlined />,
      label: s.timeline,
    },
    ...(bootstrap.urls.childrenList
      ? [
          { type: "divider" },
          {
            key: bootstrap.urls.childrenList,
            icon: <UnorderedListOutlined />,
            label: s.children || "Children",
          },
          ...(bootstrap.urls.addChild
            ? [
                {
                  key: bootstrap.urls.addChild,
                  icon: <PlusOutlined />,
                  label: s.addChild || "Add Child",
                },
              ]
            : []),
        ]
      : []),
    { type: "divider" },
    {
      key: bootstrap.urls.settings,
      icon: <SettingOutlined />,
      label: s.settings,
    },
    {
      key: "__logout__",
      icon: <LogoutOutlined />,
      label: s.logout,
    },
  ];

  function handleNavClick({ key }) {
    if (key === "__logout__") {
      handleLogout();
      return;
    }
    // Dashboard click: go to selected child's dashboard
    if (key === bootstrap.urls.dashboard) {
      const child = navChildren.find((c) => c.slug === selectedSlug);
      const url = child?.dashboardUrl || bootstrap.urls.dashboard;
      window.location.assign(url);
      return;
    }
    if (key.startsWith("/")) {
      window.location.assign(key);
    }
  }

  // Strip query string for path matching so /quick-entry/?child=x matches the nav key
  const currentPathBase = bootstrap.currentPath.split("?")[0];
  const keyPathOf = (key) => key?.split?.("?")?.[0] ?? key;

  const selectedKey =
    bootstrap.activeNavKey === null
      ? null
      : bootstrap.activeNavKey ||
        (() => {
          for (const item of navItems) {
            if (item.children) {
              for (const child of item.children) {
                if (
                  child.key !== "__logout__" &&
                  currentPathBase.startsWith(keyPathOf(child.key))
                ) {
                  return child.key;
                }
              }
            } else if (
              item.key !== "__logout__" &&
              item.key?.startsWith?.("/") &&
              currentPathBase.startsWith(keyPathOf(item.key))
            ) {
              return item.key;
            }
          }
          return bootstrap.urls.dashboard;
        })();

  const childSwitcher = bootstrap.childSwitcher;

  function handleChildSwitch(targetHref) {
    if (targetHref) window.location.assign(targetHref);
  }

  const brand = (
    <div className="ant-shell-brand">
      <img
        src="/static/babybuddy/logo/icon-brand.png"
        alt=""
        width="36"
        height="36"
      />
      {!collapsed && <span>Baby Buddy</span>}
    </div>
  );

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={selectedKey ? [selectedKey] : []}
      items={navItems}
      onClick={handleNavClick}
      className="ant-shell-menu"
    />
  );

  const pageMeta = {
    "dashboard-home": { eyebrow: null, title: null },
    "dashboard-child": { eyebrow: null, title: null },
    "child-detail": {
      eyebrow: s.timeline,
      title: bootstrap.childDetail?.name || s.timeline,
    },
    settings: { eyebrow: null, title: null },
    list: {
      eyebrow: bootstrap.listPage?.kicker || s.list,
      title: bootstrap.listPage?.title || s.list,
    },
    form: {
      eyebrow: bootstrap.formPage?.kicker || s.form,
      title: bootstrap.formPage?.title || s.form,
    },
    "confirm-delete": {
      eyebrow: s.dangerZone,
      title: bootstrap.formPage?.title || s.confirmDelete,
    },
    "tag-detail": {
      eyebrow: s.overview,
      title: bootstrap.tagDetail?.name || s.overview,
    },
    "timer-detail": {
      eyebrow: s.timeline,
      title: bootstrap.timerDetail?.name || s.timeline,
    },
    timeline: {
      eyebrow: bootstrap.timelinePage?.kicker || s.timeline,
      title: bootstrap.timelinePage?.title || s.timeline,
    },
    "report-list": { eyebrow: s.overview, title: s.reports },
    "report-detail": {
      eyebrow: bootstrap.reportDetail?.category || s.reports,
      title: bootstrap.reportDetail?.title || s.reports,
    },
    welcome: {
      eyebrow: s.welcome,
      title: s.welcomeTitle || s.welcome,
    },
    message: {
      eyebrow: bootstrap.messagePage?.kicker || s.overview,
      title: bootstrap.messagePage?.title || s.overview,
    },
    "device-access": { eyebrow: s.settings, title: s.addDevice },
    "auth-form": {
      eyebrow: bootstrap.formPage?.kicker || s.welcome,
      title: bootstrap.formPage?.title || s.login,
    },
    "topic-detail": { eyebrow: null, title: null },
    insights: { eyebrow: null, title: null },
    "quick-entry": {
      eyebrow: s.quickEntry || "Quick Actions",
      title: bootstrap.currentChild?.name || s.quickEntry || "Quick Entry",
    },
  }[bootstrap.pageType] || { eyebrow: s.dashboard, title: s.dashboard };

  if (isAuthLayout) {
    return (
      <div className="ant-auth-shell">
        <div className="ant-auth-brand">
          <img
            src="/static/babybuddy/logo/icon-brand.png"
            alt=""
            width="72"
            height="72"
          />
          <span>Baby Buddy</span>
        </div>
        <div className="ant-auth-content">
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {(bootstrap.messages || []).map((message, index) => (
              <Alert
                key={`${message.type}-${index}`}
                type={message.type || "info"}
                showIcon
                message={message.message}
              />
            ))}
            {children}
          </Space>
        </div>
      </div>
    );
  }

  return (
    <Layout className="ant-shell" data-effective-theme={effectiveTheme}>
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
            <ChildNavSelector
              children={navChildren}
              selectedSlug={selectedSlug}
              collapsed={collapsed}
            />
            {menu}
            <ThemeSwitcher
              themeMode={themeMode}
              onThemeModeChange={onThemeModeChange}
              compact={collapsed}
            />
          </div>
        </Sider>
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          placement="bottom"
          height="auto"
          title={null}
          closeIcon={null}
          styles={{ body: { padding: "20px 20px 12px" } }}
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {navChildren.length > 1 && (
              <Select
                value={selectedSlug || undefined}
                onChange={(slug) => {
                  writeSelectedSlug(slug);
                  const child = navChildren.find((c) => c.slug === slug);
                  if (child?.dashboardUrl) window.location.assign(child.dashboardUrl);
                }}
                options={navChildren.map((c) => ({ value: c.slug, label: c.name }))}
                style={{ width: "100%" }}
                placeholder="Select child"
              />
            )}
            {bootstrap.urls.childrenList && (
              <Button
                type="text"
                icon={<UnorderedListOutlined />}
                href={bootstrap.urls.childrenList}
                block
                style={{ textAlign: "left", justifyContent: "flex-start" }}
              >
                {s.children}
              </Button>
            )}
            {bootstrap.urls.addChild && (
              <Button
                type="text"
                icon={<PlusOutlined />}
                href={bootstrap.urls.addChild}
                block
                style={{ textAlign: "left", justifyContent: "flex-start" }}
              >
                {s.addChild}
              </Button>
            )}
            <ThemeSwitcher
              themeMode={themeMode}
              onThemeModeChange={onThemeModeChange}
            />
            <Button danger icon={<LogoutOutlined />} onClick={handleLogout} block>
              {s.logout}
            </Button>
          </Space>
        </Drawer>
      )}
      <Layout>
        {(pageMeta.eyebrow || pageMeta.title) && (
          <div className="ant-shell-header-band">
            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "space-between",
                alignItems: "flex-start",
                width: "100%",
                flexWrap: "wrap",
              }}
            >
              <div>
                {pageMeta.eyebrow && (
                  <div className="ant-shell-header-band__eyebrow">
                    {pageMeta.eyebrow}
                  </div>
                )}
                <div className="ant-shell-header-band__title">
                  {pageMeta.title}
                </div>
              </div>
              {childSwitcher?.options?.length ? (
                <Space size={8} wrap style={{ paddingTop: 4 }}>
                  <Text type="secondary">{childSwitcher.label}</Text>
                  <Select
                    value={childSwitcher.value}
                    onChange={(value) =>
                      handleChildSwitch(
                        childSwitcher.options.find((item) => item.value === value)?.href,
                      )
                    }
                    options={childSwitcher.options.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    style={{ minWidth: isDesktop ? 220 : 180 }}
                  />
                </Space>
              ) : null}
            </div>
          </div>
        )}
        <Content className="ant-shell-content">
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {(bootstrap.messages || []).map((message, index) => (
              <Alert
                key={`${message.type}-${index}`}
                type={message.type || "info"}
                showIcon
                message={message.message}
              />
            ))}
            {children}
          </Space>
        </Content>
      </Layout>

      {!isDesktop && (
        <nav className="ant-bottom-nav">
          {[
            { key: bootstrap.urls.dashboard, icon: <HomeOutlined />, label: s.dashboard },
            {
              key: topicPages?.sleep || bootstrap.urls.dashboard,
              icon: <BulbOutlined />,
              label: s.insights || "Insights",
            },
            { key: quickEntryUrl, icon: <EditOutlined />, label: s.quickEntry || "Quick Entry" },
            { key: bootstrap.urls.timeline, icon: <HistoryOutlined />, label: s.timeline },
            { key: "__more__", icon: <EllipsisOutlined />, label: "More" },
          ].map((item) => {
            const isActive = item.key !== "__more__" && selectedKey === item.key;
            return (
              <button
                key={item.key}
                className={`ant-bottom-nav-item${isActive ? " is-active" : ""}`}
                onClick={() =>
                  item.key === "__more__"
                    ? setMobileOpen(true)
                    : handleNavClick({ key: item.key })
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </Layout>
  );
}
