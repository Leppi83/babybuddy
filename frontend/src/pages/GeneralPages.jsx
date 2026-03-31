import React, { useEffect, useRef, useState } from "react";
import { QuickEntryCard } from "../components/QuickEntryCard";
import {
  TailwindFieldControl,
  buildInitialFormState,
  extractScriptContent,
  formatHiddenValue,
  HiddenFieldInput,
  loadScriptOnce,
  renderListCell,
} from "../lib/app-utils";

function GlassCard({ children, title, extra, className = "" }) {
  return (
    <div className={`glass-card p-6 flex flex-col ${className}`}>
      {(title || extra) && (
        <div className="flex justify-between items-center mb-6">
          {title && <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>}
          {extra && <div>{extra}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Button({ children, href, onClick, type = "default", danger = false, size = "default", className = "", htmlType="button", name, value }) {
  let baseClass = "inline-flex items-center justify-center font-bold tracking-wide transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50";
  
  if (size === "small") baseClass += " px-3 py-1.5 text-xs";
  else if (size === "large") baseClass += " px-8 py-4 text-base";
  else baseClass += " px-5 py-2.5 text-sm";

  if (danger) {
    baseClass += " bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white shadow-[0_0_15px_rgba(244,63,94,0.1)]";
  } else if (type === "primary") {
    baseClass += " bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:bg-sky-400 hover:scale-105 border border-sky-400/50";
  } else if (type === "link") {
    baseClass += " text-sky-400 hover:text-sky-300 hover:underline bg-transparent px-0 shadow-none";
  } else {
    baseClass += " bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500";
  }

  const combinedClass = `${baseClass} ${className}`;

  if (href) {
    return <a href={href} onClick={onClick} className={combinedClass}>{children}</a>;
  }
  return <button type={htmlType} name={name} value={value} onClick={onClick} className={combinedClass}>{children}</button>;
}

export function ListPage({ bootstrap }) {
  const pagination = bootstrap.listPage.pagination;
  const columns = bootstrap.listPage.columns;
  const rows = bootstrap.listPage.rows;

  function handlePageChange(direction) {
    const url = new URL(window.location.href);
    let page = pagination.page;
    if (direction === "next") page++;
    if (direction === "prev") page--;
    
    if (page <= 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(page));
    window.location.assign(url.toString());
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {(bootstrap.listPage.addActions || []).length > 0 && (
        <div className="flex flex-wrap gap-4">
          {bootstrap.listPage.addActions.map((action) => (
            <Button key={action.href} type="primary" href={action.href}>
              {action.label}
            </Button>
          ))}
        </div>
      )}
      
      <GlassCard title={bootstrap.strings.list}>
        <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/30">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                {columns.map(col => (
                  <th key={col.key} className="p-4 text-sm font-bold text-slate-300 uppercase tracking-wider">{col.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-10 text-center text-slate-500 italic">
                    {bootstrap.strings.empty}
                  </td>
                </tr>
              ) : rows.map((row, i) => (
                <tr key={row.key || i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="p-4 align-middle">
                      {renderListCell(row.cells[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {pagination && pagination.total > pagination.pageSize && (
          <div className="flex justify-between items-center mt-6">
             <span className="text-slate-400 text-sm">
               Showing page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
             </span>
             <div className="flex gap-2">
               <Button size="small" onClick={() => handlePageChange("prev")} className={pagination.page <= 1 ? "opacity-50 pointer-events-none" : ""}>Previous</Button>
               <Button size="small" onClick={() => handlePageChange("next")} className={(pagination.page * pagination.pageSize) >= pagination.total ? "opacity-50 pointer-events-none" : ""}>Next</Button>
             </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export function AntFormPage({ bootstrap, deleteMode = false }) {
  const [values, setValues] = useState(() => buildInitialFormState(bootstrap.formPage.fieldsets || []));

  useEffect(() => {
    setValues(buildInitialFormState(bootstrap.formPage.fieldsets || []));
  }, [bootstrap]);

  function updateValue(name, nextValue) {
    setValues((current) => ({ ...current, [name]: nextValue }));
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl">
      {!deleteMode && bootstrap.formPage.description && (
        <p className="text-slate-400">{bootstrap.formPage.description}</p>
      )}
      {deleteMode && bootstrap.formPage.dangerText && (
        <p className="text-rose-400 font-bold p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          {bootstrap.formPage.dangerText}
        </p>
      )}

      {bootstrap.messageBanner && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          bootstrap.messageBanner.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' :
          bootstrap.messageBanner.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
          'bg-sky-500/10 border-sky-500/30 text-sky-300'
        }`}>
           <span className="font-medium font-bold">{bootstrap.messageBanner.message}</span>
           {bootstrap.messageBanner.action && (
             <Button href={bootstrap.messageBanner.action.href} size="small">{bootstrap.messageBanner.action.label}</Button>
           )}
        </div>
      )}

      <form action={bootstrap.urls.self} method="post" encType={bootstrap.formPage.enctype} className="flex flex-col gap-8">
        <input type="hidden" name="csrfmiddlewaretoken" value={bootstrap.csrfToken} />
        {(bootstrap.formPage.hiddenInputs || []).map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value} />
        ))}
        
        {(bootstrap.formPage.fieldsets || []).map((fieldset, i) => (
          <GlassCard key={fieldset.key || i} title={fieldset.label || bootstrap.strings.form}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fieldset.fields.map((field) => {
                if (field.type === "hidden") {
                  return <input key={field.name} type="hidden" name={field.name} value={field.value != null ? String(field.value) : ""} />;
                }
                const isFullWidth = field.type === "textarea" || field.type === "radio" || field.type === "tags";
                return (
                  <div key={`${fieldset.key}-${field.name}`} className={`flex flex-col gap-2 ${isFullWidth ? "md:col-span-2" : ""}`}>
                     <div className="flex justify-between items-baseline mb-1">
                       <label className="text-slate-200 font-bold">{field.label}</label>
                       <span className="text-xs text-slate-500 uppercase tracking-widest">{field.required ? bootstrap.strings.required : bootstrap.strings.optional}</span>
                     </div>
                     
                     <TailwindFieldControl
                       field={field}
                       value={values[field.name]}
                       onChange={(nextValue) => updateValue(field.name, nextValue)}
                     />
                     <HiddenFieldInput field={field} value={values[field.name]} />
                     
                     {field.helpText && <p className="text-xs text-slate-500 mt-1">{field.helpText}</p>}
                     {field.errors?.length > 0 && <p className="text-sm text-rose-400 font-semibold mt-1">{field.errors[0]}</p>}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        ))}
        
        <div className="flex flex-wrap gap-4 mt-4">
          <Button htmlType="submit" type="primary" size="large" danger={deleteMode}>
            {bootstrap.formPage.submitLabel}
          </Button>
          <Button href={bootstrap.urls.cancel} size="large">
            {bootstrap.formPage.cancelLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function MessagePage({ bootstrap }) {
  const message = bootstrap.messagePage;
  return (
    <GlassCard className="max-w-2xl mx-auto mt-10 text-center items-center p-12">
      <div className="flex flex-col gap-6">
        {(message.body || []).map((paragraph, index) => (
          <p key={index} className="text-slate-300 text-lg leading-relaxed">{paragraph}</p>
        ))}
        {message.actions?.length > 0 && (
          <div className="flex justify-center gap-4 mt-6">
            {message.actions.map((action) => (
              <Button key={action.href} href={action.href} type="primary" size="large">{action.label}</Button>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export function WelcomePage({ bootstrap }) {
  const featureItems = [
    bootstrap.strings.diaperChanges,
    bootstrap.strings.feedings,
    bootstrap.strings.sleep,
    bootstrap.strings.tummyTime,
  ];

  return (
    <GlassCard className="max-w-3xl mx-auto mt-10 p-12 items-center text-center">
      <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">{bootstrap.strings.welcomeIntro}</h2>
      <p className="text-slate-400 text-lg mb-8 max-w-xl">{bootstrap.strings.welcomeBody}</p>
      
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {featureItems.map((item) => (
          <span key={item} className="px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-semibold shadow-[0_0_15px_rgba(56,189,248,0.1)]">
            {item}
          </span>
        ))}
      </div>
      
      {bootstrap.urls.addChild && (
        <Button type="primary" href={bootstrap.urls.addChild} size="large" className="text-lg">
          {bootstrap.strings.addChild}
        </Button>
      )}
    </GlassCard>
  );
}

export function DeviceAccessPage({ bootstrap }) {
  const deviceAccess = bootstrap.deviceAccess;
  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full">
      <p className="text-slate-400">{bootstrap.strings.deviceAccessDescription}</p>

      {bootstrap.messageBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
          {bootstrap.messageBanner.message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GlassCard title={bootstrap.strings.key}>
          <div className="flex flex-col gap-4">
            <input type="text" value={deviceAccess.apiKey} readOnly className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-sky-400 font-mono focus:outline-none" />
            <form action={bootstrap.urls.self} method="post">
              <input type="hidden" name="csrfmiddlewaretoken" value={bootstrap.csrfToken} />
              <Button htmlType="submit" danger name="api_key_regenerate" value="1">
                {deviceAccess.regenerateLabel}
              </Button>
            </form>
          </div>
        </GlassCard>
        
        <GlassCard title={bootstrap.strings.loginQrCode}>
          <div className="bg-white p-4 rounded-xl flex items-center justify-center mx-auto w-fit" dangerouslySetInnerHTML={{ __html: deviceAccess.qrMarkup }} />
        </GlassCard>
      </div>

      <div>
        <Button href={bootstrap.urls.settings}>{deviceAccess.backLabel}</Button>
      </div>
    </div>
  );
}

export function TimelinePage({ bootstrap }) {
  const timeline = bootstrap.timelinePage;
  const items = timeline.items || [];
  
  return (
    <GlassCard 
      title={timeline.dateLabel}
      extra={(
        <div className="flex gap-2">
          {timeline.previousUrl && <Button size="small" href={timeline.previousUrl}>{bootstrap.strings.previous}</Button>}
          {timeline.nextUrl && <Button size="small" href={timeline.nextUrl}>{bootstrap.strings.next}</Button>}
        </div>
      )}
    >
      {items.length === 0 ? (
        <div className="py-12 text-center text-slate-500 font-medium italic">{bootstrap.strings.noEvents}</div>
      ) : (
        <div className="border-l-2 border-slate-700 ml-4 pl-6 space-y-8 py-4">
          {items.map((entry, index) => {
             const markerColor = entry.type === "start" ? "border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : 
                                 entry.type === "end" ? "border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : 
                                 "border-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.5)]";
             return (
               <div key={entry.key || index} className="relative">
                 <div className={`absolute -left-[35px] bg-slate-900 h-4 w-4 rounded-full border-2 ${markerColor}`}></div>
                 <div className="flex flex-col gap-2 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sky-400">{entry.timeLabel}</span>
                      <span className="text-slate-500 text-sm">{entry.sinceLabel}</span>
                    </div>
                    <span className="font-extrabold text-lg text-slate-100">{entry.event}</span>
                    
                    {entry.details?.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        {entry.details.map((d, i) => <span key={i} className="text-slate-400 text-sm">{d}</span>)}
                      </div>
                    )}
                    
                    {entry.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                         {entry.tags.map(tag => (
                           <span key={tag.name} className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-slate-800 border border-slate-600 text-slate-300">
                             {tag.name}
                           </span>
                         ))}
                      </div>
                    )}
                 </div>
               </div>
             );
          })}
        </div>
      )}
    </GlassCard>
  );
}

export function DashboardHomePage({ bootstrap }) {
  return null; // Overridden by TailwindDashboard.jsx
}

export function ChildDetailPage({ bootstrap }) {
  const child = bootstrap.childDetail;
  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <GlassCard>
        <div className="flex flex-col md:flex-row items-center gap-6">
          {child.pictureUrl ? (
            <img src={child.pictureUrl} alt={child.name} className="w-32 h-32 rounded-full border-4 border-sky-500/50 object-cover shadow-[0_0_20px_rgba(56,189,248,0.2)]" />
          ) : (
             <div className="w-32 h-32 rounded-full border-4 border-slate-700 bg-slate-800 flex items-center justify-center">
               <span className="text-4xl text-slate-500">{child.name?.[0]}</span>
             </div>
          )}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl font-extrabold text-white mb-2">{child.name}</h2>
            <div className="text-slate-400 font-medium">Born: <span className="text-slate-200">{child.birthDateLabel}</span> {child.ageLabel && `(${child.ageLabel})`}</div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
             {child.actions?.dashboard && <Button href={child.actions.dashboard} type="primary">{bootstrap.strings.dashboard}</Button>}
             {child.actions?.edit && <Button href={child.actions.edit}>{bootstrap.strings.edit}</Button>}
             {child.actions?.timeline && <Button href={child.actions.timeline}>{bootstrap.strings.timeline}</Button>}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export function TagDetailPage({ bootstrap }) {
  const tag = bootstrap.tagDetail;
  return (
    <GlassCard title={tag.name}>
      <div className="flex flex-wrap gap-4 mt-4">
         {tag.actions?.edit && <Button href={tag.actions.edit} type="primary">{bootstrap.strings.edit}</Button>}
         {tag.actions?.delete && <Button href={tag.actions.delete} danger>{bootstrap.strings.delete}</Button>}
      </div>
    </GlassCard>
  );
}

export function TimerDetailPage({ bootstrap }) {
  const timer = bootstrap.timerDetail;
  return (
    <GlassCard title={timer.name || "Timer"}>
      <div className="text-4xl font-mono text-sky-400 font-extrabold py-8 text-center bg-slate-900/40 rounded-xl border border-slate-700">
         {timer.durationLabel || "00:00"}
      </div>
      <div className="flex flex-wrap gap-4 mt-6">
         {timer.actions?.edit && <Button href={timer.actions.edit} type="primary">{bootstrap.strings.edit}</Button>}
         {timer.actions?.delete && <Button href={timer.actions.delete} danger>{bootstrap.strings.delete}</Button>}
      </div>
    </GlassCard>
  );
}

export function ReportListPage({ bootstrap }) {
  const reportList = bootstrap.reportList;
  const entries = reportList.entries || [];
  
  const grouped = entries.reduce((acc, entry) => {
    const cat = entry.category || bootstrap.strings.reports;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
         <h2 className="text-xl font-bold text-slate-200">{bootstrap.strings.reportSummary}</h2>
         <div className="flex gap-3">
           {reportList.actions?.dashboard && <Button href={reportList.actions.dashboard}>{bootstrap.strings.dashboard}</Button>}
           {reportList.actions?.timeline && <Button href={reportList.actions.timeline}>{bootstrap.strings.timeline}</Button>}
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(grouped).map(([category, items]) => (
          <GlassCard key={category} title={category}>
            <div className="flex flex-col gap-2">
              {items.map(item => (
                <a key={item.href} href={item.href} className="flex justify-between items-center p-4 bg-slate-900/40 hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors group">
                  <span className="font-semibold text-slate-300 group-hover:text-white transition-colors">{item.title}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-sky-500 bg-sky-500/10 px-3 py-1.5 rounded-lg group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    {bootstrap.strings.open || "Open"}
                  </span>
                </a>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

export function ReportDetailPage({ bootstrap }) {
  const report = bootstrap.reportDetail;
  const graphRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function renderGraph() {
      if (!graphRef.current) return;
      if (!report.html) {
        graphRef.current.innerHTML = "";
        return;
      }
      await loadScriptOnce(bootstrap.urls.graphJs);
      if (cancelled || !graphRef.current) return;
      
      graphRef.current.innerHTML = report.html;
      if (window.Plotly && report.plotlyLocale) {
        window.Plotly.setPlotConfig({ locale: report.plotlyLocale });
      }
      const scriptContent = extractScriptContent(report.js).trim();
      if (scriptContent) {
        try { new Function(scriptContent)(); } catch (e) { console.error("Report plot failed:", e); }
      }
    }
    renderGraph();
    return () => {
      cancelled = true;
      if (graphRef.current) graphRef.current.innerHTML = "";
    };
  }, [bootstrap.urls.graphJs, report.html, report.js, report.plotlyLocale]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
         <h2 className="text-xl font-bold text-slate-200">{report.childName}</h2>
         <div className="flex flex-wrap gap-3">
           {report.actions?.dashboard && <Button href={report.actions.dashboard}>{bootstrap.strings.dashboard}</Button>}
           {report.actions?.timeline && <Button href={report.actions.timeline}>{bootstrap.strings.timeline}</Button>}
           {report.actions?.reports && <Button href={report.actions.reports} type="primary">{bootstrap.strings.reports}</Button>}
         </div>
      </div>
      
      <GlassCard>
        {report.html ? (
           <div className="w-full overflow-x-auto overflow-y-hidden rounded-xl bg-white/5 p-4 border border-white/10" style={{ filter: "invert(0.9) hue-rotate(180deg) brightness(0.95)" }}>
             <div ref={graphRef} className="w-full min-h-[500px]" />
           </div>
        ) : (
           <div className="py-24 text-center italic text-slate-500 font-medium">
             {bootstrap.strings.noReportData || "No data available for this report"}
           </div>
        )}
      </GlassCard>
    </div>
  );
}
export function QuickEntryPage({ bootstrap }) {
  return <QuickEntryCard bootstrap={bootstrap} />;
}
