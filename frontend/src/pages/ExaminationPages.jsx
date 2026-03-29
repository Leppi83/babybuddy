// frontend/src/pages/ExaminationPages.jsx
import React, { useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Timeline,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

const STATUS_COLOR = {
  completed: "#52c41a",
  due: "#4db6ff",
  overdue: "#ff4d4f",
  upcoming: "#888888",
};

const STATUS_ICON = {
  completed: <CheckCircleOutlined style={{ color: STATUS_COLOR.completed }} />,
  due: <ClockCircleOutlined style={{ color: STATUS_COLOR.due }} />,
  overdue: <ExclamationCircleOutlined style={{ color: STATUS_COLOR.overdue }} />,
  upcoming: <ClockCircleOutlined style={{ color: STATUS_COLOR.upcoming }} />,
};

export function ExaminationListPage({ bootstrap }) {
  const { examinations = [], strings = {}, childDetail = {}, csrfToken = "" } = bootstrap;
  const [examList, setExamList] = useState(examinations);

  function handleToggle(code, toggleUrl) {
    fetch(toggleUrl, {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken, "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((data) => {
        setExamList((prev) =>
          prev.map((e) =>
            e.code === code
              ? { ...e, status: data.status, completed_date: data.completed_date }
              : e
          )
        );
      });
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 12px 80px" }}>
      <Title level={3} style={{ marginBottom: 4 }}>
        {strings.examinations || "Examinations"}
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 20 }}>
        {childDetail.name}
      </Text>

      <Timeline
        items={examList.map((exam) => ({
          color: STATUS_COLOR[exam.status] || "#888",
          dot: STATUS_ICON[exam.status],
          children: (
            <ExaminationRow
              exam={exam}
              strings={strings}
              onToggle={() => handleToggle(exam.code, exam.toggleUrl)}
              key={exam.code}
            />
          ),
        }))}
      />
    </div>
  );
}

function ExaminationRow({ exam, strings, onToggle }) {
  const [toggling, setToggling] = useState(false);

  const statusLabel = {
    completed: strings.examCompleted || "Completed",
    due: strings.examDue || "Due",
    overdue: strings.examOverdue || "Overdue",
    upcoming: strings.examUpcoming || "Upcoming",
  }[exam.status] || exam.status;

  const isCompleted = exam.status === "completed";
  const isUpcoming = exam.status === "upcoming";

  function handleSwitch() {
    setToggling(true);
    Promise.resolve(onToggle()).finally(() => setToggling(false));
  }

  return (
    <Card
      size="small"
      style={{ marginBottom: 4, borderColor: (STATUS_COLOR[exam.status] || "#888") + "55" }}
    >
      <Row align="middle" gutter={8} wrap={false}>
        <Col flex="auto">
          <Space direction="vertical" size={2}>
            <Space size={6}>
              <Text strong>{exam.code}</Text>
              <Tag color={STATUS_COLOR[exam.status]} style={{ margin: 0, fontSize: 11 }}>
                {statusLabel}
              </Tag>
            </Space>
            <Text style={{ fontSize: 13 }}>{exam.name}</Text>
            {exam.completed_date ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {exam.completed_date}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {exam.due_from} &ndash; {exam.due_to}
              </Text>
            )}
          </Space>
        </Col>
        <Col>
          <Space size={8}>
            <Switch
              checked={isCompleted}
              loading={toggling}
              disabled={isUpcoming}
              onChange={handleSwitch}
              size="small"
              style={isCompleted ? { backgroundColor: STATUS_COLOR.completed } : undefined}
            />
            {!isUpcoming && (
              <Button
                size="small"
                type={!isCompleted ? "primary" : "default"}
                href={exam.url}
              >
                {isCompleted ? strings.viewEdit || "View / Edit" : strings.fillIn || "Fill in"}
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

export function ExaminationFormPage({ bootstrap }) {
  const {
    examinationType = {},
    categories = [],
    record = null,
    strings = {},
    urls = {},
    csrfToken = "",
  } = bootstrap;

  const [date, setDate] = useState(
    record?.date ? dayjs(record.date, "YYYY-MM-DD", true) : null
  );
  const [answers, setAnswers] = useState(() => {
    const initial = {};
    categories.forEach((cat) =>
      cat.questions.forEach((q) => {
        if (!q.doctor_only && q.value != null) {
          initial[String(q.id)] = q.value;
        }
      })
    );
    return initial;
  });
  const [notes, setNotes] = useState(record?.notes || "");

  function setAnswer(id, value) {
    setAnswers((prev) => ({ ...prev, [String(id)]: value }));
  }

  const statusColor = STATUS_COLOR[examinationType.status] || "#888";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 12px 80px" }}>
      <Space direction="vertical" size={4} style={{ marginBottom: 20, width: "100%" }}>
        <Space>
          <Tag color={statusColor} style={{ fontSize: 13 }}>
            {examinationType.code}
          </Tag>
          <Title level={4} style={{ margin: 0 }}>
            {examinationType.name}
          </Title>
        </Space>
        {examinationType.description && (
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
            {examinationType.description}
          </Paragraph>
        )}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {strings.ageWindow || "Age window"}: {examinationType.due_from} &ndash; {examinationType.due_to}
        </Text>
      </Space>

      <form method="POST" action={urls.saveUrl}>
        <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />
        <input type="hidden" name="answers" value={JSON.stringify(answers)} />

        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Text strong>{strings.dateOfExamination || "Date of examination"} *</Text>
            <DatePicker
              value={date}
              onChange={setDate}
              format="YYYY-MM-DD"
              style={{ width: "100%" }}
            />
            {date && (
              <input type="hidden" name="date" value={date.format("YYYY-MM-DD")} />
            )}
          </Space>
        </Card>

        {categories.map((cat) => (
          <Card
            key={cat.name}
            size="small"
            title={cat.name}
            style={{ marginBottom: 12 }}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {cat.questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  value={answers[String(q.id)]}
                  onChange={(v) => setAnswer(q.id, v)}
                  strings={strings}
                />
              ))}
            </Space>
          </Card>
        ))}

        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Text strong>{strings.notes || "Notes"}</Text>
            <Input.TextArea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </Space>
        </Card>

        <Button type="primary" htmlType="submit" block size="large">
          {strings.saveExamination || "Save examination"}
        </Button>
      </form>

      <div style={{ marginTop: 12 }}>
        <Button type="link" href={urls.listUrl} style={{ padding: 0 }}>
          &larr; {strings.examinations || "Back to examinations"}
        </Button>
      </div>
    </div>
  );
}

function QuestionRow({ question, value, onChange, strings }) {
  if (question.doctor_only) {
    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          padding: "8px 10px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <MedicineBoxOutlined style={{ color: "#888", marginTop: 2, flexShrink: 0 }} />
        <div>
          <Text style={{ fontSize: 13, color: "#aaa" }}>{question.text}</Text>
          <Text
            type="secondary"
            style={{ display: "block", fontSize: 11, marginTop: 2 }}
          >
            {strings.doctorOnly || "Assessed by your doctor"}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Text style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
        {question.text}
      </Text>
      <QuestionInput
        question={question}
        value={value}
        onChange={onChange}
        strings={strings}
      />
    </div>
  );
}

function QuestionInput({ question, value, onChange, strings }) {
  if (question.answer_type === "boolean") {
    return (
      <Radio.Group
        value={value}
        onChange={(e) => onChange(e.target.value)}
        buttonStyle="solid"
        size="small"
      >
        <Radio.Button value={true}>{strings.yes || "Yes"}</Radio.Button>
        <Radio.Button value={false}>{strings.no || "No"}</Radio.Button>
      </Radio.Group>
    );
  }
  if (question.answer_type === "number") {
    return (
      <InputNumber
        value={value}
        onChange={onChange}
        style={{ width: 140 }}
        size="small"
      />
    );
  }
  if (question.answer_type === "choice" && question.choices) {
    return (
      <Select
        value={value}
        onChange={onChange}
        style={{ width: "100%", maxWidth: 300 }}
        size="small"
        options={question.choices.map((c) => ({ label: c, value: c }))}
      />
    );
  }
  return (
    <Input.TextArea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      size="small"
    />
  );
}
