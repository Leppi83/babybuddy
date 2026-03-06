import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Image,
  Input,
  List,
  Pagination,
  Row,
  Space,
  Table,
  Tag,
  Timeline as AntTimeline,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  DashboardOutlined,
  DeleteOutlined,
  EditOutlined,
  LineChartOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  AntFieldControl,
  buildInitialFormState,
  extractScriptContent,
  formatHiddenValue,
  HiddenFieldInput,
  loadScriptOnce,
  renderListCell,
} from "../lib/app-utils";

const { Text, Title } = Typography;

export function ListPage({ bootstrap }) {
  const pagination = bootstrap.listPage.pagination;
  const columns = bootstrap.listPage.columns.map((column) => ({
    title: column.title,
    dataIndex: column.key,
    key: column.key,
    render: (value) => renderListCell(value),
  }));

  const dataSource = bootstrap.listPage.rows.map((row) => ({
    key: row.key,
    ...row.cells,
  }));

  function handlePageChange(page) {
    const url = new URL(window.location.href);
    if (page <= 1) {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", String(page));
    }
    window.location.assign(url.toString());
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={6}>
              <Text type="secondary">{bootstrap.listPage.kicker}</Text>
              <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
                {bootstrap.listPage.title}
              </Title>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              {(bootstrap.listPage.addActions || []).map((action) => (
                <Button key={action.href} type="primary" href={action.href}>
                  {action.label}
                </Button>
              ))}
            </Space>
          </Col>
        </Row>
      </Card>
      <Card className="ant-section-card">
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          locale={{ emptyText: bootstrap.strings.empty }}
          scroll={{ x: 860 }}
        />
        {pagination ? (
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 20 }}
          >
            <Pagination
              current={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
          </div>
        ) : null}
      </Card>
    </Space>
  );
}

export function AntFormPage({ bootstrap, deleteMode = false }) {
  const [values, setValues] = useState(() =>
    buildInitialFormState(bootstrap.formPage.fieldsets || []),
  );

  useEffect(() => {
    setValues(buildInitialFormState(bootstrap.formPage.fieldsets || []));
  }, [bootstrap]);

  function updateValue(name, nextValue) {
    setValues((current) => ({ ...current, [name]: nextValue }));
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Space direction="vertical" size={6}>
          <Text type="secondary">{bootstrap.formPage.kicker}</Text>
          <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
            {bootstrap.formPage.title}
          </Title>
          {!deleteMode && bootstrap.formPage.description ? (
            <Text style={{ color: "#cbd5e1" }}>
              {bootstrap.formPage.description}
            </Text>
          ) : null}
          {deleteMode && bootstrap.formPage.dangerText ? (
            <Text style={{ color: "#fca5a5" }}>
              {bootstrap.formPage.dangerText}
            </Text>
          ) : null}
        </Space>
      </Card>

      {bootstrap.messageBanner ? (
        <Alert
          type={bootstrap.messageBanner.type || "warning"}
          showIcon
          message={bootstrap.messageBanner.message}
          action={
            bootstrap.messageBanner.action ? (
              <Button href={bootstrap.messageBanner.action.href} size="small">
                {bootstrap.messageBanner.action.label}
              </Button>
            ) : null
          }
        />
      ) : null}

      <form
        action={bootstrap.urls.self}
        method="post"
        encType={bootstrap.formPage.enctype}
        className="ant-managed-form"
      >
        <input
          type="hidden"
          name="csrfmiddlewaretoken"
          value={bootstrap.csrfToken}
        />
        {(bootstrap.formPage.hiddenInputs || []).map((field) => (
          <input
            key={field.name}
            type="hidden"
            name={field.name}
            value={field.value}
          />
        ))}
        {(bootstrap.formPage.fieldsets || []).map((fieldset) => (
          <Card
            key={fieldset.key}
            className="ant-section-card"
            title={fieldset.label || bootstrap.strings.form}
          >
            <Row gutter={[16, 16]}>
              {fieldset.fields.map((field) => (
                <Col
                  xs={24}
                  md={field.type === "textarea" ? 24 : 12}
                  key={`${fieldset.key}-${field.name}`}
                >
                  <div className="ant-form-field">
                    <div className="ant-form-field__label">
                      <Text strong>{field.label}</Text>
                      <Text type="secondary">
                        {field.required
                          ? bootstrap.strings.required
                          : bootstrap.strings.optional}
                      </Text>
                    </div>
                    <AntFieldControl
                      field={field}
                      value={values[field.name]}
                      onChange={(nextValue) =>
                        updateValue(field.name, nextValue)
                      }
                    />
                    <HiddenFieldInput
                      field={field}
                      value={values[field.name]}
                    />
                    {field.helpText ? (
                      <Text type="secondary" className="ant-form-field__help">
                        {field.helpText}
                      </Text>
                    ) : null}
                    {field.errors.length ? (
                      <Alert
                        type="error"
                        showIcon
                        message={field.errors[0]}
                        className="ant-form-field__error"
                      />
                    ) : null}
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        ))}
        <Space style={{ marginTop: 20 }} wrap>
          <Button danger={deleteMode} htmlType="submit" type="primary" size="large">
            {bootstrap.formPage.submitLabel}
          </Button>
          <Button href={bootstrap.urls.cancel} size="large">
            {bootstrap.formPage.cancelLabel}
          </Button>
        </Space>
      </form>
    </Space>
  );
}

export function MessagePage({ bootstrap }) {
  const message = bootstrap.messagePage;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Text type="secondary">{message.kicker}</Text>
          <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
            {message.title}
          </Title>
          {(message.body || []).map((paragraph, index) => (
            <Text
              key={`${message.title}-${index}`}
              style={{ color: "#cbd5e1" }}
            >
              {paragraph}
            </Text>
          ))}
          {message.actions?.length ? (
            <Space wrap style={{ marginTop: 12 }}>
              {message.actions.map((action) => (
                <Button key={action.href} href={action.href} type="primary">
                  {action.label}
                </Button>
              ))}
            </Space>
          ) : null}
        </Space>
      </Card>
    </Space>
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
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Space direction="vertical" size={12}>
          <Text type="secondary">{bootstrap.strings.welcome}</Text>
          <Title level={1} style={{ margin: 0, color: "#f8fafc" }}>
            {bootstrap.strings.welcomeTitle}
          </Title>
          <Text style={{ color: "#cbd5e1" }}>
            {bootstrap.strings.welcomeIntro}
          </Text>
          <Text style={{ color: "#cbd5e1" }}>
            {bootstrap.strings.welcomeBody}
          </Text>
          <Space wrap style={{ marginTop: 8 }}>
            {featureItems.map((item) => (
              <Tag key={item} color="blue">
                {item}
              </Tag>
            ))}
          </Space>
          {bootstrap.urls.addChild ? (
            <div style={{ marginTop: 12 }}>
              <Button
                type="primary"
                href={bootstrap.urls.addChild}
                size="large"
              >
                {bootstrap.strings.addChild}
              </Button>
            </div>
          ) : null}
        </Space>
      </Card>
    </Space>
  );
}

export function DeviceAccessPage({ bootstrap }) {
  const deviceAccess = bootstrap.deviceAccess;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Text type="secondary">
            {bootstrap.strings.authenticationMethods}
          </Text>
          <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
            {bootstrap.strings.addDevice}
          </Title>
          <Text style={{ color: "#cbd5e1" }}>
            {bootstrap.strings.deviceAccessDescription}
          </Text>
        </Space>
      </Card>

      {bootstrap.messageBanner ? (
        <Alert
          type={bootstrap.messageBanner.type || "success"}
          showIcon
          message={bootstrap.messageBanner.message}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className="ant-section-card" title={bootstrap.strings.key}>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Input value={deviceAccess.apiKey} readOnly />
              <form action={bootstrap.urls.self} method="post">
                <input
                  type="hidden"
                  name="csrfmiddlewaretoken"
                  value={bootstrap.csrfToken}
                />
                <Button
                  htmlType="submit"
                  danger
                  name="api_key_regenerate"
                  value="1"
                >
                  {deviceAccess.regenerateLabel}
                </Button>
              </form>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card
            className="ant-section-card"
            title={bootstrap.strings.loginQrCode}
          >
            <div
              className="ant-device-qr"
              dangerouslySetInnerHTML={{ __html: deviceAccess.qrMarkup }}
            />
          </Card>
        </Col>
      </Row>

      <Space wrap>
        <Button href={bootstrap.urls.settings}>{deviceAccess.backLabel}</Button>
      </Space>
    </Space>
  );
}

export function ChildDetailPage({ bootstrap }) {
  const child = bootstrap.childDetail;
  const timelineItems = (child.timeline || []).map((entry) => ({
    color:
      entry.type === "start" ? "green" : entry.type === "end" ? "red" : "blue",
    children: (
      <div className="ant-timeline-event-card">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Space split={<span className="ant-dot-separator">•</span>} wrap>
            <Text strong>{entry.timeLabel}</Text>
            <Text type="secondary">{entry.sinceLabel}</Text>
          </Space>
          <Text strong>{entry.event}</Text>
          {entry.details.length ? (
            <Space direction="vertical" size={4}>
              {entry.details.map((detail, index) => (
                <Text key={`${entry.key}-detail-${index}`} type="secondary">
                  {detail}
                </Text>
              ))}
            </Space>
          ) : null}
          {entry.tags.length ? (
            <Space wrap>
              {entry.tags.map((tag) => (
                <Tag
                  key={`${entry.key}-${tag.name}`}
                  color={tag.color || "default"}
                >
                  {tag.name}
                </Tag>
              ))}
            </Space>
          ) : null}
          <Space wrap>
            {entry.duration ? (
              <Tag>
                {bootstrap.strings.duration}: {entry.duration}
              </Tag>
            ) : null}
            {entry.timeSincePrev ? (
              <Tag color="cyan">
                {entry.timeSincePrev} {bootstrap.strings.sincePrevious}
              </Tag>
            ) : null}
            {entry.editLink ? (
              <Button
                size="small"
                href={entry.editLink}
                icon={<EditOutlined />}
              >
                {bootstrap.strings.edit}
              </Button>
            ) : null}
          </Space>
        </Space>
      </div>
    ),
  }));

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={8} lg={6}>
            <div className="ant-child-detail-photo-wrap">
              <Image
                preview={false}
                src={child.photoUrl}
                alt=""
                className="ant-child-detail-photo"
              />
            </div>
          </Col>
          <Col xs={24} md={16} lg={18}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
                {child.name}
              </Title>
              <Space wrap size="middle">
                <Tag color="blue">
                  {bootstrap.strings.born}: {child.birthLabel}
                </Tag>
                <Tag color="geekblue">
                  {bootstrap.strings.age}: {child.ageLabel}
                </Tag>
              </Space>
              <Space wrap>
                <Button
                  href={child.actions.dashboard}
                  icon={<DashboardOutlined />}
                >
                  {bootstrap.strings.dashboard}
                </Button>
                <Button
                  href={child.actions.timeline}
                  icon={<CalendarOutlined />}
                >
                  {bootstrap.strings.timeline}
                </Button>
                <Button
                  href={child.actions.reports}
                  icon={<LineChartOutlined />}
                >
                  {bootstrap.strings.reports}
                </Button>
                <Button href={child.actions.edit} icon={<EditOutlined />}>
                  {bootstrap.strings.edit}
                </Button>
                <Button
                  href={child.actions.delete}
                  danger
                  icon={<DeleteOutlined />}
                >
                  {bootstrap.strings.delete}
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        className="ant-section-card"
        title={child.dateLabel}
        extra={
          <Space wrap>
            {child.previousUrl ? (
              <Button href={child.previousUrl}>
                {bootstrap.strings.previous}
              </Button>
            ) : null}
            {child.nextUrl ? (
              <Button href={child.nextUrl}>{bootstrap.strings.next}</Button>
            ) : null}
          </Space>
        }
      >
        {timelineItems.length ? (
          <AntTimeline items={timelineItems} />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noEvents}
          />
        )}
      </Card>
    </Space>
  );
}

export function TagDetailPage({ bootstrap }) {
  const tag = bootstrap.tagDetail;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space align="center" wrap>
            <Tag
              color={tag.color || "blue"}
              style={{ fontSize: "1rem", padding: "6px 12px" }}
            >
              {tag.name}
            </Tag>
            <Button href={tag.actions.edit} icon={<EditOutlined />}>
              {bootstrap.strings.edit}
            </Button>
            <Button href={tag.actions.delete} danger icon={<DeleteOutlined />}>
              {bootstrap.strings.delete}
            </Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {tag.sections.map((section) => (
          <Col xs={24} xl={12} key={section.title}>
            <Card className="ant-section-card" title={section.title}>
              <List
                className="ant-link-list"
                dataSource={section.items}
                renderItem={(item) => (
                  <List.Item extra={<Tag>{item.count}</Tag>}>
                    <a href={item.href}>{item.label}</a>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}

export function TimerDetailPage({ bootstrap }) {
  const timer = bootstrap.timerDetail;
  const [durationLabel, setDurationLabel] = useState("");

  function formatDuration() {
    const start = new Date(timer.start);
    const diffMs = Math.max(0, Date.now() - start.getTime());
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  useEffect(() => {
    setDurationLabel(formatDuration());
    const interval = window.setInterval(() => {
      setDurationLabel(formatDuration());
    }, 1000);
    return () => window.clearInterval(interval);
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
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Space
          direction="vertical"
          size={10}
          style={{ width: "100%", textAlign: "center" }}
        >
          <Title level={1} style={{ margin: 0, color: "#f8fafc" }}>
            {durationLabel}
          </Title>
          <Text type="secondary">
            {bootstrap.strings.started} {timer.start}
          </Text>
          <Text type="secondary">
            {timer.name} {bootstrap.strings.createdBy} {timer.createdBy}
          </Text>
          {timer.child ? <Tag color="blue">{timer.child}</Tag> : null}
        </Space>
      </Card>

      <Card className="ant-section-card" title={bootstrap.strings.actions}>
        <Space wrap>
          {timer.quickActions.map((action) => (
            <Button key={action.href} type="primary" href={action.href}>
              {action.label}
            </Button>
          ))}
          <Button href={timer.actions.edit} icon={<EditOutlined />}>
            {bootstrap.strings.edit}
          </Button>
          <Button danger href={timer.actions.delete} icon={<DeleteOutlined />}>
            {bootstrap.strings.delete}
          </Button>
          <Button
            onClick={() => submitPost(timer.actions.restart)}
            icon={<ReloadOutlined />}
          >
            {bootstrap.strings.restartTimer}
          </Button>
        </Space>
      </Card>
    </Space>
  );
}

export function TimelinePage({ bootstrap }) {
  const timeline = bootstrap.timelinePage;
  const items = (timeline.items || []).map((entry) => ({
    color:
      entry.type === "start" ? "green" : entry.type === "end" ? "red" : "blue",
    children: (
      <div className="ant-timeline-event-card">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Space split={<span className="ant-dot-separator">•</span>} wrap>
            <Text strong>{entry.timeLabel}</Text>
            <Text type="secondary">{entry.sinceLabel}</Text>
          </Space>
          <Text strong>{entry.event}</Text>
          {entry.details.length ? (
            <Space direction="vertical" size={4}>
              {entry.details.map((detail, index) => (
                <Text key={`${entry.key}-detail-${index}`} type="secondary">
                  {detail}
                </Text>
              ))}
            </Space>
          ) : null}
          {entry.tags.length ? (
            <Space wrap>
              {entry.tags.map((tag) => (
                <Tag
                  key={`${entry.key}-${tag.name}`}
                  color={tag.color || "default"}
                >
                  {tag.name}
                </Tag>
              ))}
            </Space>
          ) : null}
          <Space wrap>
            {entry.duration ? (
              <Tag>
                {bootstrap.strings.duration}: {entry.duration}
              </Tag>
            ) : null}
            {entry.timeSincePrev ? (
              <Tag color="cyan">
                {entry.timeSincePrev} {bootstrap.strings.sincePrevious}
              </Tag>
            ) : null}
            {entry.editLink ? (
              <Button
                size="small"
                href={entry.editLink}
                icon={<EditOutlined />}
              >
                {bootstrap.strings.edit}
              </Button>
            ) : null}
          </Space>
        </Space>
      </div>
    ),
  }));

  return (
    <Card
      className="ant-section-card"
      title={timeline.dateLabel}
      extra={
        <Space wrap>
          {timeline.previousUrl ? (
            <Button href={timeline.previousUrl}>
              {bootstrap.strings.previous}
            </Button>
          ) : null}
          {timeline.nextUrl ? (
            <Button href={timeline.nextUrl}>{bootstrap.strings.next}</Button>
          ) : null}
        </Space>
      }
    >
      {items.length ? (
        <AntTimeline items={items} />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={bootstrap.strings.noEvents}
        />
      )}
    </Card>
  );
}

export function ReportListPage({ bootstrap }) {
  const reportList = bootstrap.reportList;
  const groupedEntries = (reportList.entries || []).reduce((result, entry) => {
    const key = entry.category || bootstrap.strings.reports;
    result[key] = result[key] || [];
    result[key].push(entry);
    return result;
  }, {});

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={6}>
              <Text type="secondary">{bootstrap.strings.reports}</Text>
              <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
                {reportList.childName}
              </Title>
              <Text style={{ color: "#cbd5e1" }}>
                {bootstrap.strings.reportSummary}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Button
                href={reportList.actions.dashboard}
                icon={<DashboardOutlined />}
              >
                {bootstrap.strings.dashboard}
              </Button>
              <Button
                href={reportList.actions.timeline}
                icon={<CalendarOutlined />}
              >
                {bootstrap.strings.timeline}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {Object.entries(groupedEntries).map(([category, entries]) => (
          <Col xs={24} xl={12} key={category}>
            <Card className="ant-section-card" title={category}>
              <List
                className="ant-link-list"
                dataSource={entries}
                renderItem={(entry) => (
                  <List.Item
                    extra={
                      <Button type="link" href={entry.href}>
                        {bootstrap.strings.open}
                      </Button>
                    }
                  >
                    <a href={entry.href}>{entry.title}</a>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}

export function ReportDetailPage({ bootstrap }) {
  const report = bootstrap.reportDetail;
  const graphRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function renderGraph() {
      if (!graphRef.current) {
        return;
      }

      if (!report.html) {
        graphRef.current.innerHTML = "";
        return;
      }

      await loadScriptOnce(bootstrap.urls.graphJs);
      if (cancelled || !graphRef.current) {
        return;
      }

      graphRef.current.innerHTML = report.html;
      if (window.Plotly && report.plotlyLocale) {
        window.Plotly.setPlotConfig({ locale: report.plotlyLocale });
      }

      const scriptContent = extractScriptContent(report.js).trim();
      if (scriptContent) {
        new Function(scriptContent)();
      }
    }

    renderGraph();

    return () => {
      cancelled = true;
      if (graphRef.current) {
        graphRef.current.innerHTML = "";
      }
    };
  }, [bootstrap.urls.graphJs, report.html, report.js, report.plotlyLocale]);

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={6}>
              <Text type="secondary">{report.category}</Text>
              <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
                {report.title}
              </Title>
              <Text style={{ color: "#cbd5e1" }}>{report.childName}</Text>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Button
                href={report.actions.dashboard}
                icon={<DashboardOutlined />}
              >
                {bootstrap.strings.dashboard}
              </Button>
              <Button
                href={report.actions.timeline}
                icon={<CalendarOutlined />}
              >
                {bootstrap.strings.timeline}
              </Button>
              <Button
                href={report.actions.reports}
                icon={<LineChartOutlined />}
              >
                {bootstrap.strings.reports}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className="ant-section-card">
        {report.html ? (
          <div className="ant-report-graph" ref={graphRef} />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noReportData}
          />
        )}
      </Card>
    </Space>
  );
}

export function DashboardHomePage({ bootstrap }) {
  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Space direction="vertical" size={6}>
          <Text type="secondary">{bootstrap.strings.overview}</Text>
          <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
            {bootstrap.strings.dashboard}
          </Title>
          <Text style={{ color: "#cbd5e1" }}>
            React + Ant Design is now the target UI path for Baby Buddy.
          </Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {bootstrap.children.map((child) => (
          <Col xs={24} md={12} xl={8} key={child.id}>
            <Card
              hoverable
              className="ant-dashboard-card"
              cover={
                <div className="ant-child-image-wrap">
                  <Image
                    preview={false}
                    src={child.pictureUrl}
                    alt=""
                    className="ant-child-image"
                  />
                </div>
              }
              actions={[
                <Button
                  type="link"
                  key="open"
                  href={child.dashboardUrl}
                  icon={<DashboardOutlined />}
                >
                  {bootstrap.strings.openDashboard}
                </Button>,
              ]}
            >
              <Card.Meta
                avatar={<UserOutlined />}
                title={child.name}
                description={
                  <Space direction="vertical" size={4}>
                    <Text style={{ color: "#cbd5e1" }}>
                      {bootstrap.strings.born}: {child.birthDateLabel}
                    </Text>
                  </Space>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}
