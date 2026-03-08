import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React from "react";

dayjs.extend(customParseFormat);
import {
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Radio,
  Select,
  Space,
  Tag,
  TimePicker,
  Typography,
} from "antd";

const { Text } = Typography;

export const SECTION_META = {
  quick_entry: { color: "#1890ff" },
  diaper: { color: "#ff7875" },
  feedings: { color: "#69b1ff" },
  pumpings: { color: "#b37feb" },
  sleep: { color: "#ffd666" },
  tummytime: { color: "#5cdb8b" },
};

export const APP_DATE_FORMAT = "DD.MM.";
export const APP_DATE_FORMAT_FULL = "DD.MM.YYYY";
export const APP_TIME_FORMAT = "HH:mm";
export const APP_DATE_TIME_FORMAT = `${APP_DATE_FORMAT} ${APP_TIME_FORMAT}`;

export const DASHBOARD_CARD_TITLES = {
  "card.quick_entry.consolidated": "",
  "card.diaper.quick_entry": "Quick Entry",
  "card.feedings.quick_entry": "Quick Feeding",
  "card.feedings.breast_quick_entry": "Quick Breastfeeding",
  "card.diaper.last": "Last Nappy Change",
  "card.diaper.types": "Nappy Changes",
  "card.feedings.last": "Last Feeding",
  "card.feedings.method": "Last Feeding Method",
  "card.feedings.recent": "Recent Feedings",
  "card.feedings.breastfeeding": "Breastfeeding",
  "card.pumpings.quick_entry": "Quick Pumping",
  "card.pumpings.last": "Last Pumping",
  "card.sleep.timers": "Timers",
  "card.sleep.quick_timer": "Sleep Timer",
  "card.sleep.last": "Last Sleep",
  "card.sleep.recommendations": "Sleep Recommendations",
  "card.sleep.recent": "Recent Sleep",
  "card.sleep.naps_day": "Today's Naps",
  "card.sleep.statistics": "Statistics",
  "card.sleep.timeline_day": "Sleep Timeline (24h)",
  "card.sleep.week_chart": "Sleep This Week",
  "card.tummytime.day": "Today's Tummy Time",
};

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
    return <Text type="secondary">-</Text>;
  }
  if (typeof cell === "object" && cell.type === "link") {
    return <a href={cell.href}>{cell.label}</a>;
  }
  if (typeof cell === "object" && cell.type === "image") {
    return <Avatar src={cell.src} shape="circle" size={40} />;
  }
  if (typeof cell === "object" && cell.type === "status") {
    return <Tag color={cell.status || "default"}>{cell.label}</Tag>;
  }
  if (typeof cell === "object" && cell.type === "actions") {
    return (
      <Space wrap>
        {(cell.items || []).filter(Boolean).map((item) => (
          <Button
            key={`${item.label}-${item.href}`}
            href={item.href}
            size="small"
            danger={Boolean(item.danger)}
          >
            {item.label}
          </Button>
        ))}
      </Space>
    );
  }
  return cell;
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

export function AntFieldControl({ field, value, onChange }) {
  if (field.type === "textarea") {
    return (
      <Input.TextArea
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === "select") {
    return (
      <Select
        value={value === "" ? undefined : value}
        options={field.choices}
        onChange={(nextValue) => onChange(nextValue ?? "")}
      />
    );
  }

  if (field.type === "radio") {
    return (
      <Radio.Group
        value={value === "" ? undefined : value}
        onChange={(event) => onChange(event.target.value)}
      >
        <Space wrap>
          {field.choices.map((choice) => (
            <Radio.Button
              key={`${field.name}-${choice.value}`}
              value={choice.value}
            >
              {choice.label}
            </Radio.Button>
          ))}
        </Space>
      </Radio.Group>
    );
  }

  if (field.type === "checkbox") {
    return (
      <Checkbox
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }

  if (field.type === "date") {
    return (
      <DatePicker
        style={{ width: "100%" }}
        value={parsePickerValue("date", value)}
        onChange={(nextValue) =>
          onChange(nextValue ? nextValue.format("YYYY-MM-DD") : "")
        }
        inputReadOnly
      />
    );
  }

  if (field.type === "time") {
    return (
      <TimePicker
        style={{ width: "100%" }}
        value={parsePickerValue("time", value)}
        onChange={(nextValue) =>
          onChange(nextValue ? nextValue.format("HH:mm:ss") : "")
        }
        inputReadOnly
      />
    );
  }

  if (field.type === "datetime-local") {
    return (
      <DatePicker
        style={{ width: "100%" }}
        showTime
        value={parsePickerValue("datetime-local", value)}
        onChange={(nextValue) =>
          onChange(nextValue ? nextValue.format("YYYY-MM-DDTHH:mm:ss") : "")
        }
        inputReadOnly
      />
    );
  }

  if (field.type === "file") {
    return <input type="file" name={field.name} className="ant-native-input" />;
  }

  return (
    <Input
      type={field.type === "tags" ? "text" : field.type}
      value={value}
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
