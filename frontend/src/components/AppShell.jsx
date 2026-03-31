import React, { useState } from "react";
import {
  Home, Users, UserPlus, Edit2, History, Settings, LogOut,
  Menu, Bell, ChevronDown, Lightbulb, Activity
} from "lucide-react";

export function AppShell({ bootstrap, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const s = bootstrap.strings || {};
  const urls = bootstrap.urls || {};
  const slug = bootstrap.currentChild?.slug;

  // Build Insights sub-items: General first, then topics
  const insightsChildren = slug ? [
    { label: s.generalLabel || "General", href: `/children/${slug}/general/` },
    { label: s.sleepLabel || "Sleep", href: urls.insightsTemplate ? urls.insightsTemplate.replace("__CHILD_ID__", bootstrap.currentChild?.id || "").replace("__TOPIC__", "sleep") : `/children/${slug}/insights/sleep/` },
    { label: s.feedingLabel || "Feeding", href: `/children/${slug}/insights/feeding/` },
    { label: s.diaperLabel || "Diaper", href: `/children/${slug}/insights/diaper/` },
    { label: s.pumpingLabel || "Pumping", href: `/children/${slug}/insights/pumping/` },
  ] : [];

  // Use topicTemplate or insightsTemplate if available
  function topicHref(topic) {
    if (urls.topicTemplate) return urls.topicTemplate.replace("__CHILD_SLUG__", slug || "").replace("__TOPIC__", topic);
    return slug ? `/children/${slug}/insights/${topic}/` : "#";
  }
  function generalHref() {
    return slug ? `/children/${slug}/general/` : "#";
  }

  const insightLinks = slug ? [
    { label: s.generalLabel || "General", href: generalHref() },
    { label: s.sleepLabel || "Sleep", href: topicHref("sleep") },
    { label: s.feedingLabel || "Feeding", href: topicHref("feeding") },
    { label: s.diaperLabel || "Diaper", href: topicHref("diaper") },
    { label: s.pumpingLabel || "Pumping", href: topicHref("pumping") },
  ] : [];

  const navItems = [
    { icon: <Home size={20} />, label: s.dashboard || "Dashboard", href: urls.dashboard },
    { icon: <Edit2 size={20} />, label: s.quickEntry || "Quick Entry", href: urls.quickEntry },
    { icon: <Lightbulb size={20} />, label: s.insights || "Insights", isMenu: true, children: insightLinks },
    { icon: <History size={20} />, label: s.timeline || "Timeline", href: urls.timeline },
    { icon: <Activity size={20} />, label: s.reports || "Reports", href: slug ? `/children/${slug}/reports/` : urls.reports },
  ].filter(item => item.href || item.isMenu);

  if (urls.childrenList) navItems.push({ icon: <Users size={20} />, label: s.children || "Children", href: urls.childrenList });
  if (urls.addChild) navItems.push({ icon: <UserPlus size={20} />, label: s.addChild || "Add Child", href: urls.addChild });

  function handleLogout() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = urls.logout;
    const csrf = document.createElement("input");
    csrf.type = "hidden";
    csrf.name = "csrfmiddlewaretoken";
    csrf.value = bootstrap.csrfToken;
    form.appendChild(csrf);
    document.body.appendChild(form);
    form.submit();
  }

  const activePath = typeof window !== "undefined" ? window.location.pathname : "";

  function isActive(href) {
    if (!href || href === "#") return false;
    if (href === urls.dashboard) return activePath === href || activePath === "/";
    return activePath.startsWith(href);
  }

  function NavLink({ item, i }) {
    if (item.isMenu) {
      const anyChildActive = (item.children || []).some(c => activePath.startsWith(c.href));
      const open = insightsOpen;
      return (
        <div className="flex flex-col">
          <button
            onClick={() => setInsightsOpen(o => !o)}
            className={`w-full flex justify-between items-center px-4 py-3 rounded-2xl transition-all duration-200 focus:outline-none ${anyChildActive ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
            title={collapsed ? item.label : ""}
          >
            <div className="flex items-center gap-4">
              <div className={anyChildActive ? "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" : ""}>{item.icon}</div>
              {!collapsed && <span className="font-semibold text-sm tracking-wide truncate">{item.label}</span>}
            </div>
            {!collapsed && <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />}
          </button>
          {!collapsed && open && item.children?.length > 0 && (
            <div className="pl-12 pr-4 pt-1 pb-2 space-y-0.5">
              {item.children.map((child, j) => (
                <a
                  key={j}
                  href={child.href}
                  className={`block px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activePath.startsWith(child.href) ? "text-sky-400 bg-sky-500/10" : "text-slate-400 hover:text-sky-400 hover:bg-sky-500/10"}`}
                >
                  {child.label}
                </a>
              ))}
            </div>
          )}
        </div>
      );
    }

    const active = isActive(item.href);
    return (
      <a
        href={item.href}
        className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 ${active ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_4px_20px_-4px_rgba(56,189,248,0.3)]" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
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

        {/* Child selector */}
        {!collapsed && bootstrap.children?.length > 1 && (
          <div className="px-4 py-4 border-b border-white/5">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold ml-2 mb-2 block">Child</span>
            <select
              className="w-full bg-slate-900/80 border border-white/10 text-slate-200 rounded-xl px-4 py-2 text-sm font-semibold appearance-none outline-none focus:border-sky-500"
              value={bootstrap.currentChild?.slug || ""}
              onChange={(e) => {
                const newSlug = e.target.value;
                if (!newSlug) return;
                const pt = bootstrap.pageType;
                if (pt === "child-profile-timeline") { window.location.assign(`/children/${newSlug}/timeline/`); return; }
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
              }}
            >
              {bootstrap.children.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item, i) => <NavLink key={i} item={item} i={i} />)}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 space-y-1 pb-6">
          <a href={urls.settings} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors">
            <Settings size={20} />
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
        {navItems.slice(0, 4).map((item, i) => (
          <a key={i} href={item.isMenu ? (item.children?.[0]?.href || "#") : item.href} className={`p-3 flex flex-col items-center gap-1 transition-colors ${isActive(item.isMenu ? item.children?.[0]?.href : item.href) ? "text-sky-400" : "text-slate-400 hover:text-sky-400"}`}>
            {item.icon}
          </a>
        ))}
        <button onClick={() => setMobileMenuOpen(true)} className="p-3 text-slate-400 hover:text-sky-400">
          <Menu size={20} />
        </button>
      </nav>

      {/* Mobile menu sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex flex-col justify-end">
          <div className="glass-panel w-full rounded-t-[32px] p-6 pb-12 flex flex-col gap-4 border-t border-white/10">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2 cursor-pointer" onClick={() => setMobileMenuOpen(false)} />
            <a href={urls.settings} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 text-slate-200">
              <Settings size={20} className="text-sky-400" /> {s.settings || "Settings"}
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
