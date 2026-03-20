# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the purple theme with a blue-based design system featuring shifting day/night colors, consistent spacing tokens, gradient header bands, and glass cards with accent borders.

**Architecture:** All design tokens live as CSS custom properties in `index.css`. The existing `:root` (dark default) and `:root[data-theme="light"]` convention is preserved. Ant Design ConfigProvider mirrors the CSS vars. Components reference tokens via `var()` — no hardcoded colors.

**Tech Stack:** CSS custom properties, Ant Design ConfigProvider, React (existing Vite + React setup)

**Spec:** `docs/superpowers/specs/2026-03-20-design-system-design.md`

---

## File Map

| File                                                | Action | Responsibility                                                                                                    |
| --------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `frontend/src/index.css`                            | Modify | All CSS custom properties (colors, spacing, radii, typography), card styles, background modes, header band styles |
| `frontend/src/App.jsx`                              | Modify | ConfigProvider tokens (purple → blue)                                                                             |
| `frontend/src/lib/app-utils.jsx`                    | Modify | `SECTION_META` and `ACTIVITY_COLORS` → CSS var references                                                         |
| `frontend/src/components/AppShell.jsx`              | Modify | Gradient header band, nav color updates, inline color fixes                                                       |
| `frontend/src/pages/DashboardPages.jsx`             | Modify | Replace any inline purple colors with var references                                                              |
| `frontend/src/pages/GeneralPages.jsx`               | Modify | Replace any inline purple colors with var references                                                              |
| `frontend/src/pages/InsightsPages.jsx`              | Modify | Replace hardcoded `#4db6ff` with var reference                                                                    |
| `frontend/src/pages/TopicPages.jsx`                 | Modify | Replace hardcoded `#38bdf8` with var reference                                                                    |
| `frontend/src/components/DashboardInsightsCard.jsx` | Modify | Replace hardcoded `#4db6ff` with var reference                                                                    |
| `frontend/src/components/QuickLogSheet.jsx`         | Modify | Replace hardcoded `#4db6ff` fallback                                                                              |
| `frontend/src/components/ActivityDial.jsx`          | Modify | Replace hardcoded purple/old-accent colors in SVG strokes, gradients, severity colors                             |
| `frontend/src/components/ActivityDial.css`          | Modify | Replace any purple-tinted gradient colors                                                                         |
| `frontend/src/lib/dial-utils.js`                    | Modify | Replace purple atmosphere gradient colors with blue equivalents                                                   |

---

### Task 1: CSS Tokens — Constants and Spacing

**Files:**

- Modify: `frontend/src/index.css:3-55` (`:root` block)

- [ ] **Step 1: Add spacing, radius, and typography tokens to `:root`**

Add these tokens at the TOP of the existing `:root` block in `index.css`, before the color variables:

```css
/* Spacing (4px grid) */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 24px;
--space-2xl: 32px;
--space-3xl: 48px;

/* Radii */
--radius-card: 18px;
--radius-button: 10px;
```

The font-family and typography tokens (`--font-title-size`, etc.) already exist — leave them unchanged.

- [ ] **Step 2: Verify the app still loads**

Run: `cd frontend && npm run dev`
Open in browser, confirm no visual breakage.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(design-system): add spacing and radius tokens to :root"
```

---

### Task 2: CSS Tokens — Dark Theme Colors (Purple → Blue)

**Files:**

- Modify: `frontend/src/index.css:3-55` (`:root` block — color variables)

- [ ] **Step 1: Replace ALL color variables in `:root` with blue equivalents**

Replace the color variables (everything from `color-scheme: dark` through `--app-card-glass-bg`) with the complete dark theme token set from the spec. Also add the new `--accent-*` and `--app-primary-hover/active` tokens. Keep the typography tokens unchanged.

The full replacement values are in the spec under "Dark theme (`:root` default)". Key changes:

- `--app-primary: #a78bfa` → `--app-primary: #2a5f96`
- `--app-text-primary: #f1f0ff` → `--app-text-primary: #c0d8ee`
- All `rgba(167, 139, 250, ...)` → `rgba(42, 95, 150, ...)`
- Add `--accent-diaper: #cc5570`, `--accent-feedings: #28a67a`, `--accent-pumpings: #9a68cc`, `--accent-sleep: #c49820`, `--accent-tummytime: #cc50cc`
- Add `--app-primary-hover: #3a7cc0`, `--app-primary-active: #1e4f7a`

- [ ] **Step 2: Also fix hardcoded purple values in `body` background (lines ~117-143)**

The `body` background (outside the `:root` block) has hardcoded purple radial gradients like `rgba(167, 139, 250, 0.12)`. These use `var()` refs to `--app-bg-start` etc. but also have hardcoded purple radial accents. Replace:

- `rgba(167, 139, 250, 0.12)` → `rgba(42, 95, 150, 0.12)`
- `rgba(56, 189, 248, 0.08)` → `rgba(42, 95, 150, 0.08)` (or use `var(--app-bg-radial)`)

- [ ] **Step 3: Fix hardcoded purple in card hover, nav, timeline, and other CSS rules**

Scattered throughout `index.css` (outside `:root` blocks) are ~15 hardcoded purple values. Search for these patterns and replace with `var()` references or blue equivalents:

- `rgba(167, 139, 250, ...)` → use appropriate `var(--app-*)` token
- `#c4b5fd` → `var(--app-link)` or `var(--app-text-secondary)`
- `#8b5cf6` → `var(--app-primary)`
- `rgba(124, 58, 237, ...)` → `rgba(77, 182, 255, ...)` in light theme overrides
- `rgba(196, 181, 253, ...)` → `rgba(77, 182, 255, ...)` in light theme overrides
- `linear-gradient(180deg, #c4b5fd, #8b5cf6)` in `.ant-timeline-bar.sleep` → use `var(--accent-sleep)` based gradient

Where possible, convert hardcoded colors to `var()` references rather than just swapping values.

- [ ] **Step 4: Verify dark theme renders with blue colors**

Run: `cd frontend && npm run dev`
Open in browser (dark mode). Confirm: backgrounds are dark navy (not purple), primary color is deep blue.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(design-system): replace dark theme purple tokens with blue"
```

---

### Task 3: CSS Tokens — Light Theme Colors (Purple → Blue)

**Files:**

- Modify: `frontend/src/index.css:57-108` (`:root[data-theme="light"]` block)

- [ ] **Step 1: Replace ALL color variables in `[data-theme="light"]` with blue equivalents**

Replace the entire light theme block with the values from the spec under "Light theme". Key changes:

- `--app-primary: #7c3aed` → `--app-primary: #4db6ff`
- `--app-text-primary: #1e1b4b` → `--app-text-primary: #1a5580`
- All `rgba(139, 92, 246, ...)` and `rgba(109, 40, 217, ...)` → `rgba(77, 182, 255, ...)`
- Add `--accent-diaper: #ff6b8b`, `--accent-feedings: #34d399`, `--accent-pumpings: #c084fc`, `--accent-sleep: #fbbf24`, `--accent-tummytime: #ff66ff`
- Add `--app-primary-hover: #2a9df4`, `--app-primary-active: #1a85d0`

- [ ] **Step 2: Also fix hardcoded purple in light theme `body` background and CSS overrides**

Same as Task 2 Step 2 but for the light theme block. Replace:

- `rgba(139, 92, 246, 0.08)` → `rgba(77, 182, 255, 0.08)`
- `rgba(99, 102, 241, 0.06)` → `rgba(77, 182, 255, 0.06)`
- Any remaining `rgba(124, 58, 237, ...)` and `rgba(196, 181, 253, ...)` in light-theme-specific CSS rules

- [ ] **Step 3: Verify light theme renders with blue colors**

Run: `cd frontend && npm run dev`
Toggle to light mode in the app. Confirm: backgrounds are light blue-white, primary color is bright sky blue.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(design-system): replace light theme purple tokens with blue"
```

---

### Task 4: ConfigProvider Tokens (App.jsx)

**Files:**

- Modify: `frontend/src/App.jsx:214-219`

- [ ] **Step 1: Update the Ant Design ConfigProvider token block**

In `App.jsx`, find the `token:` object inside `<ConfigProvider>` (around line 214). Replace:

```jsx
// OLD:
colorPrimary: effectiveTheme === "dark" ? "#a78bfa" : "#7c3aed",
colorBgBase: effectiveTheme === "dark" ? "#08071a" : "#faf8ff",
colorBgContainer: effectiveTheme === "dark" ? "#13103a" : "#ffffff",
colorBorder: effectiveTheme === "dark" ? "#2d2560" : "#e4d9f7",
```

With:

```jsx
// NEW:
colorPrimary: effectiveTheme === "dark" ? "#2a5f96" : "#4db6ff",
colorBgBase: effectiveTheme === "dark" ? "#080d1e" : "#eef6ff",
colorBgContainer: effectiveTheme === "dark" ? "rgba(18,30,55,0.95)" : "#ffffff",
colorBorder: effectiveTheme === "dark" ? "#1a3050" : "#c0ddf5",
```

`borderRadius: 18` stays unchanged.

- [ ] **Step 2: Verify Ant Design components use blue colors**

Run: `cd frontend && npm run dev`
Check that buttons, selects, and other Ant components show blue (not purple) in both themes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(design-system): update ConfigProvider tokens purple → blue"
```

---

### Task 5: Activity Color Maps (app-utils.jsx)

**Files:**

- Modify: `frontend/src/lib/app-utils.jsx:22-40`

- [ ] **Step 1: Update SECTION_META to use CSS var references**

Replace the `SECTION_META` object (lines 22-29):

```jsx
export const SECTION_META = {
  quick_entry: { color: "var(--app-primary)" },
  diaper: { color: "var(--accent-diaper)" },
  feedings: { color: "var(--accent-feedings)" },
  pumpings: { color: "var(--accent-pumpings)" },
  sleep: { color: "var(--accent-sleep)" },
  tummytime: { color: "var(--accent-tummytime)" },
};
```

- [ ] **Step 2: Update ACTIVITY_COLORS to use CSS var references**

Replace the `ACTIVITY_COLORS` object (lines 35-40):

```jsx
export const ACTIVITY_COLORS = {
  sleep: "var(--accent-sleep)",
  feeding: "var(--accent-feedings)",
  diaper: "var(--accent-diaper)",
  pumping: "var(--accent-pumpings)",
  tummytime: "var(--accent-tummytime)",
};
```

**Note:** `tummytime` is added per spec even though the current codebase doesn't include it. The ActivityDial may reference it.

- [ ] **Step 3: Verify section cards show colored accent borders**

Run: `cd frontend && npm run dev`
Open the child dashboard. Confirm each activity section card has a colored left border (sleep = amber, feedings = green, diaper = pink, pumpings = lavender).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/app-utils.jsx
git commit -m "feat(design-system): update SECTION_META and ACTIVITY_COLORS to CSS vars"
```

---

### Task 6: Inline Color Fixes (JSX Files)

**Files:**

- Modify: `frontend/src/components/AppShell.jsx:515` — FAB button color
- Modify: `frontend/src/components/DashboardInsightsCard.jsx:16` — info severity color
- Modify: `frontend/src/pages/InsightsPages.jsx:7` — info color
- Modify: `frontend/src/pages/TopicPages.jsx:63` — feeding color
- Modify: `frontend/src/components/QuickLogSheet.jsx:108` — border fallback

- [ ] **Step 1: Fix AppShell.jsx FAB button**

Find line ~515 with `background: "#4db6ff"`. Replace with:

```jsx
background: "var(--app-primary)",
```

Note: The FAB should shift with the theme (bright blue in day, deep blue at night), not stay constant. If the brand wants a constant FAB color, use `"#4db6ff"` — but per spec, buttons follow `--app-primary`.

- [ ] **Step 2: Fix DashboardInsightsCard.jsx**

Find line ~16 with `info: { color: "#4db6ff"`. Replace with:

```jsx
info: { color: "var(--app-primary)", Icon: InfoCircleOutlined },
```

- [ ] **Step 3: Fix InsightsPages.jsx**

Find line ~7 with `info: "#4db6ff"`. Replace with:

```jsx
info: "var(--app-primary)",
```

- [ ] **Step 4: Fix TopicPages.jsx**

Find line ~63 with `color: "#38bdf8"`. This was the old feedings blue. Replace with:

```jsx
color: "var(--accent-feedings)",
```

- [ ] **Step 5: Fix QuickLogSheet.jsx**

Find line ~108 with the `#4db6ff` fallback. Replace:

```jsx
border: `1px solid ${pressing ? "var(--app-primary)" : "var(--app-card-border)"}`,
```

Also fix line ~130 with `background: "#ffd666"` (timer dot). Replace with:

```jsx
background: "var(--accent-sleep)",
```

- [ ] **Step 6: Fix DashboardInsightsCard.jsx line ~160**

Find `color: "#5cdb8b"` on a CheckCircleOutlined icon. Replace with:

```jsx
color: "var(--accent-feedings)",
```

- [ ] **Step 7: Fix InsightsPages.jsx line ~142**

Find `color: "#ff7875"` for error text. Replace with:

```jsx
color: "var(--accent-diaper)",
```

- [ ] **Step 8: Fix DashboardPages.jsx SVG sleep chart colors**

Find these hardcoded sleep chart colors (~lines 70, 983-1043):

- `bannerColor = hasAlert ? "#ff7875" : "#ffd666"` → use `var(--accent-diaper)` / `var(--accent-sleep)`
- `stopColor="#ffd666"` in SVG `<stop>` elements → These are SVG attributes and **cannot** use `var()` directly. Create a helper that reads the computed CSS var:

```jsx
const accentSleep = getComputedStyle(document.documentElement)
  .getPropertyValue("--accent-sleep")
  .trim();
```

Then use `accentSleep` for all SVG attribute-based color references (`stopColor`, `stroke`, `fill`). Alternatively, use inline `style` attribute instead of XML attributes — SVG `style={{ fill: "var(--accent-sleep)" }}` does work in React.

- [ ] **Step 9: Verify all pages render without hardcoded purple/blue**

Run: `cd frontend && npm run dev`
Navigate through dashboard, insights, topic pages, quick log. Confirm no purple remnants.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/AppShell.jsx frontend/src/components/DashboardInsightsCard.jsx frontend/src/pages/InsightsPages.jsx frontend/src/pages/TopicPages.jsx frontend/src/components/QuickLogSheet.jsx frontend/src/pages/DashboardPages.jsx
git commit -m "feat(design-system): replace inline hardcoded colors with CSS var refs"
```

---

### Task 7: Activity Dial Colors (Purple → Blue)

**Files:**

- Modify: `frontend/src/lib/dial-utils.js:14-18` — atmosphere gradient colors
- Modify: `frontend/src/components/ActivityDial.jsx` — SVG strokes, gradients, severity colors
- Modify: `frontend/src/components/ActivityDial.css` — any purple gradients

- [ ] **Step 1: Update atmosphere gradient colors in dial-utils.js**

Replace the four color constants (lines 14-18):

```javascript
// OLD: bright purple (day) → dark purple (night)
const COLOR_NIGHT_DARK = { r: 0x1a, g: 0x0a, b: 0x3e }; // deep dark purple
const COLOR_DAY_DARK = { r: 0xc4, g: 0x8b, b: 0xfe }; // bright lavender
const COLOR_NIGHT_LIGHT = { r: 0x2d, g: 0x15, b: 0x5e }; // dark purple
const COLOR_DAY_LIGHT = { r: 0xd4, g: 0xa0, b: 0xff }; // bright purple

// NEW: bright blue (day) → dark blue (night)
const COLOR_NIGHT_DARK = { r: 0x08, g: 0x0d, b: 0x1e }; // #080d1e deep navy
const COLOR_DAY_DARK = { r: 0x4d, g: 0xb6, b: 0xff }; // #4db6ff bright sky blue
const COLOR_NIGHT_LIGHT = { r: 0x0a, g: 0x12, b: 0x25 }; // #0a1225 dark navy
const COLOR_DAY_LIGHT = { r: 0x6a, g: 0xc8, b: 0xff }; // #6ac8ff light sky blue
```

Also update the comment on line 14 from "bright purple" to "bright blue".

- [ ] **Step 2: Fix ActivityDial.jsx hardcoded colors**

Search the file for:

- `stroke="#a5b4fc"` (purple-ish) → replace with `stroke="var(--app-primary)"` or a blue equivalent like `"#4a88b8"`
- Any `#6b3fa0`, `#2d1b69`, `#1a1a24` in day/night background gradients → replace with navy blue equivalents from the theme (`#080d1e`, `#0a1e3a`, `#0f2848`)
- `SEVERITY_COLORS` if present → update to match new accent colors

- [ ] **Step 3: Fix ActivityDial.css**

Search for any purple gradients or colors and replace with blue equivalents.

- [ ] **Step 4: Verify the activity dial renders correctly**

Run: `cd frontend && npm run dev`
Open the child dashboard with the activity dial visible. Confirm: atmosphere ring gradient is blue (not purple), all activity arcs use correct accent colors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/dial-utils.js frontend/src/components/ActivityDial.jsx frontend/src/components/ActivityDial.css
git commit -m "feat(design-system): update activity dial colors purple → blue"
```

---

### Task 8: Gradient Header Band

**Files:**

- Modify: `frontend/src/index.css` — add header band CSS
- Modify: `frontend/src/components/AppShell.jsx` — update header rendering

- [ ] **Step 1: Add header band CSS to index.css**

Add after the existing header styles (search for `.ant-shell-header` or the header-related section):

```css
.ant-shell-header-band {
  padding: var(--space-xl) var(--space-xl) var(--space-lg);
  background: var(--header-band-bg);
  border-bottom: 1px solid var(--app-header-border);
}

:root {
  --header-band-bg: linear-gradient(135deg, #0a1e3a, #0f2848, #0a1e3a);
}

:root[data-theme="light"] {
  --header-band-bg: linear-gradient(135deg, #d0e8ff, #e0f0ff, #d0e8ff);
}

.ant-shell-header-band__eyebrow {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--app-primary);
  margin-bottom: var(--space-xs);
}

.ant-shell-header-band__title {
  font-size: 22px;
  font-weight: 800;
  color: var(--app-text-primary);
  line-height: 1.2;
  margin: 0;
}

.ant-shell-header-band__subtitle {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin-top: var(--space-xs);
}
```

- [ ] **Step 2: Update AppShell header to render as gradient band**

In `AppShell.jsx`, find the header section that renders the eyebrow + title (the section with `pageMeta`). Wrap it in a `div` with className `ant-shell-header-band` and apply the new CSS classes to the eyebrow, title, and subtitle elements.

The existing `pageMeta` mapping already returns `{ eyebrow, title }` per page type, and pages that opt out return `null` — this logic stays the same. Just update the rendered markup to use the new band classes.

- [ ] **Step 3: Verify header band appears on pages**

Run: `cd frontend && npm run dev`
Navigate to a list page, a form page, and a report page. Confirm: gradient band appears below the nav with colored eyebrow + large title. Dashboard pages (where eyebrow/title are null) should NOT show the band.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css frontend/src/components/AppShell.jsx
git commit -m "feat(design-system): add gradient header band below nav"
```

---

### Task 9: Background Mode Classes

**Files:**

- Modify: `frontend/src/index.css` — add background mode CSS

- [ ] **Step 1: Add background mode CSS classes**

Add to `index.css`:

```css
/* Background modes */
.bg-solid {
  background: var(--app-bg-start) !important;
}

.bg-image {
  position: relative;
}

.bg-image::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image: var(--bg-image-url);
  background-size: cover;
  background-position: center;
  filter: blur(20px);
  transform: scale(1.1);
}
```

The default gradient background is already applied via the existing `body` / `html` background styles — no `.bg-gradient` class needed since it's the default.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(design-system): add background mode CSS classes (solid, blurred-image)"
```

---

### Task 10: Search & Destroy Remaining Color References

**Files:**

- Modify: any file still containing hardcoded old colors

- [ ] **Step 1: Search for ALL remaining hardcoded old colors**

Run a comprehensive search from project root. This pattern covers all known old purple values, old accent colors, and dial-specific purples:

```bash
grep -rn '#a78bfa\|#7c3aed\|#c4b5fd\|#6d28d9\|#4c1d95\|#818cf8\|#8b5cf6\|#a5b4fc\|#6b3fa0\|#2d1b69\|rgba(167\|rgba(139\|rgba(109\|rgba(124\|rgba(196\|rgba(99' frontend/src/ --include='*.jsx' --include='*.js' --include='*.css'
```

Also search for old accent colors used inline (not all need changing, but verify):

```bash
grep -rn '#38bdf8\|#5cdb8b\|#69b1ff\|#ffd666\|#ff7875\|#1890ff' frontend/src/ --include='*.jsx' --include='*.js'
```

For each match found:

- If it's in `index.css` → should already be fixed by Tasks 2-3; if not, fix now
- If it's a JSX/JS file → replace with appropriate `var(--app-*)` or `var(--accent-*)` reference
- For SVG attributes that can't use `var()` → use `getComputedStyle` helper or `style={{ fill: "var(...)" }}`

- [ ] **Step 2: Full visual walkthrough**

Run: `cd frontend && npm run dev`
Navigate through every page type: dashboard-home, child dashboard, settings, list pages, form pages, timeline, reports, insights, topic pages. Check both light and dark themes. Look for any remaining purple tints.

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src/
git commit -m "feat(design-system): remove remaining purple color references"
```

---

### Task 11: Build and Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run production build**

```bash
cd frontend && npm run build
```

Confirm: no build errors, output in `babybuddy/static/babybuddy/ant/`.

- [ ] **Step 2: Run prettier**

```bash
npx prettier --write frontend/src/
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(design-system): production build and formatting"
```

- [ ] **Step 4: Push**

```bash
git push
```
