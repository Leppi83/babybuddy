import React, { useState, useEffect, useRef } from 'react';
import { Moon, Baby, Milk, Activity, Play, MoreHorizontal, Plus, Save } from 'lucide-react';
import dayjs from "dayjs";
import ActivityDial from '../components/ActivityDial';
import { TailwindDrawer } from '../components/TailwindDrawer';
import { createApiClient } from '../lib/app-utils';

function StatCard({ title, value, subtitle, icon, color, bg, border, href }) {
  return (
    <a href={href || "#"} className={`glass-card p-6 flex flex-col justify-between overflow-hidden relative group block`}>
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[40px] ${bg} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
      <div className="flex justify-between items-start mb-4 z-10">
        <h4 className="text-slate-400 font-medium text-sm">{title}</h4>
        <div className={`p-2 rounded-xl ${bg} ${color} ${border} border shadow-inner`}>
          {icon}
        </div>
      </div>
      <div className="z-10">
        <p className="text-3xl font-extrabold text-white mb-1">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
      </div>
    </a>
  );
}

function TimelineItem({ title, time, type }) {
  const getBorder = () => {
    switch(type) {
      case 'sleep': return 'border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.5)]';
      case 'feed': return 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
      case 'diaper': return 'border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.5)]';
      default: return 'border-sky-500/50 shadow-[0_0_10px_rgba(56,189,248,0.5)]';
    }
  };

  return (
    <div className="relative">
      <div className={`absolute -left-8 bg-[#0f172a] h-5 w-5 rounded-full border-2 ${getBorder()}`}></div>
      <div>
         <h4 className="text-sm font-bold text-slate-200">{title}</h4>
         <p className="text-xs text-slate-500 mt-1">{time}</p>
      </div>
    </div>
  );
}

function PumpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M35 25c0-4-6-6-6-6v-5H17v5s-6 2-6 6v19h24z" />
      <path d="M20 4l-7 6m10 4l-6-7m9 1h9v7l6 5" />
    </svg>
  );
}

export function ChildDashboardPage({ bootstrap }) {
  const s = bootstrap.strings || {};
  const urls = bootstrap.urls || {};
  const child = bootstrap.currentChild || { name: "Child" };
  const slug = child.slug;
  const profileTimelineUrl = slug ? `/children/${slug}/timeline/` : urls.timeline;
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* Header Band */}
      <header className="glass-panel p-8 md:p-10 rounded-[32px] flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
        <div className="z-10">
          <p className="text-sky-400 font-semibold tracking-widest text-xs mb-2">{dayjs().format("dddd, MMMM D")}</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{child.name}&apos;s Dashboard</h2>
        </div>
        <div className="hidden md:flex gap-3 z-10">
          <button onClick={() => setQuickEntryOpen(true)} className="bg-sky-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:bg-sky-400 hover:scale-105 transition-all flex items-center gap-2">
            <Plus size={16} /> {s.quickEntry || "Quick Entry"}
          </button>
        </div>
      </header>

      {/* Dial + Recent Activity side by side */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Daily Summary Dial — left column */}
        <div className="glass-card overflow-hidden relative flex flex-col w-full lg:w-auto lg:flex-shrink-0" style={{ maxWidth: 460 }}>
          {/* Title overlay on top of sky gradient */}
          <div className="absolute top-5 left-6 z-10 pointer-events-none">
            <h3 className="text-xl font-bold tracking-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">{s.dailySummary || "Daily Summary"}</h3>
          </div>
          {/* Fade overlays at arc endpoints (bottom-left = 00h, bottom-right = 24h) */}
          <div className="absolute bottom-0 left-0 w-40 h-40 pointer-events-none z-20 rounded-bl-[24px]"
            style={{ background: 'radial-gradient(circle at 0% 100%, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.6) 35%, transparent 65%)' }} />
          <div className="absolute bottom-0 right-0 w-40 h-40 pointer-events-none z-20 rounded-br-[24px]"
            style={{ background: 'radial-gradient(circle at 100% 100%, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.6) 35%, transparent 65%)' }} />
          <div className="flex items-center justify-center w-full z-10">
            <ActivityDial
              activities={bootstrap.dialActivities || []}
              bedtime={bootstrap.bedtime}
              currentStatus={bootstrap.quickStatus?.activeSleepTimer ? `Sleeping ${bootstrap.quickStatus.activeSleepTimer}` : bootstrap.quickStatus?.lastSleep ? `Awake since ${bootstrap.quickStatus.lastSleep}` : ""}
              insights={bootstrap.insights || []}
              referenceDate={null}
              sunriseHour={bootstrap.celestial?.sunriseHour ?? 6}
              sunsetHour={bootstrap.celestial?.sunsetHour ?? 18}
              weatherCondition={bootstrap.celestial?.weatherCondition ?? "sunny"}
              strings={{
                sleep: s.sleepLabel || "Sleep",
                feed: s.feedingLabel || "Feed",
                breast: s.breastfeedingShort || "Breast",
                diaper: s.diaperLabel || "Diaper",
                pump: s.pumpingShort || "Pump",
              }}
            />
          </div>
        </div>

        {/* Right column: stat cards + recent activity */}
        <div className="flex flex-col gap-5 flex-1 min-w-0 w-full">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <StatCard title={s.lastSleep || "Last Sleep"} value="2h 45m" subtitle="Finished at 1:30 PM" icon={<Moon />} color="text-indigo-400" bg="bg-indigo-500/10" border="border-indigo-500/20" />
            <StatCard title={s.lastFeeding || "Last Feeding"} value="4.5 oz" subtitle="Formula at 4:15 PM" icon={<Milk />} color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
            <StatCard title={s.lastDiaper || "Last Diaper"} value="Wet" subtitle="Changed at 3:00 PM" icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8 Q12 12 21 8 C21 16 16 22 12 22 C8 22 3 16 3 8 Z" />
                <path d="M6 13 L8 13" /><path d="M18 13 L16 13" />
              </svg>
            } color="text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20" />
            <StatCard title={s.lastPumping || "Last Pumping"} value="—" subtitle="No pumping today" icon={<PumpIcon />} color="text-purple-400" bg="bg-purple-500/10" border="border-purple-500/20" />
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-6 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold tracking-tight text-white">{s.recentActivity || "Recent Activity"}</h3>
              {profileTimelineUrl && (
                <a href={profileTimelineUrl} className="text-sky-400 text-xs font-semibold tracking-wider uppercase hover:text-sky-300">View All</a>
              )}
            </div>
            <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              <TimelineItem title="Feeding" time="2 hours ago" type="feed" />
              <TimelineItem title="Sleep" time="4 hours ago" type="sleep" />
              <TimelineItem title="Diaper" time="5 hours ago" type="diaper" />
              <TimelineItem title="Pumping" time="6 hours ago" type="activity" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Entry Drawer */}
      <TailwindDrawer open={quickEntryOpen} onClose={() => setQuickEntryOpen(false)} title={s.quickEntry || "Quick Entry"}>
        <iframe
          src={urls.quickEntry}
          title="Quick Entry"
          style={{ width: '100%', height: '100%', minHeight: '80vh', border: 'none' }}
          data-no-shell="1"
        />
      </TailwindDrawer>
    </div>
  );
}

export function DashboardHomePage({ bootstrap }) {
  const s = bootstrap.strings || {};
  const urls = bootstrap.urls || {};
  const children = bootstrap.children || [];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="glass-panel p-8 md:p-10 rounded-[32px] flex justify-between items-center relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4"></div>
         <div className="z-10">
           <p className="text-indigo-400 font-semibold tracking-widest text-xs uppercase mb-2">Global Overview</p>
           <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{s.dashboard || "Dashboard"}</h2>
         </div>
         {urls.addChild && (
           <div className="hidden md:block z-10">
              <a href={urls.addChild} className="bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-400 transition-all flex items-center gap-2">
                <Plus size={16} /> {s.addChild || "Add Child"}
              </a>
           </div>
         )}
      </header>
      
      {children.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center max-w-2xl mx-auto mt-10">
           <Baby size={64} className="text-slate-600 mb-6" />
           <h3 className="text-2xl font-bold text-white mb-2">{s.welcome || "Welcome to BabyBuddy"}</h3>
           <p className="text-slate-400 mb-8">You need to add a child to start tracking activities.</p>
           <a href={urls.addChild} className="glass-panel px-8 py-4 rounded-xl text-sky-400 font-bold hover:bg-white/5 transition-all outline outline-1 outline-sky-500/30">
             {s.addChild || "Add your first child"}
           </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {children.map((child, i) => (
             <a key={i} href={child.dashboardUrl || `/children/${child.slug}/`} className="glass-card p-8 flex flex-col items-center hover:bg-white/5 transition-all group">
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-sky-500/50 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(56,189,248,0.2)] group-hover:scale-110 transition-transform">
                   <Baby size={40} className="text-sky-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{child.name}</h3>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">View Dashboard</p>
             </a>
           ))}
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors";

export function SettingsPage({ bootstrap }) {
  const s = bootstrap.strings || {};
  const api = useRef(createApiClient(bootstrap.csrfToken));
  const [form, setForm] = useState({
    first_name: bootstrap.settings?.profile?.firstName || "",
    last_name: bootstrap.settings?.profile?.lastName || "",
    email: bootstrap.settings?.profile?.email || "",
    language: bootstrap.settings?.preferences?.language || "",
    timezone: bootstrap.settings?.preferences?.timezone || "",
    pagination_count: bootstrap.settings?.preferences?.paginationCount || "",
    dashboard_refresh_rate: bootstrap.settings?.dashboard?.refreshRate || "",
    dashboard_hide_age: bootstrap.settings?.dashboard?.hideAge || false,
    dashboard_hide_empty: bootstrap.settings?.dashboard?.hideEmpty || false,
    llm_provider: bootstrap.settings?.ai?.provider || "none",
    llm_model: bootstrap.settings?.ai?.model || "",
    llm_base_url: bootstrap.settings?.ai?.baseUrl || "",
    llm_api_key: ""
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 3000);
  };

  async function saveSettings(e) {
    if (e) e.preventDefault();
    setSaving(true);
    const payload = new URLSearchParams();
    payload.set("action", "autosave_all_settings");
    Object.keys(form).forEach(key => {
      if (typeof form[key] === "boolean") {
        if (form[key]) payload.set(key, "on");
      } else {
        payload.set(key, form[key]);
      }
    });

    try {
      const response = await api.current.postForm(bootstrap.urls.self, payload);
      const data = await response.json();
      if (data.ok) showMessage(s.saved || "Settings saved successfully");
      else showMessage(data.error || "Save failed", true);
    } catch {
      showMessage("Save failed", true);
    } finally {
      setSaving(false);
    }
  }

  const updateField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const choiceOptions = (key) => bootstrap.settings?.choices?.[key] || [];

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-4xl mx-auto w-full mt-4">
      <header className="glass-panel p-8 md:p-10 rounded-[32px] flex justify-between items-center relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4"></div>
         <div className="z-10">
           <p className="text-emerald-400 font-semibold tracking-widest text-xs uppercase mb-2">Preferences</p>
           <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{s.settings || "Settings"}</h2>
         </div>
         <div className="z-10">
           <button onClick={saveSettings} disabled={saving} className="bg-emerald-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition-all flex items-center gap-2 disabled:opacity-50">
             <Save size={16} /> {saving ? "Saving..." : (s.save || "Save")}
           </button>
         </div>
      </header>

      {message && (
        <div className={`p-4 rounded-xl font-bold border ${message.isError ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={saveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-white mb-6">Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">{s.firstName || "First Name"}</label>
              <input type="text" className={inputClass} value={form.first_name} onChange={e => updateField("first_name", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">{s.lastName || "Last Name"}</label>
              <input type="text" className={inputClass} value={form.last_name} onChange={e => updateField("last_name", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-400 mb-2 block">{s.email || "Email"}</label>
              <input type="email" className={inputClass} value={form.email} onChange={e => updateField("email", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-6">Preferences</h3>
          <div className="flex flex-col gap-6">
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">{s.language || "Language"}</label>
              <select className={inputClass} value={form.language} onChange={e => updateField("language", e.target.value)}>
                {choiceOptions("language").map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">{s.timezone || "Timezone"}</label>
              <select className={inputClass} value={form.timezone} onChange={e => updateField("timezone", e.target.value)}>
                {choiceOptions("timezone").map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">Pagination Count</label>
              <input type="number" className={inputClass} value={form.pagination_count} onChange={e => updateField("pagination_count", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-6">Dashboard</h3>
          <div className="flex flex-col gap-6">
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">Refresh Rate</label>
              <select className={inputClass} value={form.dashboard_refresh_rate} onChange={e => updateField("dashboard_refresh_rate", e.target.value)}>
                {choiceOptions("dashboard_refresh_rate").map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer group mt-2 w-fit">
              <div className="relative flex items-center justify-center">
                <input type="checkbox" className="peer appearance-none w-6 h-6 border-2 border-slate-600 rounded bg-slate-900/50 checked:bg-sky-500 checked:border-sky-500 focus:outline-none transition-colors" checked={form.dashboard_hide_age} onChange={e => updateField("dashboard_hide_age", e.target.checked)} />
                <svg className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-slate-300 font-medium group-hover:text-white transition-colors select-none">Hide Age</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <div className="relative flex items-center justify-center">
                <input type="checkbox" className="peer appearance-none w-6 h-6 border-2 border-slate-600 rounded bg-slate-900/50 checked:bg-sky-500 checked:border-sky-500 focus:outline-none transition-colors" checked={form.dashboard_hide_empty} onChange={e => updateField("dashboard_hide_empty", e.target.checked)} />
                <svg className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-slate-300 font-medium group-hover:text-white transition-colors select-none">Hide Empty Sections</span>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
}
