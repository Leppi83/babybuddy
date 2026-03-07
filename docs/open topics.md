plan from Gemini:
hey, this is the plan with my project. check how you would do this.
Based on my analysis, you have made significant progress in migrating from shadcn to Ant Design. The infrastructure for Ant Design is largely in place, and many core pages have already been migrated to use Ant Design components.

Here is a breakdown of what is missing to complete the migration:

### Current State

- **Infrastructure:** React + Ant Design + Vite is set up and configured with a dark theme in `App.jsx`.
- **Components:** Shadcn components have already been removed from `frontend/src/components/ui/`.
- **Pages Migrated:** `DashboardHomePage`, `ListPage`, `AntFormPage`, `WelcomePage`, `DeviceAccessPage`, `ChildDetailPage`, `TagDetailPage`, `TimerDetailPage`, `TimelinePage`, `ReportListPage`, `ReportDetailPage`, and `ChildDashboardPage` are all using Ant Design.
- **Bridge:** The `bootstrap` data pattern is used to pass data from Django to React, and `ant_app.html` / `ant_base.html` templates are present.

### What is Missing

#### 1. Authentication Flow Migration (Phase 5)

The migration plan mentions migrating login and password reset flows. Currently, these likely still reside in legacy Django templates (`registration/`).

- **Action:** Create Ant Design equivalents for `Login`, `Password Reset`, and `Password Change` pages.
- **Action:** Update Django views to serve the Ant-based frontend for these routes.

#### 2. Settings & Navigation Refinement (Phase 3)

While some settings pages exist in React, the plan highlights moving dashboard visibility, order, and hidden-section controls into Ant forms.

- **Action:** Review `SettingsPage` in `DashboardPages.jsx` to ensure all functionality from the legacy Django settings is fully parity-matched.
- **Action:** Ensure the `AppShell` (Navbar/Sider) fully replaces legacy navigation behavior across all app states.

#### 3. Cleanup of Legacy Assets

To fully "complete" the migration, legacy assets that are no longer needed should be removed.

- **Action:** Remove legacy Bootstrap/jQuery dependencies from `gulpfile.js` and `package.json` once all pages are migrated.
- **Action:** Delete old Django templates in `core/templates/`, `dashboard/templates/`, and `reports/templates/` that have been replaced by the Ant frontend.
- **Action:** Remove `gulpfile.js` and related build steps if Vite now handles all asset compilation.

#### 4. Feature Parity & i18n Verification

- **Action:** Verify all "Add/Edit" flows (Forms) work correctly for all models (Feeding, Sleep, etc.) through the generic `AntFormPage`.
- **Action:** Ensure all strings are correctly passed through the `bootstrap.strings` object to maintain translation support.

### Proposed Next Steps

1.  **Migrate Auth Pages:** Start with the Login page to ensure the entry point to the app is consistent.
2.  **Parity Check on Forms:** Test the `AntFormPage` with complex fields (e.g., duration pickers, specific select types) to ensure `AntFieldControl` handles them.
3.  **Final Cleanup:** Once the Auth and Settings are verified, begin removing the legacy templates and the Gulp-based build pipeline.

Would you like me to focus on a specific area next, such as the Auth flow migration or auditing the forms for feature parity?

new fixes:

- ensure mobile view fits to the screen
