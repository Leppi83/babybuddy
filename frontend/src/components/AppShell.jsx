import React, { useState } from "react";
import { 
  Home, Users, UserPlus, Edit2, History, Settings, LogOut, 
  Menu, Bell, ChevronDown, Check, Lightbulb 
} from "lucide-react";

export function AppShell({ bootstrap, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const s = bootstrap.strings || {};
  const urls = bootstrap.urls || {};
  
  // Basic Nav Items
  const navItems = [
    { icon: <Home size={20} />, label: s.dashboard || "Dashboard", href: urls.dashboard },
    { icon: <Edit2 size={20} />, label: s.quickEntry || "Quick Entry", href: urls.quickEntry },
    { icon: <Lightbulb size={20} />, label: s.insights || "Insights", href: "#", isMenu: true, children: [
        { label: "Reports Home", href: bootstrap.currentChild ? `/children/${bootstrap.currentChild.slug}/reports` : "/reports" },
        { label: "Sleep Patterns", href: bootstrap.currentChild ? `/children/${bootstrap.currentChild.slug}/reports/sleep/pattern/` : "#" },
        { label: "Feeding Amounts", href: bootstrap.currentChild ? `/children/${bootstrap.currentChild.slug}/reports/feeding/amounts/` : "#" },
        { label: "Diaper Changes", href: bootstrap.currentChild ? `/children/${bootstrap.currentChild.slug}/reports/changes/amounts/` : "#" }
    ]},
    { icon: <History size={20} />, label: s.timeline || "Timeline", href: urls.timeline },
  ];

  if (urls.childrenList) {
    navItems.push({ icon: <Users size={20} />, label: s.children || "Children", href: urls.childrenList });
  }
  if (urls.addChild) {
    navItems.push({ icon: <UserPlus size={20} />, label: s.addChild || "Add Child", href: urls.addChild });
  }

  // Handle Logout Form Submission natively
  const handleLogout = () => {
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
  };

  const activePath = typeof window !== 'undefined' ? window.location.pathname : "";

  return (
    <div className="flex h-screen w-full bg-transparent overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col m-4 rounded-[28px] overflow-hidden transition-all duration-300 ${collapsed ? 'w-[80px]' : 'w-[260px]'} glass-panel shadow-2xl z-50`}>
        {/* Brand */}
        <div className="flex items-center gap-3 p-6 border-b border-white/5 bg-slate-900/40">
          <a href="/" className="flex items-center gap-3 w-full justify-center">
            <img src="/static/babybuddy/logo/icon-brand.png" alt="BabyBuddy" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.8)]" />
            {!collapsed && <h1 className="text-xl font-bold tracking-tight glowing-text text-sky-50 whitespace-nowrap">BabyBuddy</h1>}
          </a>
        </div>

        {/* Child Selector Dropdown Mockup */}
        {!collapsed && bootstrap.children?.length > 1 && (
          <div className="px-4 py-4 border-b border-white/5">
             <span className="text-xs uppercase tracking-wider text-slate-500 font-bold ml-2 mb-2 block block">Child</span>
             <select 
               className="w-full bg-slate-900/80 border border-white/10 text-slate-200 rounded-xl px-4 py-2 text-sm font-semibold appearance-none outline-none focus:border-sky-500 focus:shadow-[0_0_10px_rgba(56,189,248,0.3)]"
               value={bootstrap.currentChild?.slug || ""}
               onChange={(e) => {
                 if(e.target.value) {
                   window.location.assign(`/children/${e.target.value}/`);
                 }
               }}
             >
               {bootstrap.children.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
             </select>
          </div>
        )}

        {/* Nav Menu */}
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item, i) => {
            if (!item.href) return null;
            // Best effort active state matching
            const isActive = activePath.startsWith(item.href) && item.href !== "/" && item.href !== "#";
            const isExactHome = activePath === "/" && item.href === urls.dashboard;
            const active = isActive || isExactHome;

            if (item.isMenu) {
              return (
                <div key={i} className="flex flex-col">
                  <button
                    onClick={() => {
                        const el = document.getElementById(`submenu-${i}`);
                        if(el.style.display === "none") el.style.display = "block";
                        else el.style.display = "none";
                    }}
                    className={`w-full flex justify-between items-center px-4 py-3 rounded-2xl transition-all duration-200 text-slate-400 hover:bg-white/5 hover:text-slate-200 focus:outline-none`}
                    title={collapsed ? item.label : ""}
                  >
                    <div className="flex items-center gap-4">
                      <div>{item.icon}</div>
                      {!collapsed && <span className="font-semibold text-sm tracking-wide truncate">{item.label}</span>}
                    </div>
                    {!collapsed && <ChevronDown size={16} />}
                  </button>
                  {!collapsed && item.children && (
                     <div id={`submenu-${i}`} style={{ display: "none" }} className="pl-12 pr-4 pt-1 space-y-1">
                        {item.children.map((child, j) => (
                          <a key={j} href={child.href} className="block w-full text-left px-4 py-2 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 text-sm font-medium transition-colors">
                            {child.label}
                          </a>
                        ))}
                     </div>
                  )}
                </div>
              );
            }

            return (
              <a
                key={i}
                href={item.href}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 ${
                  active 
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_4px_20px_-4px_rgba(56,189,248,0.3)]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
                title={collapsed ? item.label : ""}
              >
                <div className={active ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]' : ''}>
                  {item.icon}
                </div>
                {!collapsed && <span className="font-semibold text-sm tracking-wide truncate">{item.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 space-y-2 pb-6">
          <a 
            href={urls.settings}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
          >
            <Settings size={20} />
            {!collapsed && <span className="font-medium text-sm">Settings</span>}
          </a>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={20} />
            {!collapsed && <span className="font-medium text-sm">Logout</span>}
          </button>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center mt-4 p-3 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-200 transition-colors"
          >
            <Menu size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto px-4 py-6 md:p-8 custom-scrollbar relative z-10 transition-all">
        
        {/* Messages / Alerts */}
        {(bootstrap.messages || []).map((msg, idx) => (
           <div key={idx} className="mb-6 mx-auto w-full max-w-6xl glass-card border flex items-center gap-4 p-4 text-sm font-semibold text-sky-100 border-sky-500/30">
               <Bell size={18} className="text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
               <span dangerouslySetInnerHTML={{ __html: msg.message }} />
           </div>
        ))}

        {/* Dynamic Page Content */}
        <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col gap-6 w-full">
           {children}
        </div>

      </main>

      {/* Mobile Bottom Navigation Bar (Visible only on very small screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-panel border-t border-white/10 z-50 flex items-center justify-around px-2">
         {navItems.slice(0, 4).map((item, i) => (
            <a key={i} href={item.href} className="p-3 text-slate-400 hover:text-sky-400 flex flex-col items-center gap-1 transition-colors">
               <div className={activePath.startsWith(item.href) ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' : ''}>{item.icon}</div>
            </a>
         ))}
         <button onClick={() => setMobileMenuOpen(true)} className="p-3 text-slate-400 hover:text-sky-400 flex flex-col items-center gap-1">
            <Menu size={20} />
         </button>
      </nav>

      {/* Mobile Menu Actions Modal */}
      {mobileMenuOpen && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex flex-col justify-end">
            <div className="glass-panel w-full rounded-t-[32px] p-6 pb-12 flex flex-col gap-4 border-t border-white/10">
               <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" onClick={() => setMobileMenuOpen(false)}></div>
               <a href={urls.settings} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 text-slate-200">
                  <Settings size={20} className="text-sky-400" /> Settings
               </a>
               <button onClick={handleLogout} className="flex items-center gap-4 p-4 rounded-2xl bg-rose-500/10 text-rose-400">
                  <LogOut size={20} /> Logout
               </button>
            </div>
         </div>
      )}

    </div>
  );
}
