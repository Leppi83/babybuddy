import dayjs from "dayjs";
import React from "react";
import { Avatar, Button, Checkbox, DatePicker, Input, Radio, Select, Space, Tag, TimePicker, Typography } from "antd";

const { Text } = Typography;

export const SECTION_META = {
  diaper: { color: "#ff7875" },
  feedings: { color: "#69b1ff" },
  pumpings: { color: "#b37feb" },
  sleep: { color: "#ffd666" },
  tummytime: { color: "#5cdb8b" },
};

export const DASHBOARD_CARD_TITLES = {
  "card.diaper.quick_entry": "Quick Entry",
  "card.diaper.last": "Last Nappy Change",
  "card.diaper.types": "Nappy Changes",
  "card.feedings.last": "Last Feeding",
  "card.feedings.method": "Last Feeding Method",
  "card.feedings.recent": "Recent Feedings",
  "card.feedings.breastfeeding": "Breastfeeding",
  "card.pumpings.last": "Last Pumping",
  "card.sleep.timers": "Timers",
  "card.sleep.quick_timer": "Sleep Timer",
  "card.sleep.last": "Last Sleep",
  "card.sleep.recommendations": "Sleep Recommendations",
  "card.sleep.recent": "Recent Sleep",
  "card.sleep.naps_day": "Today's Naps",
  "card.sleep.statistics": "Statistics",
  "card.sleep.timeline_day": "Sleep Timeline (24h)",
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
    return dayjs(value, "HH:mm:ss").isValid()
      ? dayjs(value, "HH:mm:ss")
      : dayjs(value, "HH:mm");
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
    return dayjs(value).format("HH:mm:ss");
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

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
