import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  App as AntApp,
  Button,
  Col,
  DatePicker,
  Divider,
  Grid,
  Input,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Tag,
  TimePicker,
  Typography,
} from "antd";
import {
  ACTIVITY_COLORS,
  APP_DATE_FORMAT,
  APP_TIME_FORMAT,
  createApiClient,
  formatElapsedSeconds,
} from "../lib/app-utils";

const { Text } = Typography;
const { useBreakpoint } = Grid;

export function QuickEntryCard({ bootstrap }) {
  const ant = AntApp.useApp();
  const api = useRef(createApiClient(bootstrap.csrfToken));
  const screens = useBreakpoint();
  const s = bootstrap.strings;

  // Segment selection
  const [selectedSegment, setSelectedSegment] = useState("sleep");

  // Clock tick for sleep timer display
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Sleep timer state (initialised from bootstrap)
  const [sleepTimer, setSleepTimer] = useState(bootstrap.sleepTimer || {});
  const [sleepTimerPaused, setSleepTimerPaused] = useState(
    bootstrap.sleepTimer?.paused ?? false,
  );
  const [sleepTimerResumeMs, setSleepTimerResumeMs] = useState(
    bootstrap.sleepTimer?.running && !bootstrap.sleepTimer?.paused
      ? Date.now()
      : null,
  );
  const [sleepTimerFrozenSeconds, setSleepTimerFrozenSeconds] = useState(
    bootstrap.sleepTimer?.frozenSeconds ?? 0,
  );
  const [sleepTimerPauseStartMs, setSleepTimerPauseStartMs] = useState(
    bootstrap.sleepTimer?.paused && bootstrap.sleepTimer?.pauseStartIso
      ? new Date(bootstrap.sleepTimer.pauseStartIso).getTime()
      : null,
  );
  const [submittingSleepTimer, setSubmittingSleepTimer] = useState(false);

  // Sleep manual entry state
  const [sleepEntryStartDate, setSleepEntryStartDate] = useState(dayjs());
  const [sleepEntryStartTime, setSleepEntryStartTime] = useState(dayjs());
  const [sleepEntryEndDate, setSleepEntryEndDate] = useState(dayjs());
  const [sleepEntryEndTime, setSleepEntryEndTime] = useState(dayjs());
  const [submittingSleepEntry, setSubmittingSleepEntry] = useState(false);

  // Diaper state
  const [diaperDate, setDiaperDate] = useState(dayjs());
  const [diaperTime, setDiaperTime] = useState(dayjs());
  const [diaperConsistency, setDiaperConsistency] = useState("liquid");
  const [submittingDiaper, setSubmittingDiaper] = useState(false);

  // Feeding state
  const [feedingStartDate, setFeedingStartDate] = useState(dayjs());
  const [feedingStartTime, setFeedingStartTime] = useState(dayjs());
  const [feedingType, setFeedingType] = useState("breast_milk");
  const [submittingFeeding, setSubmittingFeeding] = useState(false);

  // Breastfeeding state
  const [breastfeedingStartDate, setBreastfeedingStartDate] = useState(dayjs());
  const [breastfeedingStartTime, setBreastfeedingStartTime] = useState(dayjs());
  const [breastfeedingEndDate, setBreastfeedingEndDate] = useState(dayjs());
  const [breastfeedingEndTime, setBreastfeedingEndTime] = useState(dayjs());
  const [breastfeedingSide, setBreastfeedingSide] = useState("left");
  const [submittingBreastfeeding, setSubmittingBreastfeeding] = useState(false);

  // Pumping state
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
    return (
      sleepTimerFrozenSeconds +
      Math.floor((currentTime - sleepTimerResumeMs) / 1000)
    );
  }

  async function submitSleepTimerAction(action) {
    const payload = new URLSearchParams();
    payload.set("sleep_timer_action", action);
    setSubmittingSleepTimer(true);
    try {
      const response = await api.current.postForm(
        bootstrap.urls.current,
        payload,
      );
      const data = await response.json();
      if (!data.ok) {
        ant.message.error(data.error || s.saveFailed);
        return;
      }
      if (action === "start") {
        setSleepTimer({ running: true, startIso: new Date().toISOString(), elapsedSeconds: 0, paused: false, pauseStartIso: null, frozenSeconds: 0 });
        setSleepTimerPaused(false);
        setSleepTimerFrozenSeconds(0);
        setSleepTimerResumeMs(Date.now());
        setSleepTimerPauseStartMs(null);
      } else if (action === "pause") {
        const frozen = currentTimerElapsed();
        setSleepTimerFrozenSeconds(frozen);
        setSleepTimerResumeMs(null);
        setSleepTimerPaused(true);
        setSleepTimerPauseStartMs(Date.now());
      } else if (action === "resume") {
        setSleepTimerResumeMs(Date.now());
        setSleepTimerPaused(false);
        setSleepTimerPauseStartMs(null);
      } else if (action === "save" || action === "stop") {
        setSleepTimer({ running: false, startIso: null, elapsedSeconds: 0, paused: false, pauseStartIso: null, frozenSeconds: 0 });
        setSleepTimerPaused(false);
        setSleepTimerFrozenSeconds(0);
        setSleepTimerResumeMs(null);
        setSleepTimerPauseStartMs(null);
        ant.message.success(s.sleepEntrySaved);
      } else if (action === "cancel") {
        setSleepTimer({ running: false, startIso: null, elapsedSeconds: 0, paused: false, pauseStartIso: null, frozenSeconds: 0 });
        setSleepTimerPaused(false);
        setSleepTimerFrozenSeconds(0);
        setSleepTimerResumeMs(null);
        setSleepTimerPauseStartMs(null);
      }
    } finally {
      setSubmittingSleepTimer(false);
    }
  }

  async function submitSleepEntry() {
    const startDt = sleepEntryStartDate
      .hour(sleepEntryStartTime.hour())
      .minute(sleepEntryStartTime.minute());
    const endDt = sleepEntryEndDate
      .hour(sleepEntryEndTime.hour())
      .minute(sleepEntryEndTime.minute());
    let durationMinutes = endDt.diff(startDt, "minutes");
    if (durationMinutes < 0) durationMinutes += 24 * 60;
    const startHour = startDt.hour();
    const isNight = startHour >= 17 || startHour < 7;
    const autoType = !isNight && durationMinutes < 90 ? "nap" : "sleep";

    const payload = new URLSearchParams();
    payload.set("sleep_manual_entry_action", "create");
    payload.set("sleep_entry_start_date", sleepEntryStartDate.format("YYYY-MM-DD"));
    payload.set("sleep_entry_start_time", sleepEntryStartTime.format("HH:mm"));
    payload.set("sleep_entry_end_date", sleepEntryEndDate.format("YYYY-MM-DD"));
    payload.set("sleep_entry_end_time", sleepEntryEndTime.format("HH:mm"));
    payload.set("sleep_entry_type", autoType);

    setSubmittingSleepEntry(true);
    try {
      const response = await api.current.postForm(bootstrap.urls.current, payload);
      const data = await response.json();
      if (data.ok) {
        ant.message.success(s.sleepEntrySaved);
        return;
      }
      ant.message.error(data.error || s.saveFailed);
    } finally {
      setSubmittingSleepEntry(false);
    }
  }

  async function submitDiaperEntry() {
    const payload = new URLSearchParams();
    payload.set("diaper_quick_entry_action", "create");
    payload.set("diaper_entry_date", diaperDate.format("YYYY-MM-DD"));
    payload.set("diaper_entry_time", diaperTime.format("HH:mm"));
    payload.set("diaper_entry_consistency", diaperConsistency);

    setSubmittingDiaper(true);
    try {
      const response = await api.current.postForm(bootstrap.urls.current, payload);
      const data = await response.json();
      if (data.ok) {
        ant.message.success(s.saved);
        return;
      }
      ant.message.error(data.error || s.saveFailed);
    } finally {
      setSubmittingDiaper(false);
    }
  }

  async function submitFeedingEntry() {
    const payload = new URLSearchParams();
    payload.set("feeding_quick_entry_action", "create");
    payload.set("feeding_entry_start_date", feedingStartDate.format("YYYY-MM-DD"));
    payload.set("feeding_entry_start_time", feedingStartTime.format("HH:mm"));
    payload.set("feeding_entry_end_date", feedingStartDate.format("YYYY-MM-DD"));
    payload.set("feeding_entry_end_time", feedingStartTime.format("HH:mm"));
    payload.set("feeding_entry_type", feedingType);

    setSubmittingFeeding(true);
    try {
      const response = await api.current.postForm(bootstrap.urls.current, payload);
      const data = await response.json();
      if (data.ok) {
        ant.message.success(s.feedingSaved);
        return;
      }
      ant.message.error(data.error || s.saveFailed);
    } finally {
      setSubmittingFeeding(false);
    }
  }

  async function submitBreastfeedingEntry() {
    const payload = new URLSearchParams();
    payload.set("breastfeeding_quick_entry_action", "create");
    payload.set("breastfeeding_entry_start_date", breastfeedingStartDate.format("YYYY-MM-DD"));
    payload.set("breastfeeding_entry_start_time", breastfeedingStartTime.format("HH:mm"));
    payload.set("breastfeeding_entry_end_date", breastfeedingStartDate.format("YYYY-MM-DD"));
    payload.set("breastfeeding_entry_end_time", breastfeedingStartTime.format("HH:mm"));
    payload.set("breastfeeding_entry_side", breastfeedingSide);

    setSubmittingBreastfeeding(true);
    try {
      const response = await api.current.postForm(bootstrap.urls.current, payload);
      const data = await response.json();
      if (data.ok) {
        ant.message.success(s.breastfeedingSaved);
        return;
      }
      ant.message.error(data.error || s.saveFailed);
    } finally {
      setSubmittingBreastfeeding(false);
    }
  }

  async function submitPumpingEntry() {
    const payload = new URLSearchParams();
    payload.set("pumping_quick_entry_action", "create");
    payload.set("pumping_entry_start_date", pumpingStartDate.format("YYYY-MM-DD"));
    payload.set("pumping_entry_start_time", pumpingStartTime.format("HH:mm"));
    payload.set("pumping_entry_end_date", pumpingEndDate.format("YYYY-MM-DD"));
    payload.set("pumping_entry_end_time", pumpingEndTime.format("HH:mm"));
    payload.set("pumping_entry_amount", pumpingAmount);
    payload.set("pumping_entry_side", pumpingSide);

    setSubmittingPumping(true);
    try {
      const response = await api.current.postForm(bootstrap.urls.current, payload);
      const data = await response.json();
      if (data.ok) {
        ant.message.success(s.pumpingSaved);
        return;
      }
      ant.message.error(data.error || s.saveFailed);
    } finally {
      setSubmittingPumping(false);
    }
  }

  function renderDateTimeInputs({ startDate, setStartDate, startTime, setStartTime, endDate, setEndDate, endTime, setEndTime }) {
    return (
      <>
        <Row gutter={8}>
          <Col span={12}>
            <label className="ant-dashboard-inline-label ant-dashboard-inline-label--compact">
              {s.startDate}
            </label>
            <DatePicker
              value={startDate}
              format={APP_DATE_FORMAT}
              onChange={(value) => value && setStartDate(value)}
              className="ant-dashboard-picker ant-dashboard-picker--compact"
              inputReadOnly
            />
          </Col>
          <Col span={12}>
            <label className="ant-dashboard-inline-label ant-dashboard-inline-label--compact">
              {s.startTime}
            </label>
            <TimePicker
              value={startTime}
              format={APP_TIME_FORMAT}
              onChange={(value) => value && setStartTime(value)}
              className="ant-dashboard-picker ant-dashboard-picker--compact"
              inputReadOnly
            />
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={12}>
            <label className="ant-dashboard-inline-label ant-dashboard-inline-label--compact">
              {s.endDate}
            </label>
            <DatePicker
              value={endDate}
              format={APP_DATE_FORMAT}
              onChange={(value) => value && setEndDate(value)}
              className="ant-dashboard-picker ant-dashboard-picker--compact"
              inputReadOnly
            />
          </Col>
          <Col span={12}>
            <label className="ant-dashboard-inline-label ant-dashboard-inline-label--compact">
              {s.endTime}
            </label>
            <TimePicker
              value={endTime}
              format={APP_TIME_FORMAT}
              onChange={(value) => value && setEndTime(value)}
              className="ant-dashboard-picker ant-dashboard-picker--compact"
              inputReadOnly
            />
          </Col>
        </Row>
      </>
    );
  }

  const segmentColors = {
    sleep: ACTIVITY_COLORS.sleep,
    diaper: ACTIVITY_COLORS.diaper,
    feeding: ACTIVITY_COLORS.feeding,
    breastfeeding: ACTIVITY_COLORS.breastfeeding,
    pumping: ACTIVITY_COLORS.pumping,
  };

  const segments = [
    { label: s.sleep, value: "sleep" },
    { label: s.diaper, value: "diaper" },
    { label: s.feedings, value: "feeding" },
    { label: s.breastfeeding, value: "breastfeeding" },
    { label: s.pumpings, value: "pumping" },
  ];

  const renderSegmentLabel = (segment) => (
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          display: "inline-block",
          width: 12,
          height: 12,
          borderRadius: "50%",
          backgroundColor: segmentColors[segment.value],
        }}
      />
      {segment.label}
    </span>
  );

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {screens.md ? (
        <Segmented
          block
          value={selectedSegment}
          options={segments.map((seg) => ({
            label: renderSegmentLabel(seg),
            value: seg.value,
          }))}
          onChange={setSelectedSegment}
          style={{ width: "100%" }}
        />
      ) : (
        <Select
          value={selectedSegment}
          onChange={setSelectedSegment}
          style={{ width: "100%" }}
          options={segments.map((seg) => ({
            value: seg.value,
            label: renderSegmentLabel(seg),
          }))}
        />
      )}

      {selectedSegment === "sleep" && (
        <Row gutter={[24, 16]}>
          <Col xs={24} md={11}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {renderDateTimeInputs({
                startDate: sleepEntryStartDate,
                setStartDate: setSleepEntryStartDate,
                startTime: sleepEntryStartTime,
                setStartTime: setSleepEntryStartTime,
                endDate: sleepEntryEndDate,
                setEndDate: setSleepEntryEndDate,
                endTime: sleepEntryEndTime,
                setEndTime: setSleepEntryEndTime,
              })}
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {s.napDurationHint}
              </Text>
              <Button
                type="primary"
                size="large"
                loading={submittingSleepEntry}
                onClick={submitSleepEntry}
                className="ant-dashboard-action-btn"
              >
                {s.save}
              </Button>
            </Space>
          </Col>
          <Col xs={0} md={1}>
            <div style={{ width: "1px", height: "100%", backgroundColor: "rgba(255, 255, 255, 0.1)" }} />
          </Col>
          <Col xs={24} md={0}>
            <Divider style={{ margin: "0" }} />
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" size={12} className="ant-sleep-timer-card" style={{ width: "100%" }}>
              <Row gutter={16}>
                <Col xs={sleepTimer.running && sleepTimerPaused ? 12 : 24}>
                  <Statistic
                    title={s.sleepTimer}
                    value={formatElapsedSeconds(
                      sleepTimerPaused || !sleepTimerResumeMs
                        ? sleepTimerFrozenSeconds
                        : sleepTimerFrozenSeconds + Math.floor((currentTime - sleepTimerResumeMs) / 1000),
                    )}
                  />
                </Col>
                {sleepTimer.running && sleepTimerPaused && (
                  <Col xs={12}>
                    <Statistic
                      title={s.pause}
                      value={formatElapsedSeconds(
                        sleepTimerPauseStartMs
                          ? Math.floor((currentTime - sleepTimerPauseStartMs) / 1000)
                          : 0,
                      )}
                    />
                  </Col>
                )}
              </Row>
              <Space wrap>
                <Tag color={sleepTimer.running ? "gold" : "default"}>
                  {sleepTimer.running
                    ? sleepTimerPaused
                      ? s.paused
                      : s.running
                    : s.ready}
                </Tag>
              </Space>
              <Button
                type="primary"
                size="large"
                loading={submittingSleepTimer}
                onClick={() => {
                  if (!sleepTimer.running) {
                    submitSleepTimerAction("start");
                  } else if (sleepTimerPaused) {
                    submitSleepTimerAction("resume");
                  } else {
                    submitSleepTimerAction("pause");
                  }
                }}
                className="ant-dashboard-action-btn"
              >
                {!sleepTimer.running ? s.startTimer : sleepTimerPaused ? s.resume : s.pause}
              </Button>
              {sleepTimer.running && (
                <Row gutter={[8, 8]}>
                  <Col xs={24} md={12}>
                    <Button
                      type="default"
                      size="large"
                      loading={submittingSleepTimer}
                      onClick={() => submitSleepTimerAction("save")}
                      className="ant-dashboard-action-btn"
                    >
                      {s.saveTimer}
                    </Button>
                  </Col>
                  <Col xs={24} md={12}>
                    <Button
                      danger
                      size="large"
                      loading={submittingSleepTimer}
                      onClick={() => {
                        ant.modal.confirm({
                          title: s.cancelTimerTitle,
                          content: s.cancelTimerConfirm,
                          okText: s.cancelTimer,
                          okType: "danger",
                          cancelText: s.cancel,
                          onOk: () => submitSleepTimerAction("cancel"),
                        });
                      }}
                      className="ant-dashboard-action-btn"
                    >
                      {s.cancelTimer}
                    </Button>
                  </Col>
                </Row>
              )}
            </Space>
          </Col>
        </Row>
      )}

      {selectedSegment === "diaper" && (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Row gutter={8}>
            <Col span={12}>
              <DatePicker
                value={diaperDate}
                format={APP_DATE_FORMAT}
                onChange={(value) => value && setDiaperDate(value)}
                className="ant-dashboard-picker"
                inputReadOnly
              />
            </Col>
            <Col span={12}>
              <TimePicker
                value={diaperTime}
                format={APP_TIME_FORMAT}
                onChange={(value) => value && setDiaperTime(value)}
                className="ant-dashboard-picker"
                inputReadOnly
              />
            </Col>
          </Row>
          <Segmented
            block
            value={diaperConsistency}
            options={[
              { label: s.liquid, value: "liquid" },
              { label: s.solid, value: "solid" },
            ]}
            onChange={setDiaperConsistency}
          />
          <Button
            type="primary"
            size="large"
            loading={submittingDiaper}
            onClick={submitDiaperEntry}
            className="ant-dashboard-action-btn"
          >
            {s.save}
          </Button>
        </Space>
      )}

      {selectedSegment === "feeding" && (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Row gutter={8}>
            <Col span={12}>
              <DatePicker
                value={feedingStartDate}
                format={APP_DATE_FORMAT}
                onChange={(value) => value && setFeedingStartDate(value)}
                className="ant-dashboard-picker"
                inputReadOnly
              />
            </Col>
            <Col span={12}>
              <TimePicker
                value={feedingStartTime}
                format={APP_TIME_FORMAT}
                onChange={(value) => value && setFeedingStartTime(value)}
                className="ant-dashboard-picker"
                inputReadOnly
              />
            </Col>
          </Row>
          <Segmented
            block
            value={feedingType}
            options={[
              { label: s.solid, value: "solid" },
              { label: s.babyFood, value: "baby_food" },
              { label: s.breastMilk, value: "breast_milk" },
            ]}
            onChange={setFeedingType}
          />
          <Button
            type="primary"
            size="large"
            loading={submittingFeeding}
            onClick={submitFeedingEntry}
            className="ant-dashboard-action-btn"
          >
            {s.save}
          </Button>
        </Space>
      )}

      {selectedSegment === "breastfeeding" && (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {renderDateTimeInputs({
            startDate: breastfeedingStartDate,
            setStartDate: setBreastfeedingStartDate,
            startTime: breastfeedingStartTime,
            setStartTime: setBreastfeedingStartTime,
            endDate: breastfeedingEndDate,
            setEndDate: setBreastfeedingEndDate,
            endTime: breastfeedingEndTime,
            setEndTime: setBreastfeedingEndTime,
          })}
          <Segmented
            block
            value={breastfeedingSide}
            options={[
              { label: s.left, value: "left" },
              { label: s.right, value: "right" },
            ]}
            onChange={setBreastfeedingSide}
          />
          <Button
            type="primary"
            size="large"
            loading={submittingBreastfeeding}
            onClick={submitBreastfeedingEntry}
            className="ant-dashboard-action-btn"
          >
            {s.save}
          </Button>
        </Space>
      )}

      {selectedSegment === "pumping" && (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {renderDateTimeInputs({
            startDate: pumpingStartDate,
            setStartDate: setPumpingStartDate,
            startTime: pumpingStartTime,
            setStartTime: setPumpingStartTime,
            endDate: pumpingEndDate,
            setEndDate: setPumpingEndDate,
            endTime: pumpingEndTime,
            setEndTime: setPumpingEndTime,
          })}
          <Row gutter={8}>
            <Col span={12}>
              <label className="ant-dashboard-inline-label">{s.amount}</label>
              <Input
                value={pumpingAmount}
                onChange={(e) => setPumpingAmount(e.target.value)}
                className="ant-native-input"
                inputMode="decimal"
                addonAfter="ml"
              />
            </Col>
          </Row>
          <label className="ant-dashboard-inline-label">{s.side}</label>
          <Segmented
            block
            value={pumpingSide}
            options={[
              { label: s.left, value: "left" },
              { label: s.right, value: "right" },
              { label: s.both, value: "both" },
            ]}
            onChange={setPumpingSide}
          />
          <Button
            type="primary"
            size="large"
            loading={submittingPumping}
            onClick={submitPumpingEntry}
            className="ant-dashboard-action-btn"
          >
            {s.save}
          </Button>
        </Space>
      )}
    </Space>
  );
}
