import React, { lazy, Suspense, useEffect, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/de";
import { AppShell } from "./components/AppShell";

const DashboardHomePage = lazy(() => import("./pages/TailwindDashboard").then((m) => ({ default: m.DashboardHomePage })));
const TimelinePage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.TimelinePage })));
const ChildProfileTimelinePage = lazy(() => import("./pages/ProfileTimelinePages").then((m) => ({ default: m.ChildProfileTimelinePage })));

const SettingsPage = lazy(() => import("./pages/TailwindDashboard").then((m) => ({ default: m.SettingsPage || (() => <div className="p-8 text-slate-400">Settings Page (Coming Soon)</div>) })));
const WelcomePage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.WelcomePage })));
const ListPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.ListPage })));
const MessagePage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.MessagePage })));
const DeviceAccessPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.DeviceAccessPage })));
const AntFormPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.AntFormPage })));
const QuickEntryPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.QuickEntryPage })));
const ReportListPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.ReportListPage })));
const ExaminationListPage = () => <div className="p-8 text-slate-400 text-center italic">Examination List (Migrated to General Form UI)</div>;
const ExaminationFormPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.AntFormPage })));
const ChildDashboardPage = lazy(() => import("./pages/TailwindDashboard").then((m) => ({ default: m.ChildDashboardPage }))); // Kept working since it's the default root

function PageFallback() {
  return (
    <div className="flex w-full h-full items-center justify-center text-sky-500 animate-pulse">
      Loading framework...
    </div>
  );
}

function RoutedPage({ bootstrap }) {
  if (bootstrap.pageType === "dashboard-home") return <DashboardHomePage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "welcome") return <WelcomePage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "settings") return <SettingsPage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "list") return <ListPage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "message") return <MessagePage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "device-access") return <DeviceAccessPage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "auth-form" || bootstrap.pageType === "form" || bootstrap.pageType === "confirm-delete") {
    return <AntFormPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "child-profile-timeline") return <ChildProfileTimelinePage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "timeline") return <TimelinePage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "examination-list") return <ExaminationListPage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "examination-form") return <ExaminationFormPage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "report-list") return <ReportListPage bootstrap={bootstrap} />;
  if (bootstrap.pageType === "quick-entry") return <QuickEntryPage bootstrap={bootstrap} />;

  // Default to Dashboard
  return <ChildDashboardPage bootstrap={bootstrap} />;
}

export function App({ bootstrap }) {
  useEffect(() => {
    if (String(bootstrap.locale || "en").startsWith("de")) {
      dayjs.locale("de");
    } else {
      dayjs.locale("en");
    }
  }, [bootstrap.locale]);

  return (
    <React.Fragment>
      <div className="bg-ambient"></div>
      <AppShell bootstrap={bootstrap}>
        <Suspense fallback={<PageFallback />}>
          <RoutedPage bootstrap={bootstrap} />
        </Suspense>
      </AppShell>
    </React.Fragment>
  );
}
