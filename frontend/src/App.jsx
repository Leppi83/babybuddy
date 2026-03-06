import React, { lazy, Suspense, useEffect } from "react";
import { App as AntApp, ConfigProvider, Spin, theme } from "antd";
import deDE from "antd/locale/de_DE";
import enUS from "antd/locale/en_US";
import dayjs from "dayjs";
import "dayjs/locale/de";
import { AppShell } from "./components/AppShell";

const DashboardHomePage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.DashboardHomePage,
  })),
);
const WelcomePage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.WelcomePage,
  })),
);
const ListPage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.ListPage,
  })),
);
const MessagePage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.MessagePage,
  })),
);
const DeviceAccessPage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.DeviceAccessPage,
  })),
);
const AntFormPage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.AntFormPage,
  })),
);
const ChildDetailPage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.ChildDetailPage,
  })),
);
const TagDetailPage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.TagDetailPage,
  })),
);
const TimerDetailPage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.TimerDetailPage,
  })),
);
const TimelinePage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.TimelinePage,
  })),
);
const ReportListPage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.ReportListPage,
  })),
);
const ReportDetailPage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.ReportDetailPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/DashboardPages").then((module) => ({
    default: module.SettingsPage,
  })),
);
const ChildDashboardPage = lazy(() =>
  import("./pages/DashboardPages").then((module) => ({
    default: module.ChildDashboardPage,
  })),
);

function PageFallback() {
  return (
    <div className="ant-loading-shell">
      <Spin size="large" />
    </div>
  );
}

function RoutedPage({ bootstrap }) {
  if (bootstrap.pageType === "dashboard-home") {
    return <DashboardHomePage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "welcome") {
    return <WelcomePage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "settings") {
    return <SettingsPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "list") {
    return <ListPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "message") {
    return <MessagePage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "device-access") {
    return <DeviceAccessPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "auth-form" || bootstrap.pageType === "form") {
    return <AntFormPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "confirm-delete") {
    return <AntFormPage bootstrap={bootstrap} deleteMode />;
  }
  if (bootstrap.pageType === "child-detail") {
    return <ChildDetailPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "tag-detail") {
    return <TagDetailPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "timer-detail") {
    return <TimerDetailPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "timeline") {
    return <TimelinePage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "report-list") {
    return <ReportListPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "report-detail") {
    return <ReportDetailPage bootstrap={bootstrap} />;
  }
  return <ChildDashboardPage bootstrap={bootstrap} />;
}

export function App({ bootstrap }) {
  const antLocale = String(bootstrap.locale || "en").startsWith("de")
    ? deDE
    : enUS;

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
          borderRadius: 18,
        },
      }}
    >
      <AntApp>
        <AppShell bootstrap={bootstrap}>
          <Suspense fallback={<PageFallback />}>
            <RoutedPage bootstrap={bootstrap} />
          </Suspense>
        </AppShell>
      </AntApp>
    </ConfigProvider>
  );
}
