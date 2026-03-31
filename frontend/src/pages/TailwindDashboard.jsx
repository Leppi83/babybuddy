import React from 'react';
import { Moon, Droplet, Utensils, Activity, MoreHorizontal, Plus, Baby } from 'lucide-react';
import dayjs from "dayjs";
import ActivityDial from '../components/ActivityDial';

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

export function ChildDashboardPage({ bootstrap }) {
  const s = bootstrap.strings || {};
  const urls = bootstrap.urls || {};
  const child = bootstrap.currentChild || { name: "Child" };

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header Band */}
      <header className="glass-panel p-8 md:p-10 rounded-[32px] flex justify-between items-center relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4"></div>
         <div className="z-10">
           <p className="text-sky-400 font-semibold tracking-widest text-xs mb-2">
             {dayjs().format("dddd, MMMM D")}
           </p>
           <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{child.name}&apos;s Dashboard</h2>
         </div>
         
         <div className="hidden md:flex gap-3 z-10">
           <a href={urls.quickEntry} className="bg-sky-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:bg-sky-400 hover:scale-105 transition-all flex items-center gap-2">
             <Plus size={16} /> {s.quickEntry || "Add Entry"}
           </a>
         </div>
      </header>

      {/* Hero Stats (Mocked Presentation for Phase 1 Tailwind Release) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard title={s.lastSleep || "Last Sleep"} value="2h 45m" subtitle="Finished at 1:30 PM" icon={<Moon />} color="text-indigo-400" bg="bg-indigo-500/10" border="border-indigo-500/20" />
         <StatCard title={s.lastFeeding || "Last Feeding"} value="4.5 oz" subtitle="Formula at 4:15 PM" icon={<Utensils />} color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
         <StatCard title={s.lastDiaper || "Last Diaper"} value="Wet" subtitle="Changed at 3:00 PM" icon={<Droplet />} color="text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20" />
         <StatCard title={s.tummyTime || "Tummy Time"} value="15m" subtitle="Today total: 30m" icon={<Activity />} color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Center Activity Dial Mockup Area */}
         <div className="lg:col-span-2 glass-card p-8 flex flex-col min-h-[400px]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold tracking-tight text-white">{s.dailySummary || "Daily Summary"}</h3>
              <button className="text-slate-400 hover:text-white"><MoreHorizontal /></button>
           </div>
           <div className="flex-1 flex flex-col items-center justify-center w-full">
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

         {/* Recent Activity Timeline Mockup */}
         <div className="glass-card p-6 flex flex-col">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold tracking-tight text-white">{s.recentActivity || "Recent Activity"}</h3>
              {urls.timeline && <a href={urls.timeline} className="text-sky-400 text-xs font-semibold tracking-wider uppercase hover:text-sky-300">View All</a>}
           </div>
           
           <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              <TimelineItem title="Feeding" time="2 hours ago" type="feed" />
              <TimelineItem title="Sleep" time="4 hours ago" type="sleep" />
              <TimelineItem title="Diaper" time="5 hours ago" type="diaper" />
              <TimelineItem title="Tummy Time" time="6 hours ago" type="activity" />
           </div>
         </div>
      </div>
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
