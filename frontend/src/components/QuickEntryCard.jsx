import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  ACTIVITY_COLORS,
  APP_DATE_FORMAT,
  APP_TIME_FORMAT,
  createApiClient,
  formatElapsedSeconds,
} from "../lib/app-utils";

function Button({ children, onClick, type = "default", danger = false, size = "default", className = "", loading = false }) {
  let baseClass = "inline-flex items-center justify-center font-bold tracking-wide transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed";
  
  if (size === "small") baseClass += " px-3 py-1.5 text-xs";
  else if (size === "large") baseClass += " w-full py-4 text-base mt-2";
  else baseClass += " px-5 py-2.5 text-sm";

  if (danger) {
    baseClass += " bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white shadow-[0_0_15px_rgba(244,63,94,0.1)]";
  } else if (type === "primary") {
    baseClass += " bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:bg-sky-400 hover:scale-[1.02] border border-sky-400/50";
  } else {
    baseClass += " bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500";
  }

  return (
    <button onClick={onClick} className={`${baseClass} ${className}`} disabled={loading}>
      {loading ? "Loading..." : children}
    </button>
  );
}

const inputClass = "w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-sky-500 transition-colors";

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800 w-full overflow-x-auto">
      {options.map((opt) => {
         const isActive = value === opt.value;
         return (
           <button
             key={opt.value}
             onClick={() => onChange(opt.value)}
             className={`flex-1 flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${
               isActive ? "bg-slate-800 text-sky-400 shadow-md border border-slate-700" : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
             }`}
           >
             {opt.label}
           </button>
         );
      })}
    </div>
  );
}

export function QuickEntryCard({ bootstrap }) {
  const api = useRef(createApiClient(bootstrap.csrfToken));
  const s = bootstrap.strings;

  const [selectedSegment, setSelectedSegment] = useState("sleep");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 3000);
  };

  const [sleepTimer, setSleepTimer] = useState(bootstrap.sleepTimer || {});
  const [sleepTimerPaused, setSleepTimerPaused] = useState(bootstrap.sleepTimer?.paused ?? false);
  const [sleepTimerResumeMs, setSleepTimerResumeMs] = useState(bootstrap.sleepTimer?.running && !bootstrap.sleepTimer?.paused ? Date.now() : null);
  const [sleepTimerFrozenSeconds, setSleepTimerFrozenSeconds] = useState(bootstrap.sleepTimer?.frozenSeconds ?? 0);
  const [sleepTimerPauseStartMs, setSleepTimerPauseStartMs] = useState(bootstrap.sleepTimer?.paused && bootstrap.sleepTimer?.pauseStartIso ? new Date(bootstrap.sleepTimer.pauseStartIso).getTime() : null);
  const [submittingSleepTimer, setSubmittingSleepTimer] = useState(false);

  const [sleepEntryStartDate, setSleepEntryStartDate] = useState(dayjs());
  const [sleepEntryStartTime, setSleepEntryStartTime] = useState(dayjs());
  const [sleepEntryEndDate, setSleepEntryEndDate] = useState(dayjs());
  const [sleepEntryEndTime, setSleepEntryEndTime] = useState(dayjs());
  const [submittingSleepEntry, setSubmittingSleepEntry] = useState(false);

  const [diaperDate, setDiaperDate] = useState(dayjs());
  const [diaperTime, setDiaperTime] = useState(dayjs());
  const [diaperConsistency, setDiaperConsistency] = useState("liquid");
  const [submittingDiaper, setSubmittingDiaper] = useState(false);

  const [feedingStartDate, setFeedingStartDate] = useState(dayjs());
  const [feedingStartTime, setFeedingStartTime] = useState(dayjs());
  const [feedingType, setFeedingType] = useState("breast_milk");
  const [submittingFeeding, setSubmittingFeeding] = useState(false);

  const [breastfeedingStartDate, setBreastfeedingStartDate] = useState(dayjs());
  const [breastfeedingStartTime, setBreastfeedingStartTime] = useState(dayjs());
  const [breastfeedingEndDate, setBreastfeedingEndDate] = useState(dayjs());
  const [breastfeedingEndTime, setBreastfeedingEndTime] = useState(dayjs());
  const [breastfeedingSide, setBreastfeedingSide] = useState("left");
  const [submittingBreastfeeding, setSubmittingBreastfeeding] = useState(false);

  const [pumpingStartDate, setPumpingStartDate] = useState(dayjs());
  const [pumpingStartTime, setPumpingStartTime] = useState(dayjs());
  const [pumpingEndDate, setPumpingEndDate] = useState(dayjs());
  const [pumpingEndTime, setPumpingEndTime] = useState(dayjs());
  const [pumpingAmount, setPumpingAmount] = useState("");
  const [pumpingSide, setPumpingSide] = useState("left");
  const [submittingPumping, setSubmittingPumping] = useState(false);

  function currentTimerElapsed() {
    if (!sleepTimer.running) return 0;
    if (sleepTimerPaused || !sleepTimerResumeMs) return sleepTimerFrozenSeconds;
    return sleepTimerFrozenSeconds + Math.floor((currentTime - sleepTimerResumeMs) / 1000);
  }

  async function submitSleepTimerAction(action) {
    const payload = new URLSearchParams();
    payload.set("sleep_timer_action", action);
    setSubmittingSleepTimer(true);
    try {
      const response = await api.current.postForm(bootstrap.urls.current, payload);
      const data = await response.json();
      if (!data.ok) return showMessage(data.error || s.saveFailed, true);
      
      if (action === "start") {
        setSleepTimer({ running: true, startIso: new Date().toISOString(), elapsedSeconds: 0, paused: false, pauseStartIso: null, frozenSeconds: 0 });
        setSleepTimerPaused(false); setSleepTimerFrozenSeconds(0); setSleepTimerResumeMs(Date.now()); setSleepTimerPauseStartMs(null);
      } else if (action === "pause") {
        setSleepTimerFrozenSeconds(currentTimerElapsed());
        setSleepTimerResumeMs(null); setSleepTimerPaused(true); setSleepTimerPauseStartMs(Date.now());
      } else if (action === "resume") {
        setSleepTimerResumeMs(Date.now()); setSleepTimerPaused(false); setSleepTimerPauseStartMs(null);
      } else if (action === "save" || action === "stop") {
        setSleepTimer({ running: false }); setSleepTimerPaused(false); setSleepTimerFrozenSeconds(0); setSleepTimerResumeMs(null); setSleepTimerPauseStartMs(null);
        showMessage(s.sleepEntrySaved);
      } else if (action === "cancel") {
        setSleepTimer({ running: false }); setSleepTimerPaused(false); setSleepTimerFrozenSeconds(0); setSleepTimerResumeMs(null); setSleepTimerPauseStartMs(null);
      }
    } finally {
      setSubmittingSleepTimer(false);
    }
  }

  async function submitEntry(actionType, dict) {
    const payload = new URLSearchParams();
    payload.set(actionType, "create");
    for (const [k, v] of Object.entries(dict)) payload.set(k, v);

    try {
      const response = await api.current.postForm(bootstrap.urls.current, payload);
      const data = await response.json();
      if (data.ok) showMessage(s.saved || "Entry saved successfully");
      else showMessage(data.error || s.saveFailed, true);
    } catch {
      showMessage(s.saveFailed, true);
    }
  }

  const renderDateTimeRow = (startD, setStartD, startT, setStartT, labelText) => (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <label className="text-sm font-bold text-slate-400 mb-1 block">{labelText} Date</label>
        <input type="date" className={inputClass} value={startD.format("YYYY-MM-DD")} onChange={e => setStartD(dayjs(e.target.value))} />
      </div>
      <div className="flex-1">
        <label className="text-sm font-bold text-slate-400 mb-1 block">{labelText} Time</label>
        <input type="time" className={inputClass} value={startT.format("HH:mm")} onChange={e => setStartT(dayjs(e.target.value, "HH:mm"))} />
      </div>
    </div>
  );

  const segmentColors = {
    sleep: "bg-indigo-500",
    diaper: "bg-amber-500",
    feeding: "bg-emerald-500",
    breastfeeding: "bg-pink-500",
    pumping: "bg-purple-500",
  };

  const segments = [
    { label: <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${segmentColors.sleep}`}></span>{s.sleep}</span>, value: "sleep" },
    { label: <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${segmentColors.diaper}`}></span>{s.diaper}</span>, value: "diaper" },
    { label: <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${segmentColors.feeding}`}></span>{s.feedings}</span>, value: "feeding" },
    { label: <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${segmentColors.breastfeeding}`}></span>{s.breastfeeding}</span>, value: "breastfeeding" },
    { label: <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${segmentColors.pumping}`}></span>{s.pumpings}</span>, value: "pumping" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {message && (
        <div className={`p-4 rounded-xl font-bold border ${message.isError ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
          {message.text}
        </div>
      )}

      <SegmentedControl options={segments} value={selectedSegment} onChange={setSelectedSegment} />

      <div className="glass-card p-6 md:p-8 relative">
        {selectedSegment === "sleep" && (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 flex flex-col gap-6">
              <h4 className="text-xl font-bold text-white mb-2">Manual Entry</h4>
              {renderDateTimeRow(sleepEntryStartDate, setSleepEntryStartDate, sleepEntryStartTime, setSleepEntryStartTime, "Start")}
              {renderDateTimeRow(sleepEntryEndDate, setSleepEntryEndDate, sleepEntryEndTime, setSleepEntryEndTime, "End")}
              <Button type="primary" loading={submittingSleepEntry} onClick={() => submitEntry("sleep_manual_entry_action", {
                sleep_entry_start_date: sleepEntryStartDate.format("YYYY-MM-DD"),
                sleep_entry_start_time: sleepEntryStartTime.format("HH:mm"),
                sleep_entry_end_date: sleepEntryEndDate.format("YYYY-MM-DD"),
                sleep_entry_end_time: sleepEntryEndTime.format("HH:mm"),
                sleep_entry_type: "sleep"
              })}>{s.save}</Button>
            </div>
            
            <div className="hidden md:block w-px bg-slate-800"></div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900/40 border border-slate-700 rounded-2xl">
              <h4 className="text-lg font-bold text-slate-300 mb-6">{s.sleepTimer}</h4>
              <div className="text-5xl font-extrabold font-mono text-sky-400 mb-6 tracking-wider">
                {formatElapsedSeconds(currentTimerElapsed())}
              </div>
              <div className="flex flex-col gap-3 w-full">
                <Button type="primary" size="large" onClick={() => submitSleepTimerAction(!sleepTimer.running ? "start" : sleepTimerPaused ? "resume" : "pause")}>
                  {!sleepTimer.running ? s.startTimer : sleepTimerPaused ? s.resume : s.pause}
                </Button>
                {sleepTimer.running && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Button onClick={() => submitSleepTimerAction("save")}>{s.saveTimer}</Button>
                    <Button danger onClick={() => window.confirm(s.cancelTimerConfirm) && submitSleepTimerAction("cancel")}>{s.cancelTimer}</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedSegment === "diaper" && (
          <div className="flex flex-col gap-6 max-w-lg mx-auto">
            {renderDateTimeRow(diaperDate, setDiaperDate, diaperTime, setDiaperTime, "")}
            <SegmentedControl options={[ {label: s.liquid, value: "liquid"}, {label: s.solid, value: "solid"} ]} value={diaperConsistency} onChange={setDiaperConsistency} />
            <Button type="primary" size="large" loading={submittingDiaper} onClick={() => submitEntry("diaper_quick_entry_action", {
              diaper_entry_date: diaperDate.format("YYYY-MM-DD"), diaper_entry_time: diaperTime.format("HH:mm"), diaper_entry_consistency: diaperConsistency
            })}>{s.save}</Button>
          </div>
        )}

        {selectedSegment === "feeding" && (
          <div className="flex flex-col gap-6 max-w-lg mx-auto">
            {renderDateTimeRow(feedingStartDate, setFeedingStartDate, feedingStartTime, setFeedingStartTime, "")}
            <SegmentedControl options={[ {label: s.solid, value: "solid"}, {label: s.babyFood, value: "baby_food"}, {label: s.breastMilk, value: "breast_milk"} ]} value={feedingType} onChange={setFeedingType} />
            <Button type="primary" size="large" loading={submittingFeeding} onClick={() => submitEntry("feeding_quick_entry_action", {
              feeding_entry_start_date: feedingStartDate.format("YYYY-MM-DD"), feeding_entry_start_time: feedingStartTime.format("HH:mm"), feeding_entry_end_date: feedingStartDate.format("YYYY-MM-DD"), feeding_entry_end_time: feedingStartTime.format("HH:mm"), feeding_entry_type: feedingType
            })}>{s.save}</Button>
          </div>
        )}

        {selectedSegment === "breastfeeding" && (
          <div className="flex flex-col gap-6 max-w-lg mx-auto">
            {renderDateTimeRow(breastfeedingStartDate, setBreastfeedingStartDate, breastfeedingStartTime, setBreastfeedingStartTime, "Start")}
            {renderDateTimeRow(breastfeedingEndDate, setBreastfeedingEndDate, breastfeedingEndTime, setBreastfeedingEndTime, "End")}
            <SegmentedControl options={[ {label: s.left, value: "left"}, {label: s.right, value: "right"} ]} value={breastfeedingSide} onChange={setBreastfeedingSide} />
            <Button type="primary" size="large" loading={submittingBreastfeeding} onClick={() => submitEntry("breastfeeding_quick_entry_action", {
              breastfeeding_entry_start_date: breastfeedingStartDate.format("YYYY-MM-DD"), breastfeeding_entry_start_time: breastfeedingStartTime.format("HH:mm"), breastfeeding_entry_end_date: breastfeedingEndDate.format("YYYY-MM-DD"), breastfeeding_entry_end_time: breastfeedingEndTime.format("HH:mm"), breastfeeding_entry_side: breastfeedingSide
            })}>{s.save}</Button>
          </div>
        )}

        {selectedSegment === "pumping" && (
          <div className="flex flex-col gap-6 max-w-lg mx-auto">
            {renderDateTimeRow(pumpingStartDate, setPumpingStartDate, pumpingStartTime, setPumpingStartTime, "Start")}
            {renderDateTimeRow(pumpingEndDate, setPumpingEndDate, pumpingEndTime, setPumpingEndTime, "End")}
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-400">{s.amount}</label>
              <div className="relative">
                <input type="number" step="0.1" value={pumpingAmount} onChange={e => setPumpingAmount(e.target.value)} className={inputClass} placeholder="Amount" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">ml</span>
              </div>
            </div>

            <SegmentedControl options={[ {label: s.left, value: "left"}, {label: s.right, value: "right"}, {label: s.both, value: "both"} ]} value={pumpingSide} onChange={setPumpingSide} />
            <Button type="primary" size="large" loading={submittingPumping} onClick={() => submitEntry("pumping_quick_entry_action", {
              pumping_entry_start_date: pumpingStartDate.format("YYYY-MM-DD"), pumping_entry_start_time: pumpingStartTime.format("HH:mm"), pumping_entry_end_date: pumpingEndDate.format("YYYY-MM-DD"), pumping_entry_end_time: pumpingEndTime.format("HH:mm"), pumping_entry_amount: pumpingAmount, pumping_entry_side: pumpingSide
            })}>{s.save}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
