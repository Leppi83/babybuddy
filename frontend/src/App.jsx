import React, { lazy, Suspense, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/de";
import { AppShell } from "./components/AppShell";

// Dashboard + settings (Tailwind-native)
const DashboardHomePage = lazy(() => import("./pages/TailwindDashboard").then((m) => ({ default: m.DashboardHomePage })));
const ChildDashboardPage = lazy(() => import("./pages/TailwindDashboard").then((m) => ({ default: m.ChildDashboardPage })));
const SettingsPage = lazy(() => import("./pages/TailwindDashboard").then((m) => ({ default: m.SettingsPage })));

// General pages
const WelcomePage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.WelcomePage })));
const ListPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.ListPage })));
const MessagePage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.MessagePage })));
const DeviceAccessPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.DeviceAccessPage })));
const AntFormPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.AntFormPage })));
const QuickEntryPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.QuickEntryPage })));
const ReportListPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.ReportListPage })));
const ReportDetailPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.ReportDetailPage })));
const TimelinePage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.TimelinePage })));
const ChildDetailPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.ChildDetailPage })));
const TagDetailPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.TagDetailPage })));
const TimerDetailPage = lazy(() => import("./pages/GeneralPages").then((m) => ({ default: m.TimerDetailPage })));

// Profile timeline + General growth
const ChildProfileTimelinePage = lazy(() => import("./pages/ProfileTimelinePages").then((m) => ({ default: m.ChildProfileTimelinePage })));
const ChildGeneralPage = lazy(() => import("./pages/ProfileTimelinePages").then((m) => ({ default: m.ChildGeneralPage })));

// Insights + Topics
const InsightsPage = lazy(() => import("./pages/InsightsPages").then((m) => ({ default: m.InsightsPage })));
const TopicPage = lazy(() => import("./pages/TopicPages").then((m) => ({ default: m.TopicPage })));

// Examinations
const ExaminationListPage = lazy(() => import("./pages/ExaminationPages").then((m) => ({ default: m.ExaminationListPage })));
const ExaminationFormPage = lazy(() => import("./pages/ExaminationPages").then((m) => ({ default: m.ExaminationFormPage })));

function PageFallback() {
  return (
    <div className="flex w-full h-64 items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
    </div>
  );
}

function RoutedPage({ bootstrap }) {
  const pt = bootstrap.pageType;
  if (pt === "dashboard-home") return <DashboardHomePage bootstrap={bootstrap} />;
  if (pt === "welcome") return <WelcomePage bootstrap={bootstrap} />;
  if (pt === "settings") return <SettingsPage bootstrap={bootstrap} />;
  if (pt === "list") return <ListPage bootstrap={bootstrap} />;
  if (pt === "message") return <MessagePage bootstrap={bootstrap} />;
  if (pt === "device-access") return <DeviceAccessPage bootstrap={bootstrap} />;
  if (pt === "auth-form" || pt === "form") return <AntFormPage bootstrap={bootstrap} />;
  if (pt === "confirm-delete") return <AntFormPage bootstrap={bootstrap} deleteMode />;
  if (pt === "quick-entry") return <QuickEntryPage bootstrap={bootstrap} />;
  if (pt === "timeline") return <TimelinePage bootstrap={bootstrap} />;
  if (pt === "child-detail") return <ChildDetailPage bootstrap={bootstrap} />;
  if (pt === "tag-detail") return <TagDetailPage bootstrap={bootstrap} />;
  if (pt === "timer-detail") return <TimerDetailPage bootstrap={bootstrap} />;
  if (pt === "report-list") return <ReportListPage bootstrap={bootstrap} />;
  if (pt === "report-detail") return <ReportDetailPage bootstrap={bootstrap} />;
  if (pt === "child-profile-timeline") return <ChildProfileTimelinePage bootstrap={bootstrap} />;
  if (pt === "child-general") return <ChildGeneralPage bootstrap={bootstrap} />;
  if (pt === "insights") return <InsightsPage bootstrap={bootstrap} />;
  if (pt === "topic-detail") return <TopicPage bootstrap={bootstrap} />;
  if (pt === "examination-list") return <ExaminationListPage bootstrap={bootstrap} />;
  if (pt === "examination-form") return <ExaminationFormPage bootstrap={bootstrap} />;
  return <ChildDashboardPage bootstrap={bootstrap} />;
}

export function App({ bootstrap }) {
  useEffect(() => {
    dayjs.locale(String(bootstrap.locale || "en").startsWith("de") ? "de" : "en");
  }, [bootstrap.locale]);

  return (
    <React.Fragment>
      <div className="bg-ambient" />
      <AppShell bootstrap={bootstrap}>
        <Suspense fallback={<PageFallback />}>
          <RoutedPage bootstrap={bootstrap} />
        </Suspense>
      </AppShell>
    </React.Fragment>
  );
}
