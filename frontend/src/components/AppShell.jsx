import React, { useState } from "react";
import { QuickLogSheet } from "./QuickLogSheet";
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
  HeartOutlined,
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
} from "@ant-design/icons";

const { Content, Sider } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

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
  const [sheetOpen, setSheetOpen] = useState(false);

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
  const childrenMenuItem = bootstrap.urls.childrenList
    ? {
        key: "children-menu",
        icon: <HeartOutlined />,
        label: bootstrap.strings.children,
        children: [
          {
            key: bootstrap.urls.childrenList,
            icon: <UnorderedListOutlined />,
            label: "Overview",
          },
          ...(bootstrap.urls.addChild
            ? [
                {
                  key: bootstrap.urls.addChild,
                  icon: <PlusOutlined />,
                  label: bootstrap.strings.addChild,
                },
              ]
            : []),
        ],
      }
    : null;

  const topicPages = bootstrap.urls.topicPages;
  const insightsMenuItem = {
    key: "insights-menu",
    icon: <BulbOutlined />,
    label: bootstrap.strings.insights || "Insights",
    children: topicPages
      ? [
          {
            key: topicPages.sleep,
            label: bootstrap.strings.sleepLabel || "Sleep",
          },
          {
            key: topicPages.feeding,
            label: bootstrap.strings.feedingLabel || "Feeding",
          },
          {
            key: topicPages.diaper,
            label: bootstrap.strings.diaperLabel || "Diaper",
          },
          {
            key: topicPages.pumping,
            label: bootstrap.strings.pumpingLabel || "Pumping",
          },
        ]
      : [
          {
            key: "__no-child__",
            label: bootstrap.strings.selectChildFirst || "Select a child first",
            disabled: true,
          },
        ],
  };

  const navItems = [
    {
      key: bootstrap.urls.dashboard,
      icon: <HomeOutlined />,
      label: bootstrap.strings.dashboard,
    },
    ...(bootstrap.currentChild
      ? [
          {
            key: "__quick_entry__",
            icon: <EditOutlined />,
            label: bootstrap.strings.quickEntry || "Quick Entry",
          },
        ]
      : []),
    insightsMenuItem,
    {
      key: bootstrap.urls.timeline,
      icon: <HistoryOutlined />,
      label: bootstrap.strings.timeline,
    },
    ...(childrenMenuItem ? [{ type: "divider" }, childrenMenuItem] : []),
    { type: "divider" },
    {
      key: bootstrap.urls.settings,
      icon: <SettingOutlined />,
      label: bootstrap.strings.settings,
    },
    {
      key: "__logout__",
      icon: <LogoutOutlined />,
      label: bootstrap.strings.logout,
    },
  ];

  function handleNavClick({ key }) {
    if (key === "__logout__") {
      handleLogout();
      return;
    }
    if (key === "__quick_entry__") {
      setSheetOpen(true);
      return;
    }
    if (key.startsWith("/")) {
      window.location.assign(key);
    }
  }

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
                  bootstrap.currentPath.startsWith(child.key)
                ) {
                  return child.key;
                }
              }
            } else if (
              item.key !== "__logout__" &&
              bootstrap.currentPath.startsWith(item.key)
            ) {
              return item.key;
            }
          }
          return bootstrap.urls.dashboard;
        })();

  const childSwitcher = bootstrap.childSwitcher;

  function handleChildSwitch(targetHref) {
    if (targetHref) {
      window.location.assign(targetHref);
    }
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
    "dashboard-home": {
      eyebrow: null,
      title: null,
    },
    "dashboard-child": {
      eyebrow: null,
      title: null,
    },
    "child-detail": {
      eyebrow: bootstrap.strings.timeline,
      title: bootstrap.childDetail?.name || bootstrap.strings.timeline,
    },
    settings: {
      eyebrow: null,
      title: null,
    },
    list: {
      eyebrow: bootstrap.listPage?.kicker || bootstrap.strings.list,
      title: bootstrap.listPage?.title || bootstrap.strings.list,
    },
    form: {
      eyebrow: bootstrap.formPage?.kicker || bootstrap.strings.form,
      title: bootstrap.formPage?.title || bootstrap.strings.form,
    },
    "confirm-delete": {
      eyebrow: bootstrap.strings.dangerZone,
      title: bootstrap.formPage?.title || bootstrap.strings.confirmDelete,
    },
    "tag-detail": {
      eyebrow: bootstrap.strings.overview,
      title: bootstrap.tagDetail?.name || bootstrap.strings.overview,
    },
    "timer-detail": {
      eyebrow: bootstrap.strings.timeline,
      title: bootstrap.timerDetail?.name || bootstrap.strings.timeline,
    },
    timeline: {
      eyebrow: bootstrap.timelinePage?.kicker || bootstrap.strings.timeline,
      title: bootstrap.timelinePage?.title || bootstrap.strings.timeline,
    },
    "report-list": {
      eyebrow: bootstrap.strings.overview,
      title: bootstrap.strings.reports,
    },
    "report-detail": {
      eyebrow: bootstrap.reportDetail?.category || bootstrap.strings.reports,
      title: bootstrap.reportDetail?.title || bootstrap.strings.reports,
    },
    welcome: {
      eyebrow: bootstrap.strings.welcome,
      title: bootstrap.strings.welcomeTitle || bootstrap.strings.welcome,
    },
    message: {
      eyebrow: bootstrap.messagePage?.kicker || bootstrap.strings.overview,
      title: bootstrap.messagePage?.title || bootstrap.strings.overview,
    },
    "device-access": {
      eyebrow: bootstrap.strings.settings,
      title: bootstrap.strings.addDevice,
    },
    "auth-form": {
      eyebrow: bootstrap.formPage?.kicker || bootstrap.strings.welcome,
      title: bootstrap.formPage?.title || bootstrap.strings.login,
    },
    "topic-detail": {
      eyebrow: null,
      title: null,
    },
    insights: {
      eyebrow: null,
      title: null,
    },
  }[bootstrap.pageType] || {
    eyebrow: bootstrap.strings.dashboard,
    title: bootstrap.strings.dashboard,
  };

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
            {childrenMenuItem && (
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                {bootstrap.urls.childrenList && (
                  <Button
                    type="text"
                    icon={<HeartOutlined />}
                    href={bootstrap.urls.childrenList}
                    block
                    style={{ textAlign: "left", justifyContent: "flex-start" }}
                  >
                    {bootstrap.strings.children}
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
                    {bootstrap.strings.addChild}
                  </Button>
                )}
              </Space>
            )}
            <ThemeSwitcher
              themeMode={themeMode}
              onThemeModeChange={onThemeModeChange}
            />
            <Button
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              block
            >
              {bootstrap.strings.logout}
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
                        childSwitcher.options.find(
                          (item) => item.value === value,
                        )?.href,
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

      {/* Floating Action Button — only shown when a child is selected */}
      {bootstrap.currentChild && (
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Quick log entry"
          style={{
            position: "fixed",
            bottom: `calc(${isDesktop ? "20px" : "72px"} + env(safe-area-inset-bottom))`,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--app-primary)",
            border: "none",
            color: "#fff",
            fontSize: 28,
            lineHeight: 1,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(77,182,255,0.4)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      )}

      <QuickLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        child={bootstrap.currentChild ?? null}
        csrfToken={bootstrap.csrfToken}
        quickStatus={bootstrap.quickStatus ?? null}
        strings={bootstrap.strings}
      />

      {!isDesktop && (
        <nav className="ant-bottom-nav">
          {[
            {
              key: bootstrap.urls.dashboard,
              icon: <HomeOutlined />,
              label: bootstrap.strings.dashboard,
            },
            {
              key: topicPages?.sleep || bootstrap.urls.dashboard,
              icon: <BulbOutlined />,
              label: bootstrap.strings.insights || "Insights",
            },
            {
              key: bootstrap.urls.timeline,
              icon: <HistoryOutlined />,
              label: bootstrap.strings.timeline,
            },
            {
              key: bootstrap.urls.settings,
              icon: <SettingOutlined />,
              label: bootstrap.strings.settings,
            },
            {
              key: "__more__",
              icon: <EllipsisOutlined />,
              label: "More",
            },
          ].map((item) => {
            const isActive =
              item.key !== "__more__" && selectedKey === item.key;
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
