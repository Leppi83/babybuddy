import React, { useState } from "react";
import { Alert, Button, Drawer, Grid, Layout, Menu, Space, Typography } from "antd";
import {
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  SwapOutlined,
} from "@ant-design/icons";

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

export function AppShell({ bootstrap, children }) {
  const screens = useBreakpoint();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isDesktop = Boolean(screens.md);
  const isAuthLayout = bootstrap.layout === "auth";
  const navItems = [
    {
      key: bootstrap.urls.dashboard,
      icon: <DashboardOutlined />,
      label: bootstrap.strings.dashboard,
    },
    {
      key: bootstrap.urls.timeline,
      icon: <SwapOutlined />,
      label: bootstrap.strings.timeline,
    },
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

  const selectedKey =
    bootstrap.activeNavKey === null
      ? null
      : bootstrap.activeNavKey ||
        navItems.find(
          (item) =>
            item.key !== "__logout__" &&
            bootstrap.currentPath.startsWith(item.key),
        )?.key ||
        bootstrap.urls.dashboard;

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
      eyebrow: bootstrap.strings.overview,
      title: bootstrap.strings.dashboard,
    },
    "dashboard-child": {
      eyebrow: bootstrap.strings.childDashboard,
      title: bootstrap.currentChild?.name || bootstrap.strings.dashboard,
    },
    "child-detail": {
      eyebrow: bootstrap.strings.timeline,
      title: bootstrap.childDetail?.name || bootstrap.strings.timeline,
    },
    settings: {
      eyebrow: bootstrap.strings.settings,
      title: bootstrap.strings.userSettings,
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
              <Text type="secondary">{pageMeta.eyebrow}</Text>
              <Title level={3} style={{ margin: 0, color: "#f8fafc" }}>
                {pageMeta.title}
              </Title>
            </div>
          </Space>
        </Header>
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
    </Layout>
  );
}
