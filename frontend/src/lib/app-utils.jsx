import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React from "react";

dayjs.extend(customParseFormat);
// Ant Design fully removed and replaced with Tailwind CSS native components

export const SECTION_META = {
  quick_entry: { color: "var(--app-primary)" },
  diaper: { color: "var(--accent-diaper)" },
  feedings: { color: "var(--accent-feedings)" },
  breastfeeding: { color: "var(--accent-breastfeeding)" },
  pumpings: { color: "var(--accent-pumpings)" },
  sleep: { color: "var(--accent-sleep)" },
  tummytime: { color: "var(--accent-tummytime)" },
};

/**
 * Core activity colors — used by the activity dial and throughout the app.
 * These match the spec §1 activity type table.
 */
export const ACTIVITY_COLORS = {
  sleep: "var(--accent-sleep)",
  feeding: "var(--accent-feedings)",
  breastfeeding: "var(--accent-breastfeeding)",
  diaper: "var(--accent-diaper)",
  pumping: "var(--accent-pumpings)",
  tummytime: "var(--accent-tummytime)",
};

export const APP_DATE_FORMAT = "DD.MM.";
export const APP_DATE_FORMAT_FULL = "DD.MM.YYYY";
export const APP_TIME_FORMAT = "HH:mm";
export const APP_DATE_TIME_FORMAT = `${APP_DATE_FORMAT} ${APP_TIME_FORMAT}`;

export function getDashboardCardTitle(key, strings) {
  const map = {
    "card.quick_entry.consolidated": strings.quicklyAddBabyActions,
    "card.diaper.quick_entry": strings.quickEntry,
    "card.feedings.quick_entry": strings.quickFeeding,
    "card.feedings.breast_quick_entry": strings.quickBreastfeeding,
    "card.diaper.last": strings.lastNappyChange,
    "card.diaper.types": strings.nappyChanges,
    "card.feedings.last": strings.lastFeeding,
    "card.feedings.method": strings.lastFeedingMethod,
    "card.feedings.recent": strings.recentFeedings,
    "card.feedings.breastfeeding": strings.breastfeeding,
    "card.breastfeeding.today": strings.breastfeedingToday,
    "card.breastfeeding.last": strings.lastBreastfeeding,
    "card.pumpings.quick_entry": strings.quickPumping,
    "card.pumpings.last": strings.lastPumping,
    "card.sleep.timers": strings.timers,
    "card.sleep.quick_timer": strings.sleepTimer,
    "card.sleep.last": strings.lastSleep,
    "card.sleep.recommendations": strings.sleepRecommendations,
    "card.sleep.recent": strings.todaysSleeps,
    "card.sleep.naps_day": strings.todaysNaps,
    "card.sleep.statistics": strings.sleepStatistics,
    "card.sleep.timeline_day": strings.sleepTimeline,
    "card.sleep.night_circle": strings.nightSleepCircle,
    "card.sleep.week_chart": strings.sleepWeekChart,
    "card.sleep.list": strings.sleepList,
    "card.tummytime.day": strings.todaysTummyTime,
    "card.examinations.next": strings.examinations || "Next U-Exam",
  };
  return map[key] || strings.migrationPending;
}

// Legacy constant kept for any external references — prefer getDashboardCardTitle
export const DASHBOARD_CARD_TITLES = {};

export function asItems(payload) {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
}

export function createApiClient(csrfToken) {
  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return null;
    }
    return response.json();
  }

  return {
    get: (url) => request(url, { method: "GET" }),
    patch: (url, data) =>
      request(url, { method: "PATCH", body: JSON.stringify(data) }),
    delete: async (url) => {
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      return null;
    },
    postForm: async (url, formData) =>
      fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: formData.toString(),
      }),
  };
}

export function loadScriptOnce(src) {
  const existing = document.querySelector(`script[data-ant-src="${src}"]`);
  if (existing) {
    if (existing.dataset.loaded === "true") {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.antSrc = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", reject, { once: true });
    document.body.appendChild(script);
  });
}

export function extractScriptContent(scriptMarkup) {
  const match = String(scriptMarkup || "").match(
    /<script[^>]*>([\s\S]*?)<\/script>/i,
  );
  return match ? match[1] : String(scriptMarkup || "");
}

export function renderListCell(cell) {
  if (cell == null || cell === "") {
    return <span className="text-slate-500">-</span>;
  }
  if (typeof cell === "object" && cell.type === "link") {
    return <a href={cell.href} className="text-sky-400 hover:text-sky-300 font-medium transition-colors">{cell.label}</a>;
  }
  if (typeof cell === "object" && cell.type === "image") {
    return <img src={cell.src} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-slate-700" />;
  }
  if (typeof cell === "object" && cell.type === "status") {
    return <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-slate-800 border border-slate-600 shadow-sm ${cell.color === 'red' ? 'text-rose-400' : 'text-slate-300'}`}>{cell.label}</span>;
  }
  if (typeof cell === "object" && cell.type === "actions") {
    return (
      <div className="flex flex-wrap gap-2">
        {(cell.items || []).filter(Boolean).map((item) => (
          <a
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={`px-3 py-1.5 text-sm rounded-lg font-semibold transition-colors border ${
              item.danger
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    );
  }
  return <span className="text-slate-200">{cell}</span>;
}

export function buildInitialFormState(fieldsets) {
  return fieldsets.reduce((result, fieldset) => {
    fieldset.fields.forEach((field) => {
      result[field.name] =
        field.type === "checkbox" ? Boolean(field.value) : (field.value ?? "");
    });
    return result;
  }, {});
}

export function parsePickerValue(fieldType, value) {
  if (!value) {
    return null;
  }
  if (fieldType === "date") {
    return dayjs(value, "YYYY-MM-DD");
  }
  if (fieldType === "time") {
    // Try multiple formats to handle different time string formats from Django
    const timeFormats = ["HH:mm:ss", "HH:mm", "H:mm", "HH:mm:ss.SSS"];
    let parsed = null;
    for (const format of timeFormats) {
      parsed = dayjs(value, format);
      if (parsed.isValid()) {
        return parsed;
      }
    }
    // Fallback: try parsing without format (let dayjs auto-detect)
    parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  }
  if (fieldType === "datetime-local") {
    return dayjs(value);
  }
  return null;
}

export function formatHiddenValue(fieldType, value) {
  if (value == null || value === "") {
    return "";
  }
  if (fieldType === "date") {
    return dayjs(value).format("YYYY-MM-DD");
  }
  if (fieldType === "time") {
    const timeFormats = ["HH:mm:ss", "HH:mm", "H:mm", "HH:mm:ss.SSS"];
    for (const fmt of timeFormats) {
      const parsed = dayjs(value, fmt, true);
      if (parsed.isValid()) {
        return parsed.format("HH:mm:ss");
      }
    }
    return "";
  }
  if (fieldType === "datetime-local") {
    return dayjs(value).format("YYYY-MM-DDTHH:mm:ss");
  }
  if (typeof value === "boolean") {
    return value ? "on" : "";
  }
  return String(value);
}

const inputClassName = "w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors placeholder:text-slate-500";

export function TailwindFieldControl({ field, value, onChange }) {
  if (field.type === "textarea") {
    return (
      <textarea
        className={inputClassName}
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === "select") {
    return (
      <div className="relative">
        <select
          className={`${inputClassName} appearance-none cursor-pointer`}
          value={value === "" ? undefined : value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled hidden>Select an option...</option>
          {field.choices.map((choice) => (
            <option key={`${field.name}-${choice.value}`} value={choice.value}>{choice.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="flex flex-wrap gap-3">
        {field.choices.map((choice) => {
          const isSelected = value === choice.value;
          return (
            <label
              key={`${field.name}-${choice.value}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer border transition-colors ${
                isSelected 
                  ? "bg-sky-500/20 border-sky-500/50 text-sky-400" 
                  : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-500"
              }`}
            >
              <input
                type="radio"
                name={field.name}
                className="hidden"
                value={choice.value}
                checked={isSelected}
                onChange={(event) => onChange(event.target.value)}
              />
              <span className="text-sm font-bold">{choice.label}</span>
            </label>
          )
        })}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-3 cursor-pointer group w-fit mt-2">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            className="peer appearance-none w-6 h-6 border-2 border-slate-600 rounded bg-slate-900/50 checked:bg-sky-500 checked:border-sky-500 focus:outline-none transition-colors"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
          <svg className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-slate-300 font-medium group-hover:text-white transition-colors select-none">
          {field.label || "Enable"}
        </span>
      </label>
    );
  }

  // Ensure HTML5 date/time inputs are correctly formatted strings for display, fallback to empty string
  return (
    <input
      type={field.type === "tags" ? "text" : field.type}
      className={inputClassName}
      value={value == null ? "" : value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function HiddenFieldInput({ field, value }) {
  if (field.type === "file") {
    return null;
  }
  if (field.type === "checkbox") {
    return value ? <input type="hidden" name={field.name} value="on" /> : null;
  }
  return (
    <input
      type="hidden"
      name={field.name}
      value={formatHiddenValue(field.type, value)}
    />
  );
}

export function formatElapsedSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatAppDate(value) {
  return value ? dayjs(value).format(APP_DATE_FORMAT) : "n/a";
}

export function formatAppTime(value) {
  return value ? dayjs(value).format(APP_TIME_FORMAT) : "n/a";
}

export function formatAppDateTime(value) {
  return value ? dayjs(value).format(APP_DATE_TIME_FORMAT) : "n/a";
}

export function durationMinutesFromValue(value) {
  if (value == null || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value / 60) : 0;
  }

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) {
      return 0;
    }

    if (!Number.isNaN(Number(raw))) {
      return Math.round(Number(raw) / 60);
    }

    const match = raw.match(
      /^(?:(?<days>\d+)\s+)?(?<hours>\d+):(?<minutes>\d+):(?<seconds>\d+)(?:\.\d+)?$/,
    );
    if (match?.groups) {
      const days = Number(match.groups.days || 0);
      const hours = Number(match.groups.hours || 0);
      const minutes = Number(match.groups.minutes || 0);
      const seconds = Number(match.groups.seconds || 0);
      const totalSeconds =
        days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds;
      return Math.round(totalSeconds / 60);
    }
  }

  return 0;
}

export function formatDurationCompact(value) {
  const minutes = durationMinutesFromValue(value);
  if (minutes < 90) {
    return `${minutes} min`;
  }

  const hours = minutes / 60;
  const precision = Number.isInteger(hours) ? 0 : 1;
  return `${hours.toFixed(precision)} h`;
}
