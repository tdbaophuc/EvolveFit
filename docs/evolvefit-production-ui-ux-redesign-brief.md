# EvolveFit Production UI/UX Redesign Brief

Created: 2026-09-29  
Audience: Codex / implementation agent  
Scope: Rebuild the EvolveFit webapp interface into a production-quality UX/UI while preserving existing API behavior and product capabilities.

## 1. Problem Statement

The current UI exposes too many functions at the same time. Many features are laid out directly on pages even when they are secondary, advanced, rare, admin-only, or only relevant after a user action. This creates cognitive overload, weak visual hierarchy, and an experience that feels like an internal test panel rather than a production fitness app.

The redesign must convert EvolveFit from a feature-dump interface into a task-oriented product:

- Show the next most useful action first.
- Hide secondary controls until the user needs them.
- Group features by workflow, not by backend/API category.
- Preserve all existing functionality, but expose it through progressive disclosure.
- Build a UI that feels production-ready on mobile and desktop.

## 2. Product Context

EvolveFit is a local-first fitness webapp with these major domains:

### Regular user domains

1. Onboarding and personal profile
2. Auth, account lifecycle, local/cloud sync
3. Today dashboard
4. Hydration tracking
5. Supplement/creatine tracking
6. Routine builder
7. Live workout session
8. Exercise library and marketplace
9. Routine template marketplace
10. Coach / workout intelligence
11. Progress, body metrics, achievements, leaderboard opt-in
12. Notifications and quiet hours
13. Import/export/delete data and privacy controls
14. Health integration foundation

### Admin/operations domains

1. Admin overview
2. Marketplace exercise governance
3. Routine template governance
4. Feedback/report moderation summary
5. Support user lookup with redaction
6. Role management
7. Audit logs
8. Governance health and runbook links

The API contract already contains endpoints for these areas. Do not remove capabilities; redesign how users discover and operate them.

## 3. UX North Star

EvolveFit should feel like a personal training command center, not an API dashboard.

Every screen should answer:

1. Where am I?
2. What is my current status?
3. What should I do next?
4. What can I safely ignore until later?
5. If something fails, how do I recover?

## 4. Primary Design Principle: Progressive Disclosure

The biggest required change: stop showing all functions at once.

### Surface immediately

Only show controls that are used daily or required for the current task:

- Today status
- Start today's workout
- Quick log water
- Mark supplement/creatine taken
- Continue active workout
- View next planned workout
- Resolve urgent sync/auth/notification issues

### Hide behind user intent

Move these behind buttons, drawers, modals, accordions, tabs, command sheets, or dedicated settings/admin routes:

- Create/edit/delete routines
- Advanced routine builder details
- Exercise filters beyond the top 3-4 common filters
- Marketplace metadata such as license, media source, version, caution text
- Import/export/delete account
- Notification advanced schedule fields
- Sync diagnostics and conflict details
- Coach explanation internals
- Admin role management
- Audit logs
- Governance health details
- Raw observability/logging content

### Recommended disclosure patterns

| Use case | UI pattern |
|---|---|
| Quick logging water/supplement | Inline compact button group or bottom sheet on mobile |
| Create/edit item | Modal or side drawer with focused form |
| Advanced filters | Collapsible filter drawer; show active filter chips after applying |
| Marketplace item detail | Detail page or drawer; list page only shows summary cards |
| Routine day edit | Expandable day cards; editing controls hidden until Edit mode |
| Live workout set entry | Focused stepper/table for current exercise; queue hidden/collapsed |
| Destructive actions | Overflow menu + confirmation dialog or undo snackbar |
| Import/export/delete data | Settings > Data & privacy section, not dashboard |
| Admin audit/governance details | Admin-only tabs/routes with dense table layout |

## 5. Information Architecture

Use workflow-based navigation. Suggested top-level app structure:

```text
/app
  /today
  /workout
  /routines
  /library
  /progress
  /coach
  /settings
/admin
  /overview
  /content/exercises
  /content/templates
  /support
  /roles
  /audit
  /governance
```

If the current app uses a different router structure, keep the existing routes if necessary, but make the navigation match this mental model.

### Main user navigation

Primary nav should contain only:

- Today
- Workout
- Routines
- Library
- Progress
- Settings

Coach can be either a primary nav item or a card inside Today/Progress depending on current implementation. If space is limited, place Coach in More or as a contextual card.

### Admin navigation

Admin should be visually and structurally separate from the normal user app:

- Different route group: `/admin`
- Clear admin header/status
- Role-aware nav items
- No secrets, service-role keys, raw tokens, or unredacted user data
- Support/admin workflows must not leak into the normal user dashboard

## 6. Page-Level Redesign Requirements

## 6.1 Today Dashboard

### Goal

Help the user know what matters today and complete the next action fast.

### Must show

- Greeting/status summary
- Today's workout card
- Hydration progress card
- Supplement/creatine status card
- Important insight or coach nudge, if available
- Sync/auth/offline state only if relevant

### Must hide

- Full routine editor
- Long workout history
- Full supplement configuration
- Full hydration logs
- Import/export/delete data
- Raw debug/sync info
- Marketplace browsing
- Admin widgets

### Layout

Desktop:

- Top summary row: Today's status + primary CTA
- 2-column card grid: workout, hydration, supplements, insight
- Secondary section below: recent activity or progress preview

Mobile:

- Single-column cards
- Sticky bottom primary action if there is an active/today workout
- Quick log buttons reachable without scrolling too far

### Primary actions

- Start workout / Continue workout
- +250ml, +500ml water
- Mark creatine/supplement taken

### Secondary actions

- Edit hydration log
- Configure reminders
- View history
- Manage supplements

Secondary actions should be in card footers, overflow menus, or drawers.

## 6.2 Onboarding/Profile

### Goal

Collect only enough information to personalize the first useful experience.

### Recommended flow

1. Goal: strength, muscle, fat loss, health
2. Experience level
3. Days per week
4. Available equipment
5. Hydration target
6. Supplements/reminders optional
7. Review summary and start

### UX rules

- Use one decision per step.
- Show progress indicator.
- Allow skip for non-critical fields.
- Explain why sensitive/health data is requested.
- After completion, route to Today with next action.

## 6.3 Auth, Account, and Sync

### Goal

Make local-first behavior understandable and safe.

### Required states

- Guest/local mode
- Signed-in cloud sync mode
- Offline mode
- Sync pending
- Sync conflict/merge decision
- Session expired

### Merge conflict UX

When local data exists and cloud data exists, present a focused decision screen/dialog:

1. Keep local data
2. Replace with cloud data
3. Merge data

Each option must explain the consequence. Do not bury this in settings or a raw sync log.

## 6.4 Hydration

### Goal

Fast daily logging, simple progress, low-friction correction.

### Main screen

- Circular or linear progress toward daily goal
- Quick amount buttons: 250ml, 500ml, 750ml
- Drink type selector collapsed by default
- Today's logs collapsed under “Today’s history”

### Hidden/secondary controls

- Edit/delete log in row overflow menu
- Drink module/hydration factor details in advanced drawer
- Reminder schedule in settings or card drawer

## 6.5 Supplements / Creatine

### Goal

Help the user keep consistency without turning the dashboard into a medication admin table.

### Main screen/card

- Creatine/supplement status: Taken / Due / Skipped / Not configured
- One-tap “Mark taken”
- Next reminder time
- Weekly consistency preview

### Hidden controls

- Add/edit supplement
- Reminder hour/schedule hours
- Amount/unit editing
- Disable supplement

Use a drawer or settings detail page for these.

## 6.6 Routines

### Goal

Let users understand and manage their training plan without overwhelming them.

### Main routines page

- Current active routine summary
- Weekly schedule cards
- Button: Start next workout
- Button: Edit routine
- Marketplace/template recommendation card if no routine exists

### Routine editor

The editor must be a distinct mode or route. Do not show all editing controls in read mode.

Read mode:

- Days and exercises visible
- Sets/reps/rest summaries
- Start workout buttons

Edit mode:

- Add/remove/reorder exercises
- Edit sets/reps/rest
- Rename routine/day
- Delete routine/day/exercise

### Required pattern

- Use “View mode” by default.
- User clicks “Edit routine” to reveal builder controls.
- Destructive actions stay in overflow menus with confirmation.

## 6.7 Live Workout Session

### Goal

During a workout, the UI must be focused, fast, and low-distraction.

### Main live screen

- Session name/status/timer
- Current exercise
- Current/next set entry
- Previous target vs actual weight/reps
- Quick controls: complete set, rest timer, skip/park exercise
- Small queue preview, collapsed by default

### Avoid

- Full routine builder controls
- Marketplace browsing
- Progress dashboard widgets
- Large unrelated cards
- Admin/debug info

### Interaction rules

- Pause/resume/finish must be obvious but not too easy to hit accidentally.
- Finish session requires confirmation if incomplete sets exist.
- Reorder queue should be an explicit mode/drawer, not always visible.
- Rest timer should not steal the whole screen unless user opens it.

## 6.8 Exercise Library and Marketplace

### Goal

Help users find, understand, and add exercises.

### List page

- Search input
- Common filters visible: muscle group, equipment, difficulty
- Advanced filters hidden: movement pattern, tags, unilateral, source/license/status
- Result cards show: name, muscle group, equipment, difficulty, quick actions

### Detail page/drawer

Show:

- Cues
- Common mistakes
- Substitutions
- Cautions/contraindications
- Media URL/preview if available
- Source/license/version if relevant

### Actions

- Add to routine
- Clone to custom library
- View substitutions

These should be contextual buttons, not all permanently spread across the list page.

## 6.9 Routine Template Marketplace

### Goal

Help the user choose a plan based on fit, not browse a raw data table.

### List page

- Search
- Main filters: goal, days per week, equipment, experience
- Compatibility score shown as a badge/progress indicator
- Missing equipment warning surfaced clearly

### Detail page/drawer

- Weekly layout
- Day summaries
- Estimated minutes
- Warmup/cooldown
- Progression/deload notes
- Apply/preview/customize actions

### UX rules

- Preview before apply.
- Applying a template must explain whether it creates a copy or modifies an existing routine.
- Feedback accepted/rejected/bookmark should be secondary, not primary.

## 6.10 Coach / Workout Intelligence

### Goal

Make recommendations trustworthy without exposing raw internal logic everywhere.

### Main coach card

- Recommendation headline
- Reason summary in 1-2 sentences
- Confidence/guardrail status if useful
- Accept / reject / view details

### Details drawer

- Data used: recent volume, e1RM, RPE, missed workouts, readiness, history
- Rule-first explanation
- AI personalization note only if provider is configured
- Feedback text box after reject, not always visible

## 6.11 Progress Dashboard

### Goal

Show trends and achievements, not every metric at once.

### Main sections

- Overview cards: workout count, hydration streak, creatine consistency, volume trend
- Chart tabs: hydration, volume, body metrics, achievements
- Time range control: 7d / 30d / 90d

### UX rules

- Do not put every chart on one page at once.
- Use tabs or segmented controls.
- Empty states should recommend the next data-producing action.
- Leaderboards/social sharing are opt-in and should be hidden/off by default.

## 6.12 Notifications

### Goal

Let users configure reminders without confusion.

### Settings structure

- Notifications overview
- Hydration reminders
- Creatine/supplement reminders
- Quiet hours
- Browser push permission/status
- Test notification

### UX rules

- Explain browser permission state.
- If push is unavailable, show in-app fallback status.
- Quiet hours should be obvious and respected across reminder types.

## 6.13 Settings, Data, and Privacy

### Goal

Keep rare/high-risk actions discoverable but not mixed into daily workflows.

### Sections

- Profile
- Account
- Sync
- Notifications
- Health integrations
- Data & privacy
- About / diagnostics

### Data & privacy actions

- Export account data
- Import/restore data
- Export CSV
- Delete local data
- Delete account/server data

Destructive data actions must be separated, explained, and confirmed.

## 6.14 Admin Operations Dashboard

### Goal

Admin UI should support production governance, not look like a user feature page.

### Admin overview

Show summary metrics only:

- Marketplace exercises
- Published exercises
- Routine templates
- Pending feedback/reports
- Sync events
- Audit logs
- Governance health status

### Admin content management

Use dense but controlled table/list layouts:

- Search/filter toolbar
- Status chips
- Pagination
- Row action menu
- Create draft button
- Publish/archive actions behind confirmation

### Support user lookup

- Redacted personal data only
- Explain why fields are hidden
- Show feedback/report count if available
- No raw tokens/secrets

### Role management

- Super-admin only
- Grant/revoke role flow with confirmation
- Explain role scopes before mutation

### Audit logs

- Filter by action/resource/requestId
- Paginated table
- Detail drawer for one log
- No raw sensitive payloads

## 7. Visual Design System

Codex should either create or consolidate a small design system. Avoid one-off styling.

### Design direction

Recommended style: modern health/fitness SaaS.

- Calm, high-trust, energetic accents
- Clean cards, strong hierarchy, not gamified everywhere
- Mobile-first interaction density
- Dashboard clarity over decoration

### Color tokens

Define semantic tokens rather than random colors:

```css
--background
--foreground
--card
--card-foreground
--muted
--muted-foreground
--border
--primary
--primary-foreground
--secondary
--secondary-foreground
--success
--warning
--destructive
--destructive-foreground
--ring
```

Suggested palette direction:

- Background: near-white or very dark depending current theme support
- Primary: energetic green/teal suitable for fitness progress
- Secondary: cool blue for insight/coach/sync
- Success: green
- Warning: amber
- Destructive: red
- Neutral scale for borders/text/backgrounds

If dark mode exists, make tokens theme-aware. If not, implement a strong light theme first and keep token names ready for dark mode.

### Typography

- Use one UI sans family if already configured; otherwise use system stack or Inter-like font.
- Body: 16px / 24px
- Small text: no smaller than 12px, preferably 13-14px for metadata
- Avoid all-caps except small labels/badges
- Use tabular numbers for timers, metrics, and workout set tables if feasible

### Spacing

Use a 4/8px rhythm:

- 4px: tiny internal gaps
- 8px: compact gaps
- 12px: form label/help spacing
- 16px: card internal gaps
- 24px: card padding / section gaps
- 32px: large section gap
- 48-64px: page/hero gaps

### Radius and shadows

- Use 1-2 radius values consistently.
- Use subtle shadows only for elevation/drawers/modals.
- Do not mix many radii/shadows across cards.

## 8. Component System Requirements

Create reusable components if missing. Suggested components:

- `AppShell`
- `MainNav`
- `MobileNav`
- `PageHeader`
- `SectionHeader`
- `MetricCard`
- `ProgressCard`
- `ActionCard`
- `StatusBadge`
- `EmptyState`
- `LoadingSkeleton`
- `ErrorState`
- `ConfirmDialog`
- `SideDrawer` or `Sheet`
- `Modal`
- `Tabs` / `SegmentedControl`
- `FilterBar`
- `FilterDrawer`
- `OverflowMenu`
- `DataTable`
- `FormField`
- `Toast` / `Snackbar`

Do not copy/paste full UI blocks across pages. Consolidate repeated card/button/input/table patterns.

## 9. Interaction State Requirements

Every interactive component must define:

- Default
- Hover
- Focus-visible
- Active/pressed
- Disabled
- Loading
- Error where relevant

Every async action must show feedback:

- Loading state during request
- Success toast/message when done
- Error state with recoverable message
- Preserve requestId if API returns it and it helps debugging

## 10. Accessibility Requirements

Implement as production requirements, not polish.

- Keyboard navigation must work for nav, tabs, modals, drawers, menus, forms.
- Focus trap inside modal/drawer; focus returns to trigger when closed.
- Visible focus ring with sufficient contrast.
- Icon-only buttons need accessible labels.
- Form fields need labels; placeholders are not labels.
- Field errors must appear near fields and be programmatically associated if feasible.
- Normal text contrast >= 4.5:1.
- Large text and UI component contrast >= 3:1.
- Touch targets approximately >= 44px on mobile for main controls.
- Motion should respect reduced-motion preference.

## 11. Responsive Requirements

Mobile-first behavior is required because daily fitness logging often happens on phone.

### Mobile

- Single-column layout
- Sticky bottom primary action where useful
- Bottom sheets/action sheets for quick forms
- Avoid dense tables; use cards or horizontal scroll only when unavoidable
- Keep quick logging above deep history

### Tablet/Desktop

- Use 2-column/3-column card grids where appropriate
- Use max-width containers for readable pages
- Keep data tables for admin/content governance
- Avoid full-width long-form text over 75ch

## 12. Data/API Integration Notes

Use existing API routes. Relevant endpoint groups:

- Health/readiness: `/api/health`, `/api/ready`, `/api/integrations/status`
- Auth/account: `/api/auth/*`, `/api/account/export`
- Hydration: `/api/hydration/today`, `/api/hydration/log`, `/api/hydration/log/{id}`
- Supplements: `/api/supplements`, `/api/supplements/log`, `/api/supplements/{id}/reminder`
- Routines: `/api/routines`, `/api/routines/{id}`
- Exercises: `/api/exercises`, `/api/exercises/{id}`
- Exercise marketplace: `/api/exercises/marketplace`, detail/substitutions/clone/add-to-routine
- Routine templates: `/api/routine-templates`, detail/preview/apply/clone/feedback
- Workouts: `/api/workouts/today`, planner preview, sessions, sets
- Coach: `/api/coach/recommend`, recommendation feedback
- Sync: `/api/sync/batch`
- Progress/achievements/leaderboards: `/api/progression/recalculate`, `/api/achievements/*`, `/api/leaderboards/*`
- Notifications: `/api/notifications/*`
- Admin: `/api/admin/*`
- Observability/client errors: `/api/observability/logs`, `/api/client-errors`

Preserve the API envelope pattern:

```ts
{ ok: true, data, requestId? }
{ ok: false, error, errorCode?, details?, requestId? }
```

Do not expose raw secrets, service-role keys, tokens, or sensitive unredacted user data in the frontend.

## 13. Implementation Plan for Codex

Codex should execute in phases, not attempt random visual edits.

### Phase 1: Audit current UI structure

Inspect:

- `apps/web/src/app/**`
- `apps/web/src/components/**` if present
- `apps/web/src/lib/**` if present
- `apps/web/src/app/globals.css`
- package scripts and existing styling conventions

Deliverable:

- Identify all current routes/pages and which workflow they belong to.
- Identify repeated UI patterns to consolidate.
- Identify pages currently exposing too many controls.

### Phase 2: Create design foundations

Implement or clean up:

- Global CSS tokens
- Base typography
- Layout/container rules
- Button/input/card/table styles or components
- Responsive shell/nav
- Common empty/loading/error states

Do not rewrite backend/API code unless the UI requires a typed client fix.

### Phase 3: Rebuild information architecture

Refactor page layout into:

- Today-first main user flow
- Dedicated route/section for routine builder
- Dedicated marketplace/library views
- Dedicated progress view
- Dedicated settings/data/privacy view
- Separate admin shell

### Phase 4: Apply progressive disclosure

For every page, move secondary/advanced actions into:

- Drawer
- Modal
- Accordion
- Overflow menu
- Tabs
- Dedicated detail route

Explicitly avoid always-visible edit/delete/import/export/admin/debug controls on daily pages.

### Phase 5: Polish interaction states

Add:

- Loading skeletons
- Empty states
- Error states
- Toast/snackbar feedback
- Confirm dialogs for destructive actions
- Active nav state
- Focus-visible states
- Mobile nav behavior

### Phase 6: Verify

Run available checks, likely:

```bash
npm --workspace @evolvefit/web run build
```

Also manually review responsive behavior in browser if possible.

If build scripts differ, inspect `package.json` and use the project’s actual commands.

## 14. Acceptance Criteria

The redesign is complete only when all criteria below are met.

### UX criteria

- Today dashboard no longer displays every app feature at once.
- Daily actions are immediately visible and fast.
- Advanced/rare actions are hidden behind intentional UI.
- Routine view mode and edit mode are clearly separated.
- Live workout screen is focused on current exercise/set.
- Marketplace list pages use filters + details, not all metadata in every card.
- Settings contains account/sync/privacy/import/export/delete actions.
- Admin is separate from regular user app and role-aware.

### Visual criteria

- Consistent spacing, typography, colors, cards, buttons, inputs, badges.
- The app looks like one coherent product, not a collection of unrelated sections.
- Mobile layout is usable and not an afterthought.
- Desktop layout uses grid/containers instead of stretched full-width content everywhere.

### Accessibility criteria

- Keyboard focus is visible.
- Modals/drawers/menus are navigable.
- Icon-only actions have labels.
- Forms have labels and useful errors.
- Contrast is production-safe.
- Destructive actions require confirmation/undo.

### Technical criteria

- Existing API functionality remains intact.
- No secrets or raw sensitive data appear in UI.
- Build passes.
- No new TypeScript/runtime errors.
- No accidental deletion of existing docs or unrelated files.

## 15. Specific Anti-Patterns to Remove

Codex should actively look for and remove these patterns:

- One giant page containing dashboard, settings, routine editor, marketplace, logs, and admin controls together.
- Every feature represented as a permanently visible card.
- Create/edit/delete buttons visible on read-only summary cards by default.
- Raw JSON/API/debug output shown to normal users.
- Long forms embedded directly in dashboard cards.
- Advanced filters always expanded.
- Tables used on mobile for dense user workflows.
- Admin/support/governance controls mixed into user pages.
- Destructive account/data actions placed near normal daily controls.
- Inconsistent button styles and card spacing.

## 16. Suggested Codex Prompt

Use this prompt after saving this document:

```text
You are redesigning the EvolveFit webapp UI/UX into a production-quality fitness app.

Read docs/evolvefit-production-ui-ux-redesign-brief.md first and follow it as the source of truth. Also inspect docs/webapp-feature-overview.md and docs/api-v1.openapi.json for product/API context.

Main problem: the current UI exposes too many features at once. Rebuild the interface around workflow-based information architecture and progressive disclosure. Surface daily actions; hide advanced/rare/destructive/admin/debug controls behind drawers, modals, tabs, overflow menus, edit modes, or separate routes.

Do not remove existing functionality. Preserve API behavior. Create/clean shared UI components and design tokens. Make the app mobile-first, accessible, and visually consistent.

Before editing, audit current routes/components and write a short implementation plan. Then implement in phases. Verify with the web build command from package.json.
```

## 17. Notes for Phuc

When reviewing Codex output, judge by workflow clarity first:

1. Can a normal user open Today and know what to do in 5 seconds?
2. Are dangerous/rare/admin actions hidden until intentionally opened?
3. Does live workout feel focused enough to use during training?
4. Does routine editing feel like an explicit mode, not clutter on every card?
5. Does the app feel coherent across mobile and desktop?

If the answer to any of these is no, the UI is not production-ready yet.
