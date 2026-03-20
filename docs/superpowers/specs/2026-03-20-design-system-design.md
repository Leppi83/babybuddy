# BabyBuddy Design System

**Date:** 2026-03-20
**Status:** Approved

## Summary

A unified design system for BabyBuddy that replaces the current inconsistent purple theme with a blue-based palette matching the app icon. Introduces a shifting day/night theme, consistent spacing tokens, a gradient page header band, glass cards with accent borders, and background image support.

## Design Decisions

### 1. Color Palette — Shifting Blue

The primary color shifts between themes: warmer/brighter in light (day) mode, cooler/deeper in dark (night) mode.

| Token           | Light                       | Dark                   |
| --------------- | --------------------------- | ---------------------- |
| Primary         | `#4db6ff` (bright sky blue) | `#2a5f96` (deep ocean) |
| Page background | `#eef6ff`                   | `#080d1e`              |
| Card background | `#ffffff`                   | `rgba(18,30,55,0.95)`  |
| Card border     | `#c0ddf5`                   | `#1a3050`              |
| Text primary    | `#1a7ab5`                   | `#4a88b8`              |
| Text secondary  | `#5580a0`                   | `#506a85`              |
| Button fill     | `#4db6ff`                   | `#2a5f96`              |

### 2. Activity Accent Colors

Each activity type has a distinct accent color used for card left borders. Accents dim ~30% in the dark theme for eye comfort.

| Activity   | Light Color               | Dark Color (dimmed) |
| ---------- | ------------------------- | ------------------- |
| Diaper     | `#ff6b8b` (coral pink)    | `#cc5570`           |
| Feedings   | `#34d399` (emerald green) | `#28a67a`           |
| Pumpings   | `#c084fc` (lavender)      | `#9a68cc`           |
| Sleep      | `#fbbf24` (amber)         | `#c49820`           |
| Tummy Time | `#ff66ff` (fuchsia)       | `#cc50cc`           |

**Breaking visual change:** Feedings was previously blue (`#38bdf8`), now green (`#34d399`) to avoid confusion with the blue primary theme. Tummy time was previously green (`#34d399`), now fuchsia (`#ff66ff`). This is an intentional swap — users will see colors change for these two activity types.

### 3. Theme Switching

- Follows **OS dark/light mode preference** (`prefers-color-scheme`) by default
- **Manual override** available via toggle in the nav, persisted in `localStorage`
- Theme is stored as `data-theme` attribute on `<html>` (`"light"` or `"dark"`) — **matches existing convention**
- All shifting values defined as CSS custom properties in `:root` (dark default) and `:root[data-theme="light"]`
- Ant Design ConfigProvider tokens mirror the CSS variables per theme
- `color-scheme` CSS property set to `light` or `dark` per theme (affects native scrollbars, form controls)

### 4. Page Header Band

Every page gets a **full-width gradient band** below the nav containing:

- **Eyebrow**: colored, uppercase, small text (e.g., "Reports", "Overview")
- **Title**: large bold heading (e.g., "Sleep Report")
- **Subtitle** (optional): muted smaller text (e.g., "Last 7 days — Emma")

The band uses a gradient background that shifts with the theme:

- Light: `linear-gradient(135deg, #d0e8ff, #e0f0ff, #d0e8ff)`
- Dark: `linear-gradient(135deg, #0a1e3a, #0f2848, #0a1e3a)`

Pages that render their own prominent heading (e.g., dashboard-home) can opt out by setting eyebrow and title to `null`.

### 5. Card System

All cards share the **same glass background** per theme. Activity type is indicated solely by a **colored left border** (3px).

- Border radius: `18px` (constant across themes — matches existing value)
- Card padding: `16px` (using `--space-lg` token)
- Glass effect: `backdrop-filter: blur(14px)` on both themes
- No per-card-type background variations — consistency over expression

Card CSS classes remain: `.ant-hero-card`, `.ant-section-card`, `.ant-dashboard-card`, `.ant-summary-card` — all inherit the same glass background.

### 6. Background Modes

Three background modes available, set per page type by the developer via a CSS class on the page wrapper element inside `.ant-shell-content`:

| Mode            | CSS Class                | Description                                                                                                                                                    |
| --------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gradient`      | `.bg-gradient` (default) | Subtle gradient matching the theme. Applied by default, no class needed.                                                                                       |
| `blurred-image` | `.bg-image`              | Full-page wallpaper image with `filter: blur(20px)` + `transform: scale(1.1)` on a `::before` pseudo-element. Image URL set via `--bg-image-url` CSS variable. |
| `solid`         | `.bg-solid`              | Single flat color from `--app-bg-start` token.                                                                                                                 |

Background images are applied at **page level only** (behind all content). Cards always use glass backgrounds on top.

### 7. Spacing System — 4px Base Grid

All spacing uses named CSS variables. No magic numbers anywhere.

| Token         | Value  | Usage                                           |
| ------------- | ------ | ----------------------------------------------- |
| `--space-xs`  | `4px`  | Tight inline gaps, icon padding                 |
| `--space-sm`  | `8px`  | Between related items, compact card padding     |
| `--space-md`  | `12px` | Card internal padding, form field gaps          |
| `--space-lg`  | `16px` | Card-to-card gaps, section padding, grid gutter |
| `--space-xl`  | `24px` | Section-to-section, page side padding           |
| `--space-2xl` | `32px` | Major layout gaps, header band padding          |
| `--space-3xl` | `48px` | Top-level page padding, hero sections           |

Mobile adjustments: `--space-xl` and above may reduce by one step on screens < 576px.

### 8. Navigation — Refresh Styling

Keep the current structure:

- **Desktop**: fixed 280px sidebar (collapsible to 88px)
- **Mobile**: bottom bar (56px) + drawer

Restyle to match blue palette:

- Nav background aligns with theme tokens (`--app-sider-bg`)
- Active state uses `--app-primary` (shifts with theme)
- Brand color: `#4db6ff` (always, does not shift)
- Icon colors follow `--app-text-secondary` token
- Theme toggle integrated in nav

### 9. What Shifts vs What Stays

| Category                      | Shifts with Theme | Stays Constant |
| ----------------------------- | :---------------: | :------------: |
| Primary color                 |        yes        |                |
| Page background               |        yes        |                |
| Card background               |        yes        |                |
| Text colors                   |        yes        |                |
| Borders                       |        yes        |                |
| Button fills                  |        yes        |                |
| Activity accents (brightness) |        yes        |                |
| Shadows / elevation           |        yes        |                |
| `color-scheme` property       |        yes        |                |
| Accent border hue             |                   |      yes       |
| Border radius (18px)          |                   |      yes       |
| Spacing tokens                |                   |      yes       |
| Font family (Nunito)          |                   |      yes       |
| Font size scale               |                   |      yes       |

## Implementation Architecture

### CSS Custom Properties — Complete Token List

All design tokens live in `index.css`. The existing `--app-*` variable naming convention is preserved. All ~40 existing purple-tinted values are replaced with blue equivalents.

**Constant tokens (`:root`):**

```css
:root {
  font-family: "Nunito", "SF Pro Display", "Segoe UI", sans-serif;

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

  /* Typography (unchanged from current) */
  --font-title-size: 14px;
  --font-title-weight: 600;
  --font-body-size: 12px;
  --font-body-weight: 400;
  --font-chart-size: 10px;
  --font-chart-weight: 400;
  --font-caption-size: 14px;
  --font-caption-weight: 500;
}
```

**Dark theme (`:root` default — dark-first like current codebase):**

```css
:root {
  color-scheme: dark;
  --app-primary: #2a5f96;
  --app-text-primary: #c0d8ee;
  --app-text-secondary: #506a85;
  --app-bg-start: #080d1e;
  --app-bg-mid: #0a1225;
  --app-bg-end: #080d1e;
  --app-bg-radial: rgba(42, 95, 150, 0.14);
  --app-sider-bg: rgba(8, 14, 30, 0.94);
  --app-sider-border: rgba(42, 95, 150, 0.18);
  --app-header-bg: rgba(6, 10, 24, 0.72);
  --app-header-border: rgba(42, 95, 150, 0.14);
  --app-card-border: #1a3050;
  --app-card-bg-start: rgba(18, 30, 55, 0.95);
  --app-card-bg-end: rgba(10, 18, 36, 0.96);
  --app-card-glass-bg: rgba(18, 30, 55, 0.55);
  --app-shell-shadow: rgba(6, 10, 24, 0.35);
  --app-list-bg: rgba(8, 14, 30, 0.58);
  --app-list-item-text: #c0d8ee;
  --app-list-item-active: rgba(42, 95, 150, 0.12);
  --app-link: #4a88b8;
  --app-link-hover: #6aa8d8;
  --app-timeline-slot-bg: rgba(14, 24, 45, 0.65);
  --app-timeline-axis: #2a5f96;
  --app-native-input-bg: rgba(8, 14, 30, 0.72);
  --app-native-input-border: rgba(42, 95, 150, 0.28);
  --app-event-card-bg: rgba(8, 14, 30, 0.42);
  --app-event-card-border: rgba(42, 95, 150, 0.14);
  --app-row-a: rgba(255, 255, 255, 0.02);
  --app-row-b: rgba(42, 95, 150, 0.04);
  --app-row-hover: rgba(42, 95, 150, 0.08);
  --sleep-week-grid-color: rgba(42, 95, 150, 0.18);
  --sleep-week-axis-color: rgba(160, 195, 230, 0.72);
  --sleep-week-day-color: rgba(180, 210, 240, 0.82);
  --night-sleep-card-bg: linear-gradient(
    180deg,
    rgba(6, 10, 24, 0.96),
    rgba(14, 24, 45, 0.94)
  );
  --night-sleep-track: rgba(42, 95, 150, 0.18);
  --night-sleep-sleep: #c49820;
  --night-sleep-awake: rgba(42, 95, 150, 0.6);
  --night-sleep-feeding: #28a67a;
  --night-sleep-diaper: #cc5570;
  --night-sleep-marker-shadow: rgba(6, 10, 24, 0.24);

  /* Activity accents — dimmed for dark theme */
  --accent-diaper: #cc5570;
  --accent-feedings: #28a67a;
  --accent-pumpings: #9a68cc;
  --accent-sleep: #c49820;
  --accent-tummytime: #cc50cc;
}
```

**Light theme (`:root[data-theme="light"]`):**

```css
:root[data-theme="light"] {
  color-scheme: light;
  --app-primary: #4db6ff;
  --app-text-primary: #1a5580;
  --app-text-secondary: #5580a0;
  --app-bg-start: #eef6ff;
  --app-bg-mid: #e4f0ff;
  --app-bg-end: #eef6ff;
  --app-bg-radial: rgba(77, 182, 255, 0.12);
  --app-sider-bg: rgba(255, 255, 255, 0.94);
  --app-sider-border: rgba(77, 182, 255, 0.18);
  --app-header-bg: rgba(255, 255, 255, 0.88);
  --app-header-border: rgba(77, 182, 255, 0.25);
  --app-card-border: #c0ddf5;
  --app-card-bg-start: rgba(255, 255, 255, 0.97);
  --app-card-bg-end: rgba(240, 248, 255, 0.95);
  --app-card-glass-bg: rgba(255, 255, 255, 0.72);
  --app-shell-shadow: rgba(30, 100, 180, 0.1);
  --app-list-bg: rgba(255, 255, 255, 0.9);
  --app-list-item-text: #1a5580;
  --app-list-item-active: rgba(77, 182, 255, 0.1);
  --app-link: #1a7ab5;
  --app-link-hover: #0d5a8a;
  --app-timeline-slot-bg: rgba(224, 240, 255, 0.9);
  --app-timeline-axis: #4db6ff;
  --app-native-input-bg: rgba(255, 255, 255, 0.98);
  --app-native-input-border: rgba(77, 182, 255, 0.35);
  --app-event-card-bg: rgba(248, 252, 255, 0.95);
  --app-event-card-border: rgba(77, 182, 255, 0.2);
  --app-row-a: rgba(77, 182, 255, 0.04);
  --app-row-b: rgba(77, 182, 255, 0.08);
  --app-row-hover: rgba(77, 182, 255, 0.12);
  --sleep-week-grid-color: rgba(30, 100, 180, 0.2);
  --sleep-week-axis-color: rgba(26, 85, 128, 0.75);
  --sleep-week-day-color: rgba(20, 60, 100, 0.88);
  --night-sleep-card-bg: linear-gradient(180deg, #ffffff, #f0f8ff);
  --night-sleep-track: rgba(77, 182, 255, 0.2);
  --night-sleep-sleep: #d97706;
  --night-sleep-awake: rgba(30, 100, 180, 0.42);
  --night-sleep-feeding: #059669;
  --night-sleep-diaper: #e11d48;
  --night-sleep-marker-shadow: rgba(77, 182, 255, 0.18);

  /* Activity accents — full brightness for light theme */
  --accent-diaper: #ff6b8b;
  --accent-feedings: #34d399;
  --accent-pumpings: #c084fc;
  --accent-sleep: #fbbf24;
  --accent-tummytime: #ff66ff;
}
```

### Ant Design ConfigProvider

`App.jsx` ConfigProvider reads the active theme and passes matching tokens:

```jsx
const themeTokens =
  effectiveTheme === "light"
    ? {
        colorPrimary: "#4db6ff",
        colorBgBase: "#eef6ff",
        colorBgContainer: "#ffffff",
        colorBorder: "#c0ddf5",
        borderRadius: 18,
      }
    : {
        colorPrimary: "#2a5f96",
        colorBgBase: "#080d1e",
        colorBgContainer: "rgba(18,30,55,0.95)",
        colorBorder: "#1a3050",
        borderRadius: 18,
      };
```

Additional Ant tokens derived automatically from `colorPrimary` by Ant's theme algorithm: `colorText`, `colorTextSecondary`, `colorBgElevated`, `colorBgLayout`. No manual override needed for these.

### Theme Detection

```javascript
// 1. Check localStorage for manual override ('theme-preference': 'light' | 'dark' | 'auto')
// 2. If 'auto' or absent, use matchMedia('(prefers-color-scheme: dark)')
// 3. Set data-theme attribute on <html> to 'light' or 'dark'
// 4. Set color-scheme CSS property accordingly
// 5. Listen for OS prefers-color-scheme changes; auto-switch unless manually overridden
// 6. Update Ant ConfigProvider theme algorithm (defaultAlgorithm vs darkAlgorithm)
```

### SECTION_META and ACTIVITY_COLORS Update

In `app-utils.jsx`, update both color maps:

```javascript
export const SECTION_META = {
  quick_entry: { color: "var(--app-primary)" },
  diaper: { color: "var(--accent-diaper)" },
  feedings: { color: "var(--accent-feedings)" },
  pumpings: { color: "var(--accent-pumpings)" },
  sleep: { color: "var(--accent-sleep)" },
  tummytime: { color: "var(--accent-tummytime)" },
};

// Also update ACTIVITY_COLORS (used by ActivityDial) — note singular key names
export const ACTIVITY_COLORS = {
  feeding: "var(--accent-feedings)",
  pumping: "var(--accent-pumpings)",
  sleep: "var(--accent-sleep)",
  diaper: "var(--accent-diaper)",
  tummytime: "var(--accent-tummytime)",
};
```

**Note:** `var()` references work in inline styles and CSS. For canvas/SVG contexts where CSS vars don't work, resolve them via `getComputedStyle(document.documentElement).getPropertyValue('--accent-feedings')`.

### Interactive State Tokens

Hover, active, and focus states for custom elements (not handled by Ant Design):

```css
:root {
  /* Hover: lighten primary by ~15% */
  --app-primary-hover: #3a7cc0; /* dark */
  --app-primary-active: #1e4f7a; /* dark */
}
:root[data-theme="light"] {
  --app-primary-hover: #2a9df4;
  --app-primary-active: #1a85d0;
}
```

Nav items, card hover, and custom buttons reference these tokens instead of hardcoded values.

## Variable Naming Convention

The existing `--app-*` prefix is preserved throughout. New tokens follow the same convention:

| Prefix            | Category                                                       |
| ----------------- | -------------------------------------------------------------- |
| `--app-*`         | Theme-shifting UI tokens (backgrounds, borders, text, primary) |
| `--accent-*`      | Activity accent colors (shift brightness per theme)            |
| `--space-*`       | Spacing tokens (constant)                                      |
| `--radius-*`      | Border radius tokens (constant)                                |
| `--font-*`        | Typography tokens (constant)                                   |
| `--night-sleep-*` | Night sleep visualization specific (shift per theme)           |
| `--sleep-week-*`  | Sleep week chart specific (shift per theme)                    |

## Files to Modify

| File                                       | Changes                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/index.css`                   | Full rewrite of color variables: replace all ~40 purple-tinted `--app-*` values with blue equivalents in both `:root` (dark) and `[data-theme="light"]` blocks. Add spacing tokens, radius tokens. Update card/header gradient styles. This is the largest single change. |
| `frontend/src/App.jsx`                     | Update ConfigProvider tokens from purple to blue. Update theme detection to use OS preference with localStorage override.                                                                                                                                                 |
| `frontend/src/components/AppShell.jsx`     | Restyle nav to blue palette (replace any inline purple colors). Add gradient header band component. Update theme toggle to support auto/light/dark.                                                                                                                       |
| `frontend/src/lib/app-utils.jsx`           | Update `SECTION_META` colors to use CSS var references. Update `ACTIVITY_COLORS` similarly.                                                                                                                                                                               |
| `frontend/src/pages/DashboardPages.jsx`    | Replace inline purple color values with CSS var references.                                                                                                                                                                                                               |
| `frontend/src/pages/GeneralPages.jsx`      | Replace inline purple color values with CSS var references.                                                                                                                                                                                                               |
| `frontend/src/components/ActivityDial.jsx` | Update day/night colors to match new blue palette. Resolve CSS vars for canvas contexts.                                                                                                                                                                                  |
| `frontend/src/components/ActivityDial.css` | Update gradient colors from purple to blue.                                                                                                                                                                                                                               |

## Out of Scope

- Removing tummy time as a feature (just recolored)
- Changing page routing or bootstrap pattern
- Changing form system or field controls
- Backend/Django changes
- i18n changes
