import React, { useState } from "react";
import { Check, Clock, AlertCircle, Stethoscope, ArrowLeft } from "lucide-react";
import dayjs from "dayjs";

const STATUS_COLOR = {
  completed: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500" },
  due: { bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-400", dot: "bg-sky-500" },
  overdue: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", dot: "bg-rose-500" },
  upcoming: { bg: "bg-slate-700/30", border: "border-slate-600/30", text: "text-slate-500", dot: "bg-slate-600" },
};

const STATUS_ICON = {
  completed: <Check size={13} />,
  due: <Clock size={13} />,
  overdue: <AlertCircle size={13} />,
  upcoming: <Clock size={13} />,
};

function Toggle({ checked, loading, disabled, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled || loading}
      className={`relative inline-flex w-10 h-5 rounded-full border-2 transition-colors focus:outline-none disabled:opacity-40 ${checked ? "bg-emerald-500 border-emerald-500" : "bg-slate-700 border-slate-600"}`}
    >
      <span className={`inline-block w-3 h-3 rounded-full bg-white shadow transition-transform mt-0.5 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function ExamRow({ exam, strings: s, onToggle }) {
  const [toggling, setToggling] = useState(false);
  const c = STATUS_COLOR[exam.status] || STATUS_COLOR.upcoming;
  const isCompleted = exam.status === "completed";
  const isUpcoming = exam.status === "upcoming";

  const statusLabel = { completed: s.examCompleted || "Completed", due: s.examDue || "Due", overdue: s.examOverdue || "Overdue", upcoming: s.examUpcoming || "Upcoming" }[exam.status] || exam.status;

  function handleToggle() {
    setToggling(true);
    Promise.resolve(onToggle()).finally(() => setToggling(false));
  }

  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-4 ${c.bg} ${c.border}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-extrabold text-slate-100 text-sm">{exam.code}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text} border ${c.border}`}>
            {STATUS_ICON[exam.status]}{statusLabel}
          </span>
        </div>
        <p className="text-slate-300 text-sm truncate">{exam.name}</p>
        <p className="text-slate-500 text-xs mt-0.5">
          {exam.completed_date ? exam.completed_date : `${exam.due_from} – ${exam.due_to}`}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Toggle checked={isCompleted} loading={toggling} disabled={isUpcoming} onChange={handleToggle} />
        <a
          href={exam.url}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${!isCompleted && !isUpcoming ? "bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500 hover:text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"}`}
        >
          {isCompleted ? (s.viewEdit || "View / Edit") : isUpcoming ? (s.view || "View") : (s.fillIn || "Fill in")}
        </a>
      </div>
    </div>
  );
}

export function ExaminationListPage({ bootstrap }) {
  const { examinations = [], strings: s = {}, childDetail = {}, csrfToken = "", urls = {} } = bootstrap;
  const [examList, setExamList] = useState(examinations);

  function handleToggle(code, toggleUrl) {
    return fetch(toggleUrl, {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken, "Content-Type": "application/json" },
    })
      .then(r => r.json())
      .then(data => {
        setExamList(prev => prev.map(e => e.code === code ? { ...e, status: data.status, completed_date: data.completed_date } : e));
      });
  }

  const groups = { overdue: [], due: [], upcoming: [], completed: [] };
  examList.forEach(e => { if (groups[e.status]) groups[e.status].push(e); else groups.upcoming.push(e); });
  const orderedGroups = [
    groups.overdue.length && { key: "overdue", label: s.examOverdue || "Overdue", items: groups.overdue },
    groups.due.length && { key: "due", label: s.examDue || "Due", items: groups.due },
    groups.upcoming.length && { key: "upcoming", label: s.examUpcoming || "Upcoming", items: groups.upcoming },
    groups.completed.length && { key: "completed", label: s.examCompleted || "Completed", items: groups.completed },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      <div className="flex items-center gap-4">
        {urls.childGeneral && (
          <a href={urls.childGeneral} className="flex-shrink-0 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </a>
        )}
        <div>
          <h2 className="text-2xl font-extrabold text-white">{s.examinations || "Examinations"}</h2>
          {childDetail.name && <p className="text-slate-400 mt-1">{childDetail.name}</p>}
        </div>
      </div>
      {orderedGroups.map(group => (
        <div key={group.key} className="flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{group.label}</div>
          {group.items.map(exam => (
            <ExamRow key={exam.code} exam={exam} strings={s} onToggle={() => handleToggle(exam.code, exam.toggleUrl)} />
          ))}
        </div>
      ))}
      {examList.length === 0 && (
        <div className="py-12 text-center text-slate-500 italic">{s.noExaminations || "No examinations found"}</div>
      )}
    </div>
  );
}

function QuestionInput({ question, value, onChange, strings: s }) {
  if (question.answer_type === "boolean") {
    return (
      <div className="flex gap-2">
        {[true, false].map(v => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`px-5 py-2 rounded-xl text-sm font-bold border transition-colors ${value === v ? "bg-sky-500 border-sky-400 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}
          >
            {v ? (s.yes || "Yes") : (s.no || "No")}
          </button>
        ))}
      </div>
    );
  }
  if (question.answer_type === "number") {
    return (
      <input
        type="number"
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-36 bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
      />
    );
  }
  if (question.answer_type === "choice" && question.choices) {
    return (
      <select
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        className="w-full max-w-xs bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
      >
        <option value="" disabled>{s.select || "Select..."}</option>
        {question.choices.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    );
  }
  return (
    <textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      rows={2}
      className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
    />
  );
}

function QuestionRow({ question, value, onChange, strings: s }) {
  if (question.doctor_only) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <Stethoscope size={15} className="text-slate-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-slate-400">{question.text}</p>
          <p className="text-xs text-slate-600 mt-0.5">{s.doctorOnly || "Assessed by your doctor"}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-slate-300">{question.text}</label>
      <QuestionInput question={question} value={value} onChange={onChange} strings={s} />
    </div>
  );
}

export function ExaminationFormPage({ bootstrap }) {
  const { examinationType = {}, categories = [], record = null, strings: s = {}, urls = {}, csrfToken = "" } = bootstrap;
  const c = STATUS_COLOR[examinationType.status] || STATUS_COLOR.upcoming;

  const [date, setDate] = useState(record?.date ? dayjs(record.date, "YYYY-MM-DD", true) : null);
  const [answers, setAnswers] = useState(() => {
    const init = {};
    categories.forEach(cat => cat.questions.forEach(q => { if (!q.doctor_only && q.value != null) init[String(q.id)] = q.value; }));
    return init;
  });
  const [notes, setNotes] = useState(record?.notes || "");

  function setAnswer(id, value) {
    setAnswers(prev => ({ ...prev, [String(id)]: value }));
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-2xl">
      <div className={`rounded-2xl border p-5 ${c.bg} ${c.border}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`px-3 py-1 rounded-full text-sm font-extrabold border ${c.bg} ${c.text} ${c.border}`}>{examinationType.code}</span>
          <h2 className="text-xl font-extrabold text-white">{examinationType.name}</h2>
        </div>
        {examinationType.description && <p className="text-slate-400 text-sm mb-2">{examinationType.description}</p>}
        <p className="text-slate-500 text-xs">{s.ageWindow || "Age window"}: {examinationType.due_from} – {examinationType.due_to}</p>
      </div>

      <form method="POST" action={urls.saveUrl} className="flex flex-col gap-4">
        <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />
        <input type="hidden" name="answers" value={JSON.stringify(answers)} />

        <div className="glass-card p-5 flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-200">{s.dateOfExamination || "Date of examination"} *</label>
          <input
            type="date"
            value={date ? date.format("YYYY-MM-DD") : ""}
            onChange={e => setDate(e.target.value ? dayjs(e.target.value) : null)}
            name="date"
            className="w-full max-w-xs bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        {categories.map(cat => (
          <div key={cat.name} className="glass-card p-5 flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-200">{cat.name}</h3>
            {cat.questions.map(q => (
              <QuestionRow key={q.id} question={q} value={answers[String(q.id)]} onChange={v => setAnswer(q.id, v)} strings={s} />
            ))}
          </div>
        ))}

        <div className="glass-card p-5 flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-200">{s.notes || "Notes"}</label>
          <textarea name="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-sky-500 resize-none" />
        </div>

        <button type="submit" className="w-full py-4 rounded-2xl bg-sky-500 text-white font-extrabold text-base shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:bg-sky-400 transition-colors">
          {s.saveExamination || "Save examination"}
        </button>
      </form>

      <div>
        <a href={urls.listUrl} className="text-sky-400 hover:text-sky-300 text-sm font-bold hover:underline">← {s.examinations || "Back to examinations"}</a>
      </div>
    </div>
  );
}
