# BabyBuddy Feature Roadmap

**Created:** 2026-03-28
**Status:** Living document — update as features are specced and built

---

## Priority Features (P1)

These three features are planned for immediate implementation, in this order:

### 1. U-Examinations (Vorsorge)
German pediatric check-up questionnaires (U1–U9 + J1) that parents can fill out and save per child.

- Structured questionnaires following the official German Vorsorgeheft schedule
- Questions cover developmental milestones, reflexes, measurements, parental observations
- Results stored per child, per examination type, with date
- View history of completed examinations
- Integrates with PDF Export (backlog) and Push Notifications (next feature)
- **Spec:** TBD
- **Plan:** TBD

---

### 2. Push Notifications
Complete the already-partially-built push notification infrastructure to deliver actionable alerts to iOS/browser.

**Existing:** `PushSubscription` model + migration, `send_push_notification()`, API subscribe/unsubscribe endpoints, `push-utils.js` frontend utilities, Settings UI strings. Service worker currently disabled.

**What remains:**
- Re-enable and harden the service worker (`sw.js`)
- Wire notification triggers: sleep timer reminders, feeding interval alerts, U-exam due date reminders
- Settings UI to configure which notifications are enabled and thresholds
- Test on iOS Safari (Web Push requires iOS 16.4+)
- **Spec:** TBD
- **Plan:** TBD

---

### 4. Dashboard Recent Entries Table
Show the last 3 entries per activity type (diaper, sleep, feeding, pumping, tummy time, notes) directly on the child dashboard, with inline edit and delete.

- One collapsible table per activity section on the dashboard
- Shows timestamp, key fields (duration/amount/type), edit + delete actions
- Edit opens the existing form page; delete shows confirmation
- Keeps the dashboard as the primary control center without navigating away
- **Spec:** TBD
- **Plan:** TBD

---

## Backlog Features (P2)

These are confirmed for future implementation but not yet planned in detail.

### 3. Child Profile & Notebook
A comprehensive profile page per child combining visual identity, growth tracking, and life milestones.

- **Graphical silhouette**: Outlined child illustration (SVG) as a visual identity anchor on the profile page
- **Measurements over time**: Height, weight, head circumference — logged with date, shown as line charts
- **Milestones**: Dated entries for first word, first walk, first turn, first tooth, etc. — freeform + preset types
- **Sizes**: Clothing size (EU/DE system) and shoe size history with dates — shown as timeline
- Replaces/extends the current child detail page

---

### A. WHO Growth Percentile Charts
Overlay WHO standard p3, p15, p50, p85, p97 percentile curves on height and weight charts.

- Percentile data already exists in the DB (`HeightPercentile`, `WeightPercentile` models)
- Show child's measurements plotted against the curves
- Indicate which percentile band the child currently falls in
- Printable view for doctor visits (ties into PDF Export)

---

### B. Health Journal
A simple dated log for health events.

- **Temperature**: Log with timestamp, flag fever (>38°C), show trend
- **Medications**: Name, dose, frequency, start/end date
- **Illnesses**: Free-text notes with date range
- **Vaccinations**: Name, date, batch number — cross-references U-exam records where applicable

---

### D. Photo Milestones / Memory Book
Attach photos to milestone entries to build a visual timeline.

- Photo upload per milestone (uses existing `imagekit`/`storages` infrastructure)
- Timeline view: photos sorted by date with child's age overlay
- Optional PDF export as a printable memory book

---

### E. Age-Based Sleep Schedule Suggestions
Non-intrusive guide overlay on the sleep dashboard card.

- Based on child's current age (in weeks/months), suggest: number of naps, wake window length, total sleep target
- Reference: Takoda/Ferber/AAP guidelines
- Displayed as a subtle hint, not a prescription

---

### G. Doctor Visit PDF Export
Generate a portable PDF summary to bring to the pediatrician.

- Includes: growth charts (with percentile overlay), completed U-exam results, vaccination log, recent health journal entries
- Date range selector
- Rendered server-side (Django → PDF library, e.g. `weasyprint` or `reportlab`)

---

## Work Streams

| Stream | Features | Priority |
|--------|----------|----------|
| **Medical / Health** | U-Examinations (1), Health Journal (B), PDF Export (G) | P1 + backlog |
| **Infrastructure** | Push Notifications (2) | P1 |
| **Dashboard** | Recent Entries (4), Sleep Suggestions (E) | P1 + backlog |
| **Child Profile** | Notebook (3), WHO Charts (A), Photo Milestones (D) | backlog |

---

## Implementation Order

1. **U-Examinations** → spec + plan in progress
2. **Push Notifications** → spec + plan next
3. **Dashboard Recent Entries** → spec + plan after
4. Backlog features → planned in future sessions
