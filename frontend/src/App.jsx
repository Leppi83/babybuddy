import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
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
const InsightsPage = lazy(() =>
  import("./pages/InsightsPages").then((module) => ({
    default: module.InsightsPage,
  })),
);
const TopicPage = lazy(() =>
  import("./pages/TopicPages").then((module) => ({
    default: module.TopicPage,
  })),
);
const QuickEntryPage = lazy(() =>
  import("./pages/GeneralPages").then((module) => ({
    default: module.QuickEntryPage,
  })),
);
const ExaminationListPage = lazy(() =>
  import("./pages/ExaminationPages").then((module) => ({
    default: module.ExaminationListPage,
  })),
);
const ExaminationFormPage = lazy(() =>
  import("./pages/ExaminationPages").then((module) => ({
    default: module.ExaminationFormPage,
  })),
);
const ChildProfileTimelinePage = lazy(() =>
  import("./pages/ProfileTimelinePages").then((module) => ({
    default: module.ChildProfileTimelinePage,
  })),
);
const ChildGeneralPage = lazy(() =>
  import("./pages/ProfileTimelinePages").then((module) => ({
    default: module.ChildGeneralPage,
  })),
);

const THEME_MODE_KEY = "babybuddy.theme.mode";

function getStoredThemeMode() {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored = window.localStorage.getItem(THEME_MODE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

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
  if (bootstrap.pageType === "insights") {
    return <InsightsPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "topic-detail") {
    return <TopicPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "quick-entry") {
    return <QuickEntryPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "examination-list") {
    return <ExaminationListPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "examination-form") {
    return <ExaminationFormPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "child-profile-timeline") {
    return <ChildProfileTimelinePage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "child-general") {
    return <ChildGeneralPage bootstrap={bootstrap} />;
  }
  return <ChildDashboardPage bootstrap={bootstrap} />;
}

export function App({ bootstrap }) {
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const antLocale = String(bootstrap.locale || "en").startsWith("de")
    ? deDE
    : enUS;
  const effectiveTheme = useMemo(() => {
    if (themeMode === "system") {
      return systemPrefersDark ? "dark" : "light";
    }
    return themeMode;
  }, [themeMode, systemPrefersDark]);

  useEffect(() => {
    if (String(bootstrap.locale || "en").startsWith("de")) {
      dayjs.locale("de");
    } else {
      dayjs.locale("en");
    }
  }, [bootstrap.locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = (event) => setSystemPrefersDark(event.matches);
    media.addEventListener("change", handleMediaChange);
    return () => media.removeEventListener("change", handleMediaChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(THEME_MODE_KEY, themeMode);
    document.documentElement.setAttribute("data-theme", effectiveTheme);
  }, [effectiveTheme, themeMode]);

  const themeAlgorithm =
    effectiveTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm;

  return (
    <ConfigProvider
      locale={antLocale}
      theme={{
        algorithm: themeAlgorithm,
        token: {
          colorPrimary: effectiveTheme === "dark" ? "#2a5f96" : "#4db6ff",
          colorBgBase: effectiveTheme === "dark" ? "#080d1e" : "#eef6ff",
          colorBgContainer:
            effectiveTheme === "dark" ? "rgba(18,30,55,0.95)" : "#ffffff",
          colorBorder: effectiveTheme === "dark" ? "#1a3050" : "#c0ddf5",
          borderRadius: 18,
        },
      }}
    >
      <AntApp>
        <AppShell
          bootstrap={bootstrap}
          themeMode={themeMode}
          effectiveTheme={effectiveTheme}
          onThemeModeChange={setThemeMode}
        >
          <Suspense fallback={<PageFallback />}>
            <RoutedPage bootstrap={bootstrap} />
          </Suspense>
        </AppShell>
      </AntApp>
    </ConfigProvider>
  );
}
