import { useEffect, useRef, useState } from "react";
import {
  App as AntApp,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Grid,
  Image,
  Input,
  Layout,
  List,
  Menu,
  Pagination,
  Radio,
  Row,
  Select,
  Segmented,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  TimePicker,
  Timeline as AntTimeline,
  theme,
  Typography,
} from "antd";
import {
  DashboardOutlined,
  DeleteOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  EditOutlined,
  LineChartOutlined,
  ReloadOutlined,
  CalendarOutlined,
  SettingOutlined,
  SwapOutlined,
  UserOutlined,
} from "@ant-design/icons";
import deDE from "antd/locale/de_DE";
import enUS from "antd/locale/en_US";
import dayjs from "dayjs";
import "dayjs/locale/de";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const SECTION_META = {
  diaper: { color: "#ff7875" },
  feedings: { color: "#69b1ff" },
  pumpings: { color: "#b37feb" },
  sleep: { color: "#ffd666" },
  tummytime: { color: "#5cdb8b" },
};

const DASHBOARD_CARD_TITLES = {
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

function asItems(payload) {
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

function createApiClient(csrfToken) {
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

function loadScriptOnce(src) {
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

function extractScriptContent(scriptMarkup) {
  const match = String(scriptMarkup || "").match(
    /<script[^>]*>([\s\S]*?)<\/script>/i,
  );
  return match ? match[1] : String(scriptMarkup || "");
}

function AppShell({ bootstrap, children }) {
  const screens = useBreakpoint();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isDesktop = Boolean(screens.md);
  const isAuthLayout = bootstrap.layout === "auth";
  const navItems = [
    {
      key: bootstrap.urls.dashboard,
      icon: <DashboardOutlined />,
      label: bootstrap.strings.dashboard,
    },
    {
      key: bootstrap.urls.timeline,
      icon: <SwapOutlined />,
      label: bootstrap.strings.timeline,
    },
    {
      key: bootstrap.urls.settings,
      icon: <SettingOutlined />,
      label: bootstrap.strings.settings,
    },
    {
      key: "__logout__",
      icon: <LogoutOutlined />,
      label: bootstrap.strings.logout,
    },
  ];

  function handleNavClick({ key }) {
    if (key === "__logout__") {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = bootstrap.urls.logout;
      const csrf = document.createElement("input");
      csrf.type = "hidden";
      csrf.name = "csrfmiddlewaretoken";
      csrf.value = bootstrap.csrfToken;
      form.appendChild(csrf);
      document.body.appendChild(form);
      form.submit();
      return;
    }
    window.location.assign(key);
  }

  const selectedKey =
    bootstrap.activeNavKey === null
      ? null
      : bootstrap.activeNavKey ||
        navItems.find(
          (item) =>
            item.key !== "__logout__" &&
            bootstrap.currentPath.startsWith(item.key),
        )?.key ||
        bootstrap.urls.dashboard;

  const brand = (
    <div className="ant-shell-brand">
      <img
        src="/static/babybuddy/logo/icon-brand.png"
        alt=""
        width="36"
        height="36"
      />
      {!collapsed && <span>Baby Buddy</span>}
    </div>
  );

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={selectedKey ? [selectedKey] : []}
      items={navItems}
      onClick={handleNavClick}
      className="ant-shell-menu"
    />
  );

  const pageMeta = {
    "dashboard-home": {
      eyebrow: bootstrap.strings.overview,
      title: bootstrap.strings.dashboard,
    },
    "dashboard-child": {
      eyebrow: bootstrap.strings.childDashboard,
      title: bootstrap.currentChild?.name || bootstrap.strings.dashboard,
    },
    "child-detail": {
      eyebrow: bootstrap.strings.timeline,
      title: bootstrap.childDetail?.name || bootstrap.strings.timeline,
    },
    settings: {
      eyebrow: bootstrap.strings.settings,
      title: bootstrap.strings.userSettings,
    },
    list: {
      eyebrow: bootstrap.listPage?.kicker || bootstrap.strings.list,
      title: bootstrap.listPage?.title || bootstrap.strings.list,
    },
    form: {
      eyebrow: bootstrap.formPage?.kicker || bootstrap.strings.form,
      title: bootstrap.formPage?.title || bootstrap.strings.form,
    },
    "confirm-delete": {
      eyebrow: bootstrap.strings.dangerZone,
      title: bootstrap.formPage?.title || bootstrap.strings.confirmDelete,
    },
    "tag-detail": {
      eyebrow: bootstrap.strings.overview,
      title: bootstrap.tagDetail?.name || bootstrap.strings.overview,
    },
    "timer-detail": {
      eyebrow: bootstrap.strings.timeline,
      title: bootstrap.timerDetail?.name || bootstrap.strings.timeline,
    },
    timeline: {
      eyebrow: bootstrap.timelinePage?.kicker || bootstrap.strings.timeline,
      title: bootstrap.timelinePage?.title || bootstrap.strings.timeline,
    },
    "report-list": {
      eyebrow: bootstrap.strings.overview,
      title: bootstrap.strings.reports,
    },
    "report-detail": {
      eyebrow: bootstrap.reportDetail?.category || bootstrap.strings.reports,
      title: bootstrap.reportDetail?.title || bootstrap.strings.reports,
    },
    welcome: {
      eyebrow: bootstrap.strings.welcome,
      title: bootstrap.strings.welcomeTitle || bootstrap.strings.welcome,
    },
    message: {
      eyebrow: bootstrap.messagePage?.kicker || bootstrap.strings.overview,
      title: bootstrap.messagePage?.title || bootstrap.strings.overview,
    },
    "device-access": {
      eyebrow: bootstrap.strings.settings,
      title: bootstrap.strings.addDevice,
    },
    "auth-form": {
      eyebrow: bootstrap.formPage?.kicker || bootstrap.strings.welcome,
      title: bootstrap.formPage?.title || bootstrap.strings.login,
    },
  }[bootstrap.pageType] || {
    eyebrow: bootstrap.strings.dashboard,
    title: bootstrap.strings.dashboard,
  };

  if (isAuthLayout) {
    return (
      <div className="ant-auth-shell">
        <div className="ant-auth-brand">
          <img
            src="/static/babybuddy/logo/icon-brand.png"
            alt=""
            width="72"
            height="72"
          />
          <span>Baby Buddy</span>
        </div>
        <div className="ant-auth-content">
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {(bootstrap.messages || []).map((message, index) => (
              <Alert
                key={`${message.type}-${index}`}
                type={message.type || "info"}
                showIcon
                message={message.message}
              />
            ))}
            {children}
          </Space>
        </div>
      </div>
    );
  }

  return (
    <Layout className="ant-shell">
      {isDesktop ? (
        <Sider
          width={280}
          collapsedWidth={88}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          theme="light"
          className="ant-shell-sider"
        >
          <div className="ant-shell-sider-inner">
            {brand}
            <Button
              className="ant-shell-collapse"
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
            />
            {menu}
          </div>
        </Sider>
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          placement="left"
          width={300}
          styles={{ body: { padding: 16 } }}
        >
          {brand}
          {menu}
        </Drawer>
      )}
      <Layout>
        <Header className="ant-shell-header">
          <Space size="middle">
            {!isDesktop && (
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setMobileOpen(true)}
              />
            )}
            <div>
              <Text type="secondary">{pageMeta.eyebrow}</Text>
              <Title level={3} style={{ margin: 0, color: "#f8fafc" }}>
                {pageMeta.title}
              </Title>
            </div>
          </Space>
        </Header>
        <Content className="ant-shell-content">
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {(bootstrap.messages || []).map((message, index) => (
              <Alert
                key={`${message.type}-${index}`}
                type={message.type || "info"}
                showIcon
                message={message.message}
              />
            ))}
            {children}
          </Space>
        </Content>
      </Layout>
    </Layout>
  );
}

function renderListCell(cell) {
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

function ListPage({ bootstrap }) {
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

function buildInitialFormState(fieldsets) {
  return fieldsets.reduce((result, fieldset) => {
    fieldset.fields.forEach((field) => {
      result[field.name] =
        field.type === "checkbox" ? Boolean(field.value) : (field.value ?? "");
    });
    return result;
  }, {});
}

function parsePickerValue(fieldType, value) {
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

function formatHiddenValue(fieldType, value) {
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

function AntFieldControl({ field, value, onChange }) {
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

function HiddenFieldInput({ field, value }) {
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

function AntFormPage({ bootstrap, deleteMode = false }) {
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
          <Button
            type={deleteMode ? "primary" : "primary"}
            danger={deleteMode}
            htmlType="submit"
            size="large"
          >
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

function MessagePage({ bootstrap }) {
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

function WelcomePage({ bootstrap }) {
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

function DeviceAccessPage({ bootstrap }) {
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

function ChildDetailPage({ bootstrap }) {
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

function TagDetailPage({ bootstrap }) {
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

function TimerDetailPage({ bootstrap }) {
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

function TimelinePage({ bootstrap }) {
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

function ReportListPage({ bootstrap }) {
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

function ReportDetailPage({ bootstrap }) {
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

function DashboardHomePage({ bootstrap }) {
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

function SettingsCardPicker({
  bootstrap,
  selectedItems,
  setSelectedItems,
  statusText,
}) {
  const [activeAvailable, setActiveAvailable] = useState(null);
  const [activeSelected, setActiveSelected] = useState(null);
  const availableItems = bootstrap.settings.dashboard.availableItems.filter(
    (item) => !selectedItems.includes(item.value),
  );

  function addItem(value) {
    if (!value || selectedItems.includes(value)) {
      return;
    }
    setSelectedItems([...selectedItems, value]);
    setActiveAvailable(null);
  }

  function removeItem(value) {
    setSelectedItems(selectedItems.filter((item) => item !== value));
    setActiveSelected(null);
  }

  function moveItem(direction) {
    if (!activeSelected) {
      return;
    }
    const index = selectedItems.indexOf(activeSelected);
    if (index === -1) {
      return;
    }
    const nextItems = [...selectedItems];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= nextItems.length) {
      return;
    }
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
    setSelectedItems(nextItems);
  }

  function labelFor(value) {
    return (
      bootstrap.settings.dashboard.availableItems.find(
        (item) => item.value === value,
      )?.label || value
    );
  }

  return (
    <Card className="ant-section-card" title={bootstrap.strings.dashboardCards}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Text type="secondary">{bootstrap.strings.available}</Text>
          <List
            className="ant-picker-list"
            bordered
            locale={{ emptyText: bootstrap.strings.noItemsAvailable }}
            dataSource={availableItems}
            renderItem={(item) => (
              <List.Item
                className={activeAvailable === item.value ? "is-active" : ""}
                actions={[
                  <Button
                    type="link"
                    key="add"
                    onClick={() => addItem(item.value)}
                  >
                    +
                  </Button>,
                ]}
                onClick={() => setActiveAvailable(item.value)}
              >
                {item.label}
              </List.Item>
            )}
          />
        </Col>
        <Col xs={24} lg={4}>
          <Space
            direction="vertical"
            style={{ width: "100%", justifyContent: "center", height: "100%" }}
          >
            <Button
              block
              onClick={() => addItem(activeAvailable)}
              disabled={!activeAvailable}
            >
              &gt;
            </Button>
            <Button
              block
              onClick={() => {
                if (availableItems.length) {
                  setSelectedItems([
                    ...selectedItems,
                    ...availableItems.map((item) => item.value),
                  ]);
                }
              }}
              disabled={!availableItems.length}
            >
              &gt;&gt;
            </Button>
            <Button
              block
              onClick={() => setSelectedItems([])}
              disabled={!selectedItems.length}
            >
              &lt;&lt;
            </Button>
            <Button
              block
              onClick={() => removeItem(activeSelected)}
              disabled={!activeSelected}
            >
              &lt;
            </Button>
            <Button
              block
              onClick={() => moveItem("up")}
              disabled={!activeSelected}
            >
              {bootstrap.strings.moveUp}
            </Button>
            <Button
              block
              onClick={() => moveItem("down")}
              disabled={!activeSelected}
            >
              {bootstrap.strings.moveDown}
            </Button>
          </Space>
        </Col>
        <Col xs={24} lg={10}>
          <Text type="secondary">{bootstrap.strings.selected}</Text>
          <List
            className="ant-picker-list"
            bordered
            locale={{ emptyText: bootstrap.strings.noItemsSelected }}
            dataSource={selectedItems}
            renderItem={(value) => (
              <List.Item
                className={activeSelected === value ? "is-active" : ""}
                actions={[
                  <Button
                    type="link"
                    key="remove"
                    onClick={() => removeItem(value)}
                  >
                    −
                  </Button>,
                ]}
                onClick={() => setActiveSelected(value)}
              >
                {labelFor(value)}
              </List.Item>
            )}
          />
        </Col>
      </Row>
      <Text type="secondary" style={{ display: "block", marginTop: 12 }}>
        {statusText}
      </Text>
    </Card>
  );
}

function SettingsPage({ bootstrap }) {
  const ant = AntApp.useApp();
  const api = useRef(createApiClient(bootstrap.csrfToken));
  const [form] = Form.useForm();
  const [selectedItems, setSelectedItems] = useState(
    bootstrap.settings.dashboard.visibleItems,
  );
  const [statusText, setStatusText] = useState(bootstrap.strings.saved);
  const [apiKey, setApiKey] = useState(bootstrap.settings.apiKey);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    form.setFieldsValue({
      first_name: bootstrap.settings.profile.firstName,
      last_name: bootstrap.settings.profile.lastName,
      email: bootstrap.settings.profile.email,
      language: bootstrap.settings.preferences.language,
      timezone: bootstrap.settings.preferences.timezone,
      pagination_count: bootstrap.settings.preferences.paginationCount,
      dashboard_refresh_rate: bootstrap.settings.dashboard.refreshRate,
      dashboard_hide_empty: bootstrap.settings.dashboard.hideEmpty,
      dashboard_hide_age: bootstrap.settings.dashboard.hideAge,
    });
  }, [bootstrap, form]);

  function choiceOptions(key) {
    return bootstrap.settings.choices[key].map((choice) => ({
      value: choice.value,
      label: choice.label,
    }));
  }

  async function saveSettings(values) {
    setStatusText(bootstrap.strings.saving);
    setErrorText("");
    const payload = new URLSearchParams();
    payload.set("action", "autosave_all_settings");
    payload.set("first_name", values.first_name || "");
    payload.set("last_name", values.last_name || "");
    payload.set("email", values.email || "");
    payload.set("language", values.language || "");
    payload.set("timezone", values.timezone || "");
    payload.set("pagination_count", values.pagination_count || "");
    payload.set("dashboard_refresh_rate", values.dashboard_refresh_rate || "");
    payload.set("dashboard_hide_age", values.dashboard_hide_age || "");
    payload.set("dashboard_visible_items", selectedItems.join(","));
    if (values.dashboard_hide_empty) {
      payload.set("dashboard_hide_empty", "on");
    }
    payload.set("next", bootstrap.urls.self);

    const response = await api.current.postForm(bootstrap.urls.self, payload);
    const data = await response.json();
    if (!response.ok || !data.saved) {
      const firstKey = Object.keys(data.errors || {})[0];
      const firstError = firstKey
        ? data.errors[firstKey]?.[0]?.message
        : bootstrap.strings.saveFailed;
      setStatusText(bootstrap.strings.saveFailed);
      setErrorText(firstError || bootstrap.strings.saveFailed);
      return;
    }
    setStatusText(bootstrap.strings.saved);
    ant.message.success(bootstrap.strings.settingsSaved);
  }

  async function regenerateApiKey() {
    const payload = new URLSearchParams();
    payload.set("api_key_regenerate", "1");
    const response = await api.current.postForm(bootstrap.urls.self, payload);
    const data = await response.json();
    if (response.ok && data.api_key) {
      setApiKey(data.api_key);
      ant.message.success(data.message || bootstrap.strings.apiKeyRegenerated);
      return;
    }
    ant.message.error(bootstrap.strings.saveFailed);
  }

  const siteLinks = [
    {
      key: "apiBrowser",
      label: bootstrap.strings.apiBrowser,
      href: bootstrap.settings.links.apiBrowser,
    },
    bootstrap.settings.links.siteSettings
      ? {
          key: "siteSettings",
          label: bootstrap.strings.siteSettings,
          href: bootstrap.settings.links.siteSettings,
        }
      : null,
    bootstrap.settings.links.tags
      ? {
          key: "tags",
          label: bootstrap.strings.tags,
          href: bootstrap.settings.links.tags,
        }
      : null,
    bootstrap.settings.links.users
      ? {
          key: "users",
          label: bootstrap.strings.users,
          href: bootstrap.settings.links.users,
        }
      : null,
    bootstrap.settings.links.databaseAdmin
      ? {
          key: "databaseAdmin",
          label: bootstrap.strings.databaseAdmin,
          href: bootstrap.settings.links.databaseAdmin,
        }
      : null,
  ].filter(Boolean);

  const supportLinks = [
    {
      key: "sourceCode",
      label: bootstrap.strings.sourceCode,
      href: bootstrap.settings.links.sourceCode,
    },
    {
      key: "chatSupport",
      label: bootstrap.strings.chatSupport,
      href: bootstrap.settings.links.chatSupport,
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Space direction="vertical" size={6}>
          <Text type="secondary">{bootstrap.strings.settings}</Text>
          <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
            {bootstrap.strings.userSettings}
          </Title>
          <Text style={{ color: "#cbd5e1" }}>
            Ant Design settings now replace the previous template-based profile
            panel.
          </Text>
        </Space>
      </Card>

      {errorText ? <Alert type="error" message={errorText} showIcon /> : null}

      <Form layout="vertical" form={form} onFinish={saveSettings}>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card
              className="ant-section-card"
              title={bootstrap.strings.profile}
            >
              <Form.Item name="first_name" label={bootstrap.strings.firstName}>
                <Input />
              </Form.Item>
              <Form.Item name="last_name" label={bootstrap.strings.lastName}>
                <Input />
              </Form.Item>
              <Form.Item name="email" label={bootstrap.strings.email}>
                <Input type="email" />
              </Form.Item>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card
              className="ant-section-card"
              title={bootstrap.strings.preferences}
            >
              <Form.Item name="language" label={bootstrap.strings.language}>
                <Select options={choiceOptions("language")} />
              </Form.Item>
              <Form.Item name="timezone" label={bootstrap.strings.timezone}>
                <Select
                  showSearch
                  options={choiceOptions("timezone")}
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name="pagination_count"
                label={bootstrap.strings.pagination}
              >
                <Select options={choiceOptions("paginationCount")} />
              </Form.Item>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card
              className="ant-section-card"
              title={bootstrap.strings.dashboardPreferences}
            >
              <Form.Item
                name="dashboard_refresh_rate"
                label={bootstrap.strings.refreshRate}
              >
                <Select options={choiceOptions("refreshRate")} />
              </Form.Item>
              <Form.Item
                name="dashboard_hide_age"
                label={bootstrap.strings.hideAge}
              >
                <Select options={choiceOptions("hideAge")} />
              </Form.Item>
              <Form.Item
                name="dashboard_hide_empty"
                label={bootstrap.strings.hideEmpty}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card className="ant-section-card" title={bootstrap.strings.api}>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Input value={apiKey} readOnly />
                <Button danger onClick={regenerateApiKey}>
                  {bootstrap.strings.regenerate}
                </Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24}>
            <SettingsCardPicker
              bootstrap={bootstrap}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              statusText={statusText}
            />
          </Col>
          <Col xs={24}>
            <Card
              className="ant-section-card"
              title={bootstrap.strings.siteSupport}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Text type="secondary">{bootstrap.strings.site}</Text>
                  <List
                    className="ant-link-list"
                    dataSource={siteLinks}
                    renderItem={(item) => (
                      <List.Item>
                        <a href={item.href}>{item.label}</a>
                      </List.Item>
                    )}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text type="secondary">{bootstrap.strings.support}</Text>
                  <List
                    className="ant-link-list"
                    dataSource={supportLinks}
                    renderItem={(item) => (
                      <List.Item>
                        <a href={item.href}>{item.label}</a>
                      </List.Item>
                    )}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
        <div style={{ marginTop: 20 }}>
          <Button type="primary" htmlType="submit" size="large">
            {bootstrap.strings.submit}
          </Button>
        </div>
      </Form>
    </Space>
  );
}

function SummaryCard({ title, children }) {
  return (
    <Card size="small" className="ant-summary-card" title={title}>
      {children}
    </Card>
  );
}

function formatElapsedSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function MiniTimeline({ items, locale, currentTime, strings }) {
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const now = currentTime ? new Date(currentTime) : new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const dayEnd = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const currentMinutes =
    (now.getTime() - startOfDay.getTime()) / 60000;
  const currentTimePercent = Math.max(
    0,
    Math.min(100, (currentMinutes / (24 * 60)) * 100),
  );

  function minutesBetween(start, end) {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }

  function barForHour(hour) {
    const slotStart = new Date(
      startOfDay.getFullYear(),
      startOfDay.getMonth(),
      startOfDay.getDate(),
      hour,
      0,
      0,
      0,
    );
    const slotEnd = new Date(slotStart.getTime());
    slotEnd.setHours(hour + 1, 0, 0, 0);

    let best = null;
    let bestMinutes = 0;

    items.forEach((entry) => {
      const start = new Date(entry.start);
      const end = new Date(entry.end);
      if (end <= startOfDay || start >= dayEnd) {
        return;
      }
      const overlapStart = start > slotStart ? start : slotStart;
      const overlapEnd = end < slotEnd ? end : slotEnd;
      const overlap = minutesBetween(overlapStart, overlapEnd);
      if (overlap > bestMinutes) {
        bestMinutes = overlap;
        best = entry;
      }
    });

    if (!best || bestMinutes === 0) {
      return null;
    }

    const height = Math.max(10, Math.round((bestMinutes / 60) * 100));
    return (
      <div
        className={`ant-timeline-bar ${best.nap ? "nap" : "sleep"}`}
        style={{ height: `${height}%` }}
        title={`${new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(best.start))} - ${new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(best.end))}`}
      />
    );
  }

  return (
    <div className="ant-timeline">
      <div className="ant-timeline-legend">
        <span className="ant-timeline-legend-item">
          <i className="ant-timeline-legend-dot sleep" />
          <span>{strings.sleep}</span>
        </span>
        <span className="ant-timeline-legend-item">
          <i className="ant-timeline-legend-dot nap" />
          <span>{strings.nap}</span>
        </span>
        <span className="ant-timeline-legend-item">
          <i className="ant-timeline-legend-dot now" />
          <span>{strings.now}</span>
        </span>
      </div>
      <div className="ant-timeline-stage">
        <div className="ant-timeline-bars">
          <span
            className="ant-timeline-now-line"
            style={{ left: `${currentTimePercent}%` }}
          />
          {hours.map((hour) => (
            <div key={hour} className="ant-timeline-slot">
              {barForHour(hour)}
            </div>
          ))}
        </div>
        <div className="ant-timeline-axis">
          {hours.map((hour) => (
            <span key={hour}>{String(hour).padStart(2, "0")}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChildDashboardPage({ bootstrap }) {
  const ant = AntApp.useApp();
  const api = useRef(createApiClient(bootstrap.csrfToken));
  const [selectedChildId, setSelectedChildId] = useState(
    String(bootstrap.currentChild.id),
  );
  const [hiddenSections, setHiddenSections] = useState(
    bootstrap.dashboard.hiddenSections || [],
  );
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState({});
  const [dashboardData, setDashboardData] = useState({
    sleepItems: [],
  });
  const [diaperDate, setDiaperDate] = useState(dayjs());
  const [diaperTime, setDiaperTime] = useState(dayjs());
  const [diaperConsistency, setDiaperConsistency] = useState("liquid");
  const [sleepTimer, setSleepTimer] = useState(bootstrap.sleepTimer || {});
  const [submittingDiaper, setSubmittingDiaper] = useState(false);
  const [submittingSleepTimer, setSubmittingSleepTimer] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const child = bootstrap.children.find(
    (item) => String(item.id) === String(selectedChildId),
  );
  const locale = bootstrap.locale || "en";

  useEffect(() => {
    loadDashboardData(selectedChildId);
  }, [selectedChildId]);

  useEffect(() => {
    setSleepTimer(bootstrap.sleepTimer || {});
  }, [bootstrap.currentChild.id, bootstrap.sleepTimer]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function persistHidden(nextHidden) {
    const payload = new URLSearchParams();
    payload.set("action", "autosave_dashboard_layout");
    payload.set(
      "dashboard_section_order",
      bootstrap.dashboard.sectionOrder.join(","),
    );
    payload.set("dashboard_hidden_sections", nextHidden.join(","));

    try {
      await api.current.postForm(bootstrap.urls.layout, payload);
    } catch (error) {
      ant.message.error(bootstrap.strings.saveFailed);
    }
  }

  function toggleSection(sectionId) {
    const nextHidden = hiddenSections.includes(sectionId)
      ? hiddenSections.filter((item) => item !== sectionId)
      : [...hiddenSections, sectionId];
    setHiddenSections(nextHidden);
    persistHidden(nextHidden);
  }

  function formatDateTime(value) {
    if (!value) {
      return "n/a";
    }
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatTime(value) {
    if (!value) {
      return "n/a";
    }
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function durationMinutes(value) {
    if (value == null) {
      return 0;
    }
    return Math.round(Number(value) / 60);
  }

  function isToday(value) {
    const date = new Date(value);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }

  async function loadDashboardData(childId, options = {}) {
    if (!childId) {
      return;
    }

    const { background = false } = options;
    if (!background) {
      setLoading(true);
    }
    const query = `child=${encodeURIComponent(childId)}`;

    try {
      const [
        changes,
        feedings,
        pumpings,
        sleeps,
        tummyTimes,
        timers,
        recommendations,
      ] = await Promise.all([
        api.current.get(`/api/changes/?${query}&limit=20`),
        api.current.get(`/api/feedings/?${query}&limit=20`),
        api.current.get(`/api/pumping/?${query}&limit=20`),
        api.current.get(`/api/sleep/?${query}&limit=30`),
        api.current.get(`/api/tummy-times/?${query}&limit=20`),
        api.current.get(`/api/timers/?${query}&limit=5`),
        api.current.get(
          `/api/children/${encodeURIComponent(child.slug)}/sleep-recommendations/`,
        ),
      ]);

      const changeItems = asItems(changes);
      const feedingItems = asItems(feedings);
      const pumpingItems = asItems(pumpings);
      const sleepItems = asItems(sleeps);
      const tummyItems = asItems(tummyTimes);
      const timerItems = asItems(timers);
      setDashboardData({
        sleepItems,
      });

      const lastChange = changeItems[0];
      const lastFeeding = feedingItems[0];
      const lastPumping = pumpingItems[0];
      const lastSleep = sleepItems[0];
      const feedingsToday = feedingItems.filter((item) => isToday(item.start));
      const napsToday = sleepItems.filter(
        (item) => isToday(item.start) && item.nap,
      );

      const methodCounts = feedingItems.reduce((result, item) => {
        const key = item.method || "unknown";
        result[key] = (result[key] || 0) + 1;
        return result;
      }, {});
      const topMethod = Object.entries(methodCounts).sort(
        (a, b) => b[1] - a[1],
      )[0];

      setCards({
        "card.diaper.last": lastChange ? (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Last recorded"
              value={formatDateTime(lastChange.time)}
            />
            <Space wrap>
              <Tag color={lastChange.wet ? "blue" : "default"}>Wet</Tag>
              <Tag color={lastChange.solid ? "gold" : "default"}>Solid</Tag>
            </Space>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.diaper.types": (
          <Space direction="vertical" size={6}>
            <Statistic
              title="Changes today"
              value={changeItems.filter((item) => isToday(item.time)).length}
            />
            <Text type="secondary">{changeItems.length} recent entries</Text>
          </Space>
        ),
        "card.feedings.last": lastFeeding ? (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Duration"
              value={durationMinutes(lastFeeding.duration)}
              suffix="min"
            />
            <Text type="secondary">{formatDateTime(lastFeeding.start)}</Text>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.feedings.method": topMethod ? (
          <Space direction="vertical" size={4}>
            <Statistic title="Dominant method" value={topMethod[0]} />
            <Text type="secondary">{topMethod[1]} recent entries</Text>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.feedings.recent": (
          <Space direction="vertical" size={4}>
            <Statistic title="Feedings today" value={feedingsToday.length} />
            <Text type="secondary">{feedingItems.length} recent feedings</Text>
          </Space>
        ),
        "card.feedings.breastfeeding": (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Breastfeeding today"
              value={
                feedingsToday.filter((item) =>
                  String(item.method || "")
                    .toLowerCase()
                    .includes("breast"),
                ).length
              }
            />
          </Space>
        ),
        "card.pumpings.last": lastPumping ? (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Last pumping"
              value={durationMinutes(lastPumping.duration)}
              suffix="min"
            />
            <Text type="secondary">{formatDateTime(lastPumping.start)}</Text>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.sleep.timers": (
          <Space direction="vertical" size={4}>
            <Statistic title="Timers" value={timerItems.length} />
            <Text type="secondary">
              {timerItems[0]
                ? formatTime(timerItems[0].start)
                : bootstrap.strings.noData}
            </Text>
          </Space>
        ),
        "card.sleep.quick_timer": null,
        "card.sleep.last": lastSleep ? (
          <Space direction="vertical" size={4}>
            <Statistic
              title={lastSleep.nap ? "Nap" : "Sleep"}
              value={durationMinutes(lastSleep.duration)}
              suffix="min"
            />
            <Text type="secondary">
              {formatDateTime(lastSleep.start)} -{" "}
              {formatDateTime(lastSleep.end)}
            </Text>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.sleep.recommendations": recommendations ? (
          <Space direction="vertical" size={8}>
            <Card size="small">
              <Text strong>Nap</Text>
              <br />
              <Text type="secondary">
                {recommendations.nap?.ideal
                  ? `Ideal ${formatTime(recommendations.nap.ideal)}`
                  : bootstrap.strings.noData}
              </Text>
            </Card>
            <Card size="small">
              <Text strong>Bedtime</Text>
              <br />
              <Text type="secondary">
                {recommendations.bedtime?.target_bedtime
                  ? `Target ${formatTime(recommendations.bedtime.target_bedtime)}`
                  : bootstrap.strings.noData}
              </Text>
            </Card>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={bootstrap.strings.noData}
          />
        ),
        "card.sleep.recent": (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Sleep entries today"
              value={sleepItems.filter((item) => isToday(item.start)).length}
            />
            <Text type="secondary">
              {sleepItems.length} recent sleep entries
            </Text>
          </Space>
        ),
        "card.sleep.naps_day": (
          <Space direction="vertical" size={4}>
            <Statistic title="Naps today" value={napsToday.length} />
            <Text type="secondary">
              {napsToday.reduce(
                (acc, item) => acc + durationMinutes(item.duration),
                0,
              )}{" "}
              min
            </Text>
          </Space>
        ),
        "card.sleep.statistics": (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Average sleep"
              value={
                sleepItems.length
                  ? Math.round(
                      sleepItems.reduce(
                        (acc, item) => acc + durationMinutes(item.duration),
                        0,
                      ) / sleepItems.length,
                    )
                  : 0
              }
              suffix="min"
            />
          </Space>
        ),
        "card.sleep.timeline_day": null,
        "card.tummytime.day": (
          <Space direction="vertical" size={4}>
            <Statistic
              title="Tummy time today"
              value={tummyItems
                .filter((item) => isToday(item.start))
                .reduce((acc, item) => acc + durationMinutes(item.duration), 0)}
              suffix="min"
            />
            <Text type="secondary">{tummyItems.length} recent entries</Text>
          </Space>
        ),
      });
    } catch (error) {
      ant.message.error(error.message);
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
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
      if (!response.ok) {
        ant.message.error(bootstrap.strings.saveFailed);
        return;
      }

      if (action === "start") {
        setSleepTimer({
          running: true,
          startIso: new Date().toISOString(),
          elapsedSeconds: 0,
        });
      } else {
        setSleepTimer({
          running: false,
          startIso: null,
          elapsedSeconds: 0,
        });
        ant.message.success(bootstrap.strings.sleepEntrySaved);
        await loadDashboardData(selectedChildId, { background: true });
      }
    } finally {
      setSubmittingSleepTimer(false);
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
      const response = await api.current.postForm(
        bootstrap.urls.current,
        payload,
      );
      if (response.ok) {
        ant.message.success(bootstrap.strings.saved);
        await loadDashboardData(selectedChildId);
        return;
      }
      ant.message.error(bootstrap.strings.saveFailed);
    } finally {
      setSubmittingDiaper(false);
    }
  }

  function renderSleepTimerCard() {
    const timerElapsedSeconds = sleepTimer.running
      ? Math.max(
          Number(sleepTimer.elapsedSeconds) || 0,
          Math.floor(
            (currentTime - new Date(sleepTimer.startIso || currentTime).getTime()) /
              1000,
          ),
        )
      : Number(sleepTimer.elapsedSeconds) || 0;

    return (
      <Space
        direction="vertical"
        size={16}
        className="ant-sleep-timer-card"
        style={{ width: "100%" }}
      >
        <Statistic
          title={bootstrap.strings.sleepTimer}
          value={formatElapsedSeconds(timerElapsedSeconds)}
        />
        <Space wrap>
          <Tag color={sleepTimer.running ? "gold" : "default"}>
            {sleepTimer.running
              ? bootstrap.strings.running
              : bootstrap.strings.ready}
          </Tag>
          {sleepTimer.running && (
            <Text type="secondary">{bootstrap.strings.sleepTimerActive}</Text>
          )}
        </Space>
        <Button
          type="primary"
          size="large"
          loading={submittingSleepTimer}
          onClick={() =>
            submitSleepTimerAction(sleepTimer.running ? "stop" : "start")
          }
        >
          {sleepTimer.running ? bootstrap.strings.stop : bootstrap.strings.start}
        </Button>
      </Space>
    );
  }

  function renderSleepTimelineCard() {
    return (
      <MiniTimeline
        items={dashboardData.sleepItems.filter((item) => item.start && item.end)}
        locale={locale}
        currentTime={currentTime}
        strings={bootstrap.strings}
      />
    );
  }

  function navigateToChild(nextChildId) {
    const nextChild = bootstrap.children.find(
      (item) => String(item.id) === String(nextChildId),
    );
    if (!nextChild) {
      return;
    }
    setSelectedChildId(String(nextChild.id));
    if (nextChild.slug !== bootstrap.currentChild.slug) {
      const targetUrl = bootstrap.urls.childDashboardTemplate.replace(
        "__CHILD_SLUG__",
        encodeURIComponent(nextChild.slug),
      );
      window.location.assign(targetUrl);
    }
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card className="ant-hero-card">
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Text type="secondary">{bootstrap.strings.childDashboard}</Text>
              <Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
                {bootstrap.currentChild.name}
              </Title>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Select
                value={selectedChildId}
                options={bootstrap.children.map((item) => ({
                  value: String(item.id),
                  label: item.name,
                }))}
                onChange={navigateToChild}
                style={{ minWidth: 220 }}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadDashboardData(selectedChildId)}
              >
                {bootstrap.strings.refresh}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="ant-loading-shell">
          <Spin size="large" />
        </div>
      ) : (
        bootstrap.dashboard.sectionOrder.map((sectionId) => {
          const cardKeys = bootstrap.dashboard.cardsBySection[sectionId] || [];
          if (!cardKeys.length) {
            return null;
          }
          const hidden = hiddenSections.includes(sectionId);
          return (
            <Card
              key={sectionId}
              className="ant-section-card"
              title={
                <Space>
                  <Badge color={SECTION_META[sectionId]?.color} />
                  <span>{bootstrap.strings[sectionId] || sectionId}</span>
                </Space>
              }
              extra={
                <Button type="link" onClick={() => toggleSection(sectionId)}>
                  {hidden ? bootstrap.strings.show : bootstrap.strings.hide}
                </Button>
              }
            >
              {!hidden && (
                <Row gutter={[16, 16]}>
                  {cardKeys.map((cardKey) => (
                    <Col
                      xs={24}
                      lg={cardKey === "card.sleep.timeline_day" ? 24 : 12}
                      key={cardKey}
                    >
                      <SummaryCard
                        title={
                          DASHBOARD_CARD_TITLES[cardKey] ||
                          bootstrap.strings.migrationPending
                        }
                      >
                        {cardKey === "card.diaper.quick_entry" ? (
                          <Space
                            direction="vertical"
                            size={12}
                            style={{ width: "100%" }}
                          >
                            <Row gutter={8}>
                              <Col span={12}>
                                <input
                                  type="date"
                                  value={diaperDate.format("YYYY-MM-DD")}
                                  onChange={(event) =>
                                    setDiaperDate(dayjs(event.target.value))
                                  }
                                  className="ant-native-input"
                                />
                              </Col>
                              <Col span={12}>
                                <input
                                  type="time"
                                  value={diaperTime.format("HH:mm")}
                                  onChange={(event) =>
                                    setDiaperTime(
                                      dayjs(`2000-01-01T${event.target.value}`),
                                    )
                                  }
                                  className="ant-native-input"
                                />
                              </Col>
                            </Row>
                            <Segmented
                              block
                              value={diaperConsistency}
                              options={[
                                {
                                  label: bootstrap.strings.liquid,
                                  value: "liquid",
                                },
                                {
                                  label: bootstrap.strings.solid,
                                  value: "solid",
                                },
                              ]}
                              onChange={setDiaperConsistency}
                            />
                            <Button
                              type="primary"
                              size="large"
                              loading={submittingDiaper}
                              onClick={submitDiaperEntry}
                              className="ant-diaper-save"
                            >
                              {bootstrap.strings.save}
                            </Button>
                          </Space>
                        ) : (
                          (cardKey === "card.sleep.quick_timer" &&
                            renderSleepTimerCard()) ||
                          (cardKey === "card.sleep.timeline_day" &&
                            renderSleepTimelineCard()) ||
                          cards[cardKey] || (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description={bootstrap.strings.migrationPending}
                            />
                          )
                        )}
                      </SummaryCard>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          );
        })
      )}
    </Space>
  );
}

export function App({ bootstrap }) {
  const antLocale = String(bootstrap.locale || "en").startsWith("de")
    ? deDE
    : enUS;

  useEffect(() => {
    if (String(bootstrap.locale || "en").startsWith("de")) {
      dayjs.locale("de");
    } else {
      dayjs.locale("en");
    }
  }, [bootstrap.locale]);

  return (
    <ConfigProvider
      locale={antLocale}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#4db6ff",
          colorBgBase: "#020617",
          colorBgContainer: "#0f172a",
          colorBorder: "#1e3a5f",
          borderRadius: 18,
        },
      }}
    >
      <AntApp>
        <AppShell bootstrap={bootstrap}>
          {bootstrap.pageType === "dashboard-home" ? (
            <DashboardHomePage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "welcome" ? (
            <WelcomePage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "settings" ? (
            <SettingsPage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "list" ? (
            <ListPage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "message" ? (
            <MessagePage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "device-access" ? (
            <DeviceAccessPage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "auth-form" ? (
            <AntFormPage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "form" ? (
            <AntFormPage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "confirm-delete" ? (
            <AntFormPage bootstrap={bootstrap} deleteMode />
          ) : bootstrap.pageType === "child-detail" ? (
            <ChildDetailPage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "tag-detail" ? (
            <TagDetailPage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "timer-detail" ? (
            <TimerDetailPage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "timeline" ? (
            <TimelinePage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "report-list" ? (
            <ReportListPage bootstrap={bootstrap} />
          ) : bootstrap.pageType === "report-detail" ? (
            <ReportDetailPage bootstrap={bootstrap} />
          ) : (
            <ChildDashboardPage bootstrap={bootstrap} />
          )}
        </AppShell>
      </AntApp>
    </ConfigProvider>
  );
}
