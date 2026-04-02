import React, { useState } from "react";
import {
  Home, UserPlus, History, Settings, LogOut,
  Menu, Bell, ChevronDown, Lightbulb
} from "lucide-react";

export function AppShell({ bootstrap, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const s = bootstrap.strings || {};
  const urls = bootstrap.urls || {};
  const slug = bootstrap.currentChild?.slug;
  const pt = bootstrap.pageType || "";
  const activePath = bootstrap.currentPath || "";

  // Topic URL helpers
  function topicHref(topic) {
    if (urls.topicTemplate) return urls.topicTemplate.replace("__CHILD_SLUG__", slug || "").replace("__TOPIC__", topic);
    return slug ? `/children/${slug}/topics/${topic}/` : "#";
  }

  const profileTimelineUrl = urls.profileTimeline || (slug ? `/children/${slug}/profile-timeline/` : null) || urls.timeline || "#";

  const insightLinks = slug ? [
    { label: s.generalLabel || "General", href: urls.childGeneral || `/children/${slug}/general/` },
    { label: s.sleepLabel || "Sleep", href: topicHref("sleep") },
    { label: s.feedingLabel || "Feeding", href: topicHref("feeding") },
    { label: s.diaperLabel || "Diaper", href: topicHref("diaper") },
    { label: s.pumpingLabel || "Pumping", href: topicHref("pumping") },
  ] : [];

  // ── Active state helpers ────────────────────────────────────────────────────
  const isAddChildActive = urls.addChild ? activePath.startsWith(urls.addChild.replace(/\/$/, "")) : false;
  const isInsightsActive = ["insights", "topic-detail", "child-general"].includes(pt);
  const isSettingsActive = pt === "settings";

  function isNavActive(item) {
    switch (item.key) {
      case "dashboard":  return pt === "dashboard-child" || pt === "dashboard-home";
      case "insights":   return isInsightsActive;
      case "timeline":   return pt === "child-profile-timeline" || pt === "timeline";
      case "add-child":  return isAddChildActive;
      default: return false;
    }
  }

  // ── Nav item definitions — always the same set ─────────────────────────────
  const navItems = [
    {
      key: "dashboard",
      icon: <Home size={20} />,
      label: s.dashboard || "Dashboard",
      href: urls.dashboard || "/dashboard/",
    },
    // Insights: only render when a child is in context (topics are child-specific)
    ...(slug ? [{
      key: "insights",
      icon: <Lightbulb size={20} />,
      label: s.insights || "Insights",
      isMenu: true,
      children: insightLinks,
    }] : []),
    {
      key: "timeline",
      icon: <History size={20} />,
      label: s.timeline || "Timeline",
      href: profileTimelineUrl,
    },
    {
      key: "add-child",
      icon: <UserPlus size={20} />,
      label: s.addChild || "Add Child",
      href: urls.addChild || "/children/add/",
    },
  ];

  // ── Logout ─────────────────────────────────────────────────────────────────
  function handleLogout() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = urls.logout || "/logout/";
    const csrf = document.createElement("input");
    csrf.type = "hidden";
    csrf.name = "csrfmiddlewaretoken";
    csrf.value = bootstrap.csrfToken;
    form.appendChild(csrf);
    document.body.appendChild(form);
    form.submit();
  }

  // ── Child selector ─────────────────────────────────────────────────────────
  function handleChildChange(e) {
    const newSlug = e.target.value;
    if (!newSlug) return;
    if (pt === "child-profile-timeline") { window.location.assign(`/children/${newSlug}/profile-timeline/`); return; }
    if (pt === "child-general") { window.location.assign(`/children/${newSlug}/general/`); return; }
    if (pt === "insights" || pt === "topic-detail") {
      const topic = bootstrap.topicPage?.topic;
      window.location.assign(topic ? `/children/${newSlug}/insights/${topic}/` : `/children/${newSlug}/general/`);
      return;
    }
    if (pt === "examination-list" || pt === "examination-form") {
      window.location.assign(`/children/${newSlug}/examinations/`);
      return;
    }
    window.location.assign(`/children/${newSlug}/`);
  }

  const showChildSelector = (bootstrap.children?.length ?? 0) >= 1;

  // ── Shared link styles ─────────────────────────────────────────────────────
  const activeClass = "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_4px_20px_-4px_rgba(56,189,248,0.3)]";
  const inactiveClass = "text-slate-400 hover:bg-white/5 hover:text-slate-200";

  function NavLink({ item }) {
    const active = isNavActive(item);

    if (item.isMenu) {
      return (
        <div className="flex flex-col">
          <button
            onClick={() => setInsightsOpen(o => !o)}
            className={`w-full flex justify-between items-center px-4 py-3 rounded-2xl transition-all duration-200 focus:outline-none ${active ? activeClass : inactiveClass}`}
            title={collapsed ? item.label : ""}
          >
            <div className="flex items-center gap-4">
              <div className={active ? "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" : ""}>{item.icon}</div>
              {!collapsed && <span className="font-semibold text-sm tracking-wide truncate">{item.label}</span>}
            </div>
            {!collapsed && <ChevronDown size={14} className={`transition-transform ${insightsOpen ? "rotate-180" : ""}`} />}
          </button>
          {!collapsed && insightsOpen && item.children?.length > 0 && (
            <div className="pl-12 pr-4 pt-1 pb-2 space-y-0.5">
              {item.children.map((child, j) => {
                const childActive = activePath.startsWith(child.href);
                return (
                  <a
                    key={j}
                    href={child.href}
                    className={`block px-4 py-2 rounded-xl text-sm font-medium transition-colors ${childActive ? "text-sky-400 bg-sky-500/10" : "text-slate-400 hover:text-sky-400 hover:bg-sky-500/10"}`}
                  >
                    {child.label}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <a
        href={item.href}
        className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 ${active ? activeClass : inactiveClass}`}
        title={collapsed ? item.label : ""}
      >
        <div className={active ? "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" : ""}>{item.icon}</div>
        {!collapsed && <span className="font-semibold text-sm tracking-wide truncate">{item.label}</span>}
      </a>
    );
  }

  return (
    <div className="flex h-screen w-full bg-transparent overflow-hidden">

      {/* Sidebar — Desktop */}
      <aside className={`hidden md:flex flex-col m-4 rounded-[28px] overflow-hidden transition-all duration-300 ${collapsed ? "w-[80px]" : "w-[260px]"} glass-panel shadow-2xl z-50`}>
        {/* Brand */}
        <div className="flex items-center gap-3 p-6 border-b border-white/5 bg-slate-900/40">
          <a href="/" className="flex items-center gap-3 w-full justify-center">
            <img src="/static/babybuddy/logo/icon-brand.png" alt="BabyBuddy" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.8)]" />
            {!collapsed && <h1 className="text-xl font-bold tracking-tight glowing-text text-sky-50 whitespace-nowrap">BabyBuddy</h1>}
          </a>
        </div>

        {/* Child selector — shown whenever children exist */}
        {!collapsed && showChildSelector && (
          <div className="px-4 py-4 border-b border-white/5">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold ml-2 mb-2 block">Child</span>
            <select
              className="w-full bg-slate-900/80 border border-white/10 text-slate-200 rounded-xl px-4 py-2 text-sm font-semibold appearance-none outline-none focus:border-sky-500"
              value={bootstrap.currentChild?.slug || ""}
              onChange={handleChildChange}
            >
              {!bootstrap.currentChild && (
                <option value="">— Select child —</option>
              )}
              {bootstrap.children.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => <NavLink key={item.key} item={item} />)}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 space-y-1 pb-6">
          <a
            href={urls.settings || "/settings/"}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-colors ${isSettingsActive ? activeClass : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
          >
            <Settings size={20} className={isSettingsActive ? "text-sky-400" : ""} />
            {!collapsed && <span className="font-medium text-sm">{s.settings || "Settings"}</span>}
          </a>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-rose-400 hover:bg-rose-500/10 transition-colors">
            <LogOut size={20} />
            {!collapsed && <span className="font-medium text-sm">{s.logout || "Logout"}</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center mt-3 p-3 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-200 transition-colors">
            <Menu size={18} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto px-4 py-6 md:p-8 custom-scrollbar relative z-10">
        {(bootstrap.messages || []).map((msg, idx) => (
          <div key={idx} className="mb-6 mx-auto w-full max-w-6xl glass-card border flex items-center gap-4 p-4 text-sm font-semibold text-sky-100 border-sky-500/30">
            <Bell size={18} className="text-sky-400 flex-shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: msg.message }} />
          </div>
        ))}
        <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col gap-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-panel border-t border-white/10 z-50 flex items-center justify-around px-2">
        {navItems.slice(0, 4).map((item) => {
          const active = isNavActive(item);
          return (
            <a
              key={item.key}
              href={item.isMenu ? (item.children?.[0]?.href || "#") : item.href}
              className={`p-3 flex flex-col items-center gap-1 transition-colors ${active ? "text-sky-400" : "text-slate-400 hover:text-sky-400"}`}
            >
              {item.icon}
            </a>
          );
        })}
        <button onClick={() => setMobileMenuOpen(true)} className="p-3 text-slate-400 hover:text-sky-400">
          <Menu size={20} />
        </button>
      </nav>

      {/* Mobile menu sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex flex-col justify-end">
          <div className="glass-panel w-full rounded-t-[32px] p-6 pb-12 flex flex-col gap-4 border-t border-white/10">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2 cursor-pointer" onClick={() => setMobileMenuOpen(false)} />
            {showChildSelector && (
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-bold ml-1 mb-2 block">Child</span>
                <select
                  className="w-full bg-slate-900/80 border border-white/10 text-slate-200 rounded-xl px-4 py-3 text-sm font-semibold appearance-none outline-none focus:border-sky-500"
                  value={bootstrap.currentChild?.slug || ""}
                  onChange={handleChildChange}
                >
                  {!bootstrap.currentChild && <option value="">— Select child —</option>}
                  {bootstrap.children.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
            )}
            <a href={urls.settings || "/settings/"} className={`flex items-center gap-4 p-4 rounded-2xl ${isSettingsActive ? "bg-sky-500/10 text-sky-400" : "bg-white/5 text-slate-200"}`}>
              <Settings size={20} className={isSettingsActive ? "text-sky-400" : "text-sky-400"} /> {s.settings || "Settings"}
            </a>
            <button onClick={handleLogout} className="flex items-center gap-4 p-4 rounded-2xl bg-rose-500/10 text-rose-400">
              <LogOut size={20} /> {s.logout || "Logout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
