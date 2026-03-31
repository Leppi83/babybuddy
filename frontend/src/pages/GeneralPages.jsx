import React, { useEffect, useRef, useState } from "react";
import { Edit2, Trash2, Plus, ChevronDown } from "lucide-react";
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

// ── Shared primitives ─────────────────────────────────────────

function GlassCard({ children, title, extra, className = "" }) {
  return (
    <div className={`glass-card p-6 flex flex-col ${className}`}>
      {(title || extra) && (
        <div className="flex justify-between items-center mb-5">
          {title && <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>}
          {extra && <div>{extra}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Btn({ children, href, onClick, type = "default", danger = false, size = "default", className = "", htmlType = "button", name, value, disabled = false }) {
  let base = "inline-flex items-center gap-2 justify-center font-bold tracking-wide transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:pointer-events-none";
  if (size === "small") base += " px-3 py-1.5 text-xs";
  else if (size === "large") base += " px-8 py-4 text-base";
  else base += " px-5 py-2.5 text-sm";
  if (danger) base += " bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white";
  else if (type === "primary") base += " bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:bg-sky-400 border border-sky-400/50";
  else if (type === "link") base += " text-sky-400 hover:text-sky-300 hover:underline bg-transparent px-0 shadow-none";
  else base += " bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white";
  const cls = `${base} ${className}`;
  if (href) return <a href={href} className={cls} onClick={onClick}>{children}</a>;
  return <button type={htmlType} name={name} value={value} onClick={onClick} className={cls} disabled={disabled}>{children}</button>;
}

function Banner({ banner }) {
  if (!banner) return null;
  const styles = {
    error: "bg-rose-500/10 border-rose-500/30 text-rose-300",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  };
  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between ${styles[banner.type] || styles.warning}`}>
      <span className="font-bold">{banner.message}</span>
      {banner.action && <Btn href={banner.action.href} size="small">{banner.action.label}</Btn>}
    </div>
  );
}

// ── Pages ─────────────────────────────────────────────────────

export function ListPage({ bootstrap }) {
  const pagination = bootstrap.listPage.pagination;
  const columns = bootstrap.listPage.columns;
  const rows = bootstrap.listPage.rows;

  function handlePageChange(direction) {
    const url = new URL(window.location.href);
    let page = pagination.page + (direction === "next" ? 1 : -1);
    if (page <= 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(page));
    window.location.assign(url.toString());
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {(bootstrap.listPage.addActions || []).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {bootstrap.listPage.addActions.map((action) => (
            <Btn key={action.href} type="primary" href={action.href}>
              <Plus size={14} />{action.label}
            </Btn>
          ))}
        </div>
      )}
      <GlassCard>
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{col.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500 italic">{bootstrap.strings.empty}</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.key || i} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 align-middle text-slate-300">{renderListCell(row.cells[col.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.total > pagination.pageSize && (
          <div className="flex justify-between items-center mt-5">
            <span className="text-slate-400 text-sm">Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}</span>
            <div className="flex gap-2">
              <Btn size="small" onClick={() => handlePageChange("prev")} disabled={pagination.page <= 1}>{bootstrap.strings.previous || "Previous"}</Btn>
              <Btn size="small" onClick={() => handlePageChange("next")} disabled={pagination.page * pagination.pageSize >= pagination.total}>{bootstrap.strings.next || "Next"}</Btn>
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
        <p className="text-rose-400 font-bold p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">{bootstrap.formPage.dangerText}</p>
      )}
      <Banner banner={bootstrap.messageBanner} />
      <form action={bootstrap.urls.self} method="post" encType={bootstrap.formPage.enctype} className="flex flex-col gap-6">
        <input type="hidden" name="csrfmiddlewaretoken" value={bootstrap.csrfToken} />
        {(bootstrap.formPage.hiddenInputs || []).map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value} />
        ))}
        {(bootstrap.formPage.fieldsets || []).map((fieldset, i) => (
          <GlassCard key={fieldset.key || i} title={fieldset.label || bootstrap.strings.form}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {fieldset.fields.map((field) => {
                if (field.type === "hidden") {
                  return <input key={field.name} type="hidden" name={field.name} value={field.value != null ? String(field.value) : ""} />;
                }
                const wide = field.type === "textarea" || field.type === "radio" || field.type === "tags";
                return (
                  <div key={`${fieldset.key}-${field.name}`} className={`flex flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
                    <div className="flex justify-between items-baseline">
                      <label className="text-sm font-bold text-slate-200">{field.label}</label>
                      <span className="text-xs text-slate-500 uppercase tracking-widest">{field.required ? bootstrap.strings.required : bootstrap.strings.optional}</span>
                    </div>
                    <TailwindFieldControl field={field} value={values[field.name]} onChange={(v) => updateValue(field.name, v)} />
                    <HiddenFieldInput field={field} value={values[field.name]} />
                    {field.helpText && <p className="text-xs text-slate-500">{field.helpText}</p>}
                    {field.errors?.length > 0 && <p className="text-sm text-rose-400 font-semibold">{field.errors[0]}</p>}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        ))}
        <div className="flex flex-wrap gap-3 mt-2">
          <Btn htmlType="submit" type="primary" size="large" danger={deleteMode}>{bootstrap.formPage.submitLabel}</Btn>
          <Btn href={bootstrap.urls.cancel} size="large">{bootstrap.formPage.cancelLabel}</Btn>
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
        {(message.body || []).map((p, i) => <p key={i} className="text-slate-300 text-lg leading-relaxed">{p}</p>)}
        {message.actions?.length > 0 && (
          <div className="flex justify-center gap-4 mt-4">
            {message.actions.map(a => <Btn key={a.href} href={a.href} type="primary" size="large">{a.label}</Btn>)}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export function WelcomePage({ bootstrap }) {
  const features = [bootstrap.strings.diaperChanges, bootstrap.strings.feedings, bootstrap.strings.sleep, bootstrap.strings.tummyTime];
  return (
    <GlassCard className="max-w-3xl mx-auto mt-10 p-12 items-center text-center">
      <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">{bootstrap.strings.welcomeIntro}</h2>
      <p className="text-slate-400 text-lg mb-8 max-w-xl">{bootstrap.strings.welcomeBody}</p>
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {features.map(f => (
          <span key={f} className="px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-semibold">{f}</span>
        ))}
      </div>
      {bootstrap.urls.addChild && (
        <Btn type="primary" href={bootstrap.urls.addChild} size="large">{bootstrap.strings.addChild}</Btn>
      )}
    </GlassCard>
  );
}

export function DeviceAccessPage({ bootstrap }) {
  const da = bootstrap.deviceAccess;
  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full">
      <p className="text-slate-400">{bootstrap.strings.deviceAccessDescription}</p>
      <Banner banner={bootstrap.messageBanner} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GlassCard title={bootstrap.strings.key}>
          <div className="flex flex-col gap-4">
            <input type="text" value={da.apiKey} readOnly className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-sky-400 font-mono focus:outline-none" />
            <form action={bootstrap.urls.self} method="post">
              <input type="hidden" name="csrfmiddlewaretoken" value={bootstrap.csrfToken} />
              <Btn htmlType="submit" danger name="api_key_regenerate" value="1">{da.regenerateLabel}</Btn>
            </form>
          </div>
        </GlassCard>
        <GlassCard title={bootstrap.strings.loginQrCode}>
          <div className="bg-white p-4 rounded-xl flex items-center justify-center mx-auto w-fit" dangerouslySetInnerHTML={{ __html: da.qrMarkup }} />
        </GlassCard>
      </div>
      <div><Btn href={bootstrap.urls.settings}>{da.backLabel}</Btn></div>
    </div>
  );
}

export function ChildDetailPage({ bootstrap }) {
  const child = bootstrap.childDetail;
  const items = child.timeline || [];

  const [addOpen, setAddOpen] = useState(false);

  const addLinks = [
    bootstrap.urls.addWeight && { label: bootstrap.strings.weight || "Weight", href: bootstrap.urls.addWeight },
    bootstrap.urls.addHeight && { label: bootstrap.strings.height || "Height", href: bootstrap.urls.addHeight },
    bootstrap.urls.addMilestone && { label: bootstrap.strings.milestone || "Milestone", href: bootstrap.urls.addMilestone },
    bootstrap.urls.addNote && { label: bootstrap.strings.note || "Note", href: bootstrap.urls.addNote },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl">
      <GlassCard>
        <div className="flex flex-col md:flex-row items-start gap-6">
          {child.photoUrl ? (
            <img src={child.photoUrl} alt={child.name} className="w-28 h-28 rounded-2xl object-cover border-2 border-sky-500/30" />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-4xl text-slate-500">{child.name?.[0]}</div>
          )}
          <div className="flex-1">
            <h2 className="text-3xl font-extrabold text-white mb-1">{child.name}</h2>
            <p className="text-slate-400 mb-4">{bootstrap.strings.born}: <span className="text-slate-200">{child.birthLabel}</span> · {bootstrap.strings.age}: <span className="text-sky-400 font-semibold">{child.ageLabel}</span></p>
            <div className="flex flex-wrap gap-2">
              {bootstrap.urls.examinations && (
                <Btn href={bootstrap.urls.examinations}>{bootstrap.strings.examinations || "Examinations"}</Btn>
              )}
              {addLinks.length > 0 && (
                <div className="relative">
                  <Btn onClick={() => setAddOpen(o => !o)}>
                    <Plus size={14} />{bootstrap.strings.addEntry || "Add entry"}<ChevronDown size={12} />
                  </Btn>
                  {addOpen && (
                    <div className="absolute left-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-10 overflow-hidden">
                      {addLinks.map(l => (
                        <a key={l.href} href={l.href} className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">{l.label}</a>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {child.actions?.edit && (
                <Btn href={child.actions.edit}><Edit2 size={13} />{bootstrap.strings.edit}</Btn>
              )}
              {child.actions?.delete && (
                <Btn href={child.actions.delete} danger><Trash2 size={13} />{bootstrap.strings.delete}</Btn>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard
        title={child.dateLabel}
        extra={(
          <div className="flex gap-2">
            {child.previousUrl && <Btn size="small" href={child.previousUrl}>{bootstrap.strings.previous}</Btn>}
            {child.nextUrl && <Btn size="small" href={child.nextUrl}>{bootstrap.strings.next}</Btn>}
          </div>
        )}
      >
        {items.length === 0 ? (
          <div className="py-12 text-center text-slate-500 italic">{bootstrap.strings.noEvents}</div>
        ) : (
          <div className="border-l-2 border-slate-700 ml-4 pl-6 space-y-6 py-4">
            {items.map((entry, i) => {
              const dot = entry.type === "start" ? "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                          entry.type === "end" ? "border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                          "border-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]";
              return (
                <div key={entry.key || i} className="relative">
                  <div className={`absolute -left-[35px] bg-slate-900 h-4 w-4 rounded-full border-2 ${dot}`} />
                  <div className="flex flex-col gap-1.5 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-400 text-sm">{entry.timeLabel}</span>
                      <span className="text-slate-500 text-xs">{entry.sinceLabel}</span>
                    </div>
                    <span className="font-extrabold text-slate-100">{entry.event}</span>
                    {entry.details?.length > 0 && entry.details.map((d, j) => <span key={j} className="text-slate-400 text-sm">{d}</span>)}
                    {entry.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {entry.tags.map(t => <span key={t.name} className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-800 border border-slate-600 text-slate-300">{t.name}</span>)}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {entry.duration && <span className="text-xs text-slate-400 font-medium">{bootstrap.strings.duration}: {entry.duration}</span>}
                      {entry.timeSincePrev && <span className="text-xs text-sky-400">{entry.timeSincePrev} {bootstrap.strings.sincePrevious}</span>}
                      {entry.editLink && <Btn size="small" href={entry.editLink}><Edit2 size={11} />{bootstrap.strings.edit}</Btn>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export function TagDetailPage({ bootstrap }) {
  const tag = bootstrap.tagDetail;
  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full">
      <GlassCard>
        <div className="flex items-center gap-4 mb-4">
          <span className="px-4 py-2 rounded-full text-lg font-bold" style={{ background: (tag.color || "#38bdf8") + "22", color: tag.color || "#38bdf8", border: `1px solid ${(tag.color || "#38bdf8")}44` }}>{tag.name}</span>
          {tag.actions?.edit && <Btn href={tag.actions.edit}><Edit2 size={13} />{bootstrap.strings.edit}</Btn>}
          {tag.actions?.delete && <Btn href={tag.actions.delete} danger><Trash2 size={13} />{bootstrap.strings.delete}</Btn>}
        </div>
      </GlassCard>
      {tag.sections?.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {tag.sections.map(section => (
            <GlassCard key={section.title} title={section.title}>
              <div className="flex flex-col gap-1">
                {(section.items || []).map(item => (
                  <a key={item.href} href={item.href} className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-slate-900/30 hover:bg-slate-800 border border-slate-700/50 transition-colors group">
                    <span className="text-sm text-slate-300 group-hover:text-white">{item.label}</span>
                    <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg">{item.count}</span>
                  </a>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

export function TimerDetailPage({ bootstrap }) {
  const timer = bootstrap.timerDetail;
  const [durationLabel, setDurationLabel] = useState("");

  function formatDuration() {
    const start = new Date(timer.start);
    const diff = Math.max(0, Date.now() - start.getTime());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  }

  useEffect(() => {
    setDurationLabel(formatDuration());
    const id = setInterval(() => setDurationLabel(formatDuration()), 1000);
    return () => clearInterval(id);
  }, [timer.start]);

  function submitPost(url) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = url;
    const csrf = document.createElement("input");
    csrf.type = "hidden";
    csrf.name = "csrfmiddlewaretoken";
    csrf.value = bootstrap.csrfToken;
    form.appendChild(csrf);
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <GlassCard className="text-center items-center">
        <div className="text-5xl font-mono font-extrabold text-sky-400 py-6 tabular-nums tracking-tight">{durationLabel}</div>
        <p className="text-slate-400 text-sm">{bootstrap.strings.started} {timer.start}</p>
        <p className="text-slate-500 text-sm mt-1">{timer.name} · {bootstrap.strings.createdBy} {timer.createdBy}</p>
        {timer.child && <span className="mt-2 px-3 py-1 text-xs font-bold rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">{timer.child}</span>}
      </GlassCard>
      <GlassCard title={bootstrap.strings.actions}>
        <div className="flex flex-wrap gap-3">
          {(timer.quickActions || []).map(a => <Btn key={a.href} type="primary" href={a.href}>{a.label}</Btn>)}
          {timer.actions?.edit && <Btn href={timer.actions.edit}><Edit2 size={13} />{bootstrap.strings.edit}</Btn>}
          {timer.actions?.delete && <Btn href={timer.actions.delete} danger><Trash2 size={13} />{bootstrap.strings.delete}</Btn>}
          {timer.actions?.restart && <Btn onClick={() => submitPost(timer.actions.restart)}>{bootstrap.strings.restartTimer || "Restart"}</Btn>}
        </div>
      </GlassCard>
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
          {timeline.previousUrl && <Btn size="small" href={timeline.previousUrl}>{bootstrap.strings.previous}</Btn>}
          {timeline.nextUrl && <Btn size="small" href={timeline.nextUrl}>{bootstrap.strings.next}</Btn>}
        </div>
      )}
    >
      {items.length === 0 ? (
        <div className="py-12 text-center text-slate-500 italic">{bootstrap.strings.noEvents}</div>
      ) : (
        <div className="border-l-2 border-slate-700 ml-4 pl-6 space-y-6 py-4">
          {items.map((entry, i) => {
            const dot = entry.type === "start" ? "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                        entry.type === "end" ? "border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                        "border-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]";
            return (
              <div key={entry.key || i} className="relative">
                <div className={`absolute -left-[35px] bg-slate-900 h-4 w-4 rounded-full border-2 ${dot}`} />
                <div className="flex flex-col gap-1.5 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-400 text-sm">{entry.timeLabel}</span>
                    <span className="text-slate-500 text-xs">{entry.sinceLabel}</span>
                  </div>
                  <span className="font-extrabold text-slate-100">{entry.event}</span>
                  {entry.details?.length > 0 && entry.details.map((d, j) => <span key={j} className="text-slate-400 text-sm">{d}</span>)}
                  {entry.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {entry.tags.map(t => <span key={t.name} className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-800 border border-slate-600 text-slate-300">{t.name}</span>)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {entry.duration && <span className="text-xs text-slate-400">{bootstrap.strings.duration}: {entry.duration}</span>}
                    {entry.timeSincePrev && <span className="text-xs text-sky-400">{entry.timeSincePrev} {bootstrap.strings.sincePrevious}</span>}
                    {entry.editLink && <Btn size="small" href={entry.editLink}><Edit2 size={11} />{bootstrap.strings.edit}</Btn>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

export function ReportListPage({ bootstrap }) {
  const reportList = bootstrap.reportList;
  const grouped = (reportList.entries || []).reduce((acc, entry) => {
    const cat = entry.category || bootstrap.strings.reports;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
        <h2 className="text-lg font-bold text-slate-200">{bootstrap.strings.reportSummary}</h2>
        <div className="flex gap-2">
          {reportList.actions?.dashboard && <Btn href={reportList.actions.dashboard}>{bootstrap.strings.dashboard}</Btn>}
          {reportList.actions?.timeline && <Btn href={reportList.actions.timeline}>{bootstrap.strings.timeline}</Btn>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Object.entries(grouped).map(([cat, items]) => (
          <GlassCard key={cat} title={cat}>
            <div className="flex flex-col gap-2">
              {items.map(item => (
                <a key={item.href} href={item.href} className="flex justify-between items-center p-3.5 bg-slate-900/40 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-colors group">
                  <span className="text-sm font-semibold text-slate-300 group-hover:text-white">{item.title}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-lg group-hover:bg-sky-500 group-hover:text-white transition-colors">{bootstrap.strings.open || "Open"}</span>
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
      if (!graphRef.current || !report.html) { if (graphRef.current) graphRef.current.innerHTML = ""; return; }
      await loadScriptOnce(bootstrap.urls.graphJs);
      if (cancelled || !graphRef.current) return;
      graphRef.current.innerHTML = report.html;
      if (window.Plotly && report.plotlyLocale) window.Plotly.setPlotConfig({ locale: report.plotlyLocale });
      const script = extractScriptContent(report.js).trim();
      if (script) { try { new Function(script)(); } catch (e) { console.error(e); } }
    }
    renderGraph();
    return () => { cancelled = true; if (graphRef.current) graphRef.current.innerHTML = ""; };
  }, [bootstrap.urls.graphJs, report.html, report.js, report.plotlyLocale]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
        <h2 className="text-lg font-bold text-slate-200">{report.childName}</h2>
        <div className="flex flex-wrap gap-2">
          {report.actions?.dashboard && <Btn href={report.actions.dashboard}>{bootstrap.strings.dashboard}</Btn>}
          {report.actions?.timeline && <Btn href={report.actions.timeline}>{bootstrap.strings.timeline}</Btn>}
          {report.actions?.reports && <Btn href={report.actions.reports} type="primary">{bootstrap.strings.reports}</Btn>}
        </div>
      </div>
      <GlassCard>
        {report.html ? (
          <div className="w-full overflow-x-auto rounded-xl bg-white p-4" ref={graphRef} />
        ) : (
          <div className="py-24 text-center italic text-slate-500">{bootstrap.strings.noReportData || "No data available"}</div>
        )}
      </GlassCard>
    </div>
  );
}

export function DashboardHomePage({ bootstrap }) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {bootstrap.urls.addChild && (
        <div className="flex justify-end">
          <Btn type="primary" href={bootstrap.urls.addChild}><Plus size={14} />{bootstrap.strings.addChild}</Btn>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {(bootstrap.children || []).map(child => (
          <a key={child.id} href={child.dashboardUrl} className="group block glass-card p-0 overflow-hidden hover:border-sky-500/40 transition-all">
            <div className="relative h-40 overflow-hidden">
              <img src={child.pictureUrl} alt={child.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <h3 className="text-lg font-extrabold text-white">{child.name}</h3>
                <p className="text-sm text-slate-300">{bootstrap.strings.born}: {child.birthDateLabel}{child.ageLabel ? ` (${child.ageLabel})` : ""}</p>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-700/50">
              <span className="text-sm font-bold text-sky-400 group-hover:text-sky-300">{bootstrap.strings.openDashboard} →</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function QuickEntryPage({ bootstrap }) {
  return <QuickEntryCard bootstrap={bootstrap} />;
}
