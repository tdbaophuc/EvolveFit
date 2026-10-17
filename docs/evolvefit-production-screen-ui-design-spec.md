# EvolveFit Production UI Design Spec — Screen-by-Screen

Created: 2026-10-06  
Audience: Codex / UI implementation agent  
Purpose: replace the current visually inconsistent mobile web UI with a production-grade design system and concrete screen designs.

> This document is intentionally prescriptive. Codex should implement this as the UI source of truth unless existing product logic/API constraints make a specific detail impossible.

---

## 1. Current UI Diagnosis From Screenshots

The current redesign improved progressive disclosure in some places, but the result still looks like a prototype/debug UI rather than a real consumer fitness app.

### Global problems

1. **Typography feels wrong for production fitness**
   - Large serif display text such as “Hôm nay” creates a poster/editorial mood, not a utility fitness app.
   - Multiple weights/sizes compete without a clear type scale.
   - Several list rows show text overlap, especially Library/Marketplace items.

2. **Cards are overused and too similar**
   - Almost every section is a bordered card with similar radius, border, and padding.
   - Important cards do not stand out enough from secondary panels.
   - Dense settings/admin-like controls feel the same as daily health cards.

3. **Hierarchy is still noisy**
   - Top header, sync pill, tab chips, bottom nav, floating button, scrollbars, and cards all compete.
   - Today screen has a large decorative circle that consumes valuable space but does not help the user act.
   - Workout screen has many controls visible at once while the user is actively training.

4. **Color system lacks discipline**
   - Green is used for active tabs, workout cards, success states, outlines, soft backgrounds, and CTAs, so meaning becomes unclear.
   - Some blue/purple accents appear without a product-level role.
   - Borders are too visible and repeated, making the UI feel wireframe-like.

5. **Spacing and density are inconsistent**
   - Some screens have excessive empty vertical space; others are cramped.
   - Forms and settings rows are too tall but still visually cluttered.
   - Bottom nav overlaps content in some screenshots; pages need bottom padding.

6. **Mobile-first interaction is incomplete**
   - List/detail states are stacked in the same scroll, causing huge pages.
   - Detail panels should be routes, drawers, or sheets rather than always-open blocks below lists.
   - Advanced settings and sync diagnostics need summary-first disclosure.

7. **Production readiness issues**
   - Inputs look raw and not aligned to a formal component system.
   - Checkboxes are inconsistent and hard to scan.
   - Buttons are pill-shaped everywhere, reducing distinction between primary, secondary, destructive, disabled, and chip states.

---

## 2. Product Visual Direction

### Target feeling

EvolveFit should feel like:

- **Clean fitness companion**: fast, clear, everyday-use app.
- **Trustworthy health/productivity tool**: calm surfaces, high legibility, predictable controls.
- **Energetic but not childish**: green accent for progress/action, not neon gamification everywhere.
- **Mobile-first production SaaS**: comparable clarity to Linear/Supabase/Apple Fitness-style discipline, not a test dashboard.

### Do not use

- Decorative oversized zen circles on functional dashboards.
- Large serif headings for core app screens.
- Random accent borders per metric card.
- Always-visible debug/admin/sync details on normal pages.
- Text shadows, heavy gradients, or neumorphism.

---

## 3. Technology Direction

Use the existing Next.js app. Use Tailwind-style utility classes or Tailwind-compatible CSS tokens. If Tailwind is not installed, Codex should either install/configure Tailwind or implement equivalent CSS variables and utility classes cleanly.

Recommended stack:

- **Next.js 15 + React 19**
- **Tailwind CSS** for layout/tokens/utilities
- **lucide-react** for icons, already present
- Optional but recommended: small local component primitives inspired by shadcn/ui, without requiring the full shadcn CLI unless the project already uses it.

---

## 4. Typography System

### Font choice

Use one primary UI font. Recommended:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

If adding a web font is acceptable, use:

```tsx
// Next font recommendation
import { Inter } from "next/font/google";
```

Do **not** use the current large serif display style for app pages. It can be removed entirely.

### Type scale

Tailwind mapping:

| Role | Size / line-height | Tailwind | Weight |
|---|---:|---|---:|
| App title / screen title | 28 / 34 | `text-[28px] leading-[34px]` | `font-semibold` |
| Page title mobile | 24 / 32 | `text-2xl leading-8` | `font-semibold` |
| Section title | 18 / 28 | `text-lg leading-7` | `font-semibold` |
| Card title | 16 / 24 | `text-base leading-6` | `font-semibold` |
| Body | 15 / 24 | `text-[15px] leading-6` | `font-normal` |
| Secondary | 14 / 20 | `text-sm leading-5` | `font-normal` |
| Caption/metadata | 12 / 16 | `text-xs leading-4` | `font-medium` |
| Metric number | 30 / 36 | `text-3xl leading-9` | `font-semibold tabular-nums` |
| Workout number/timer | 36 / 44 | `text-4xl leading-[44px]` | `font-semibold tabular-nums` |

### Typography rules

- Use `font-semibold`, not `font-black`, for most labels and buttons.
- Use `tabular-nums` for ml, kg, reps, timers, dates, stats.
- Use sentence case for Vietnamese UI labels, not ALL CAPS, except small category labels like “LIVE”, “OFFLINE”.
- Avoid centered text in functional screens unless it is a modal/empty state.

---

## 5. Color System

### Semantic tokens

Use CSS variables in `globals.css` and Tailwind mapping if available.

```css
:root {
  --background: 150 22% 97%;          /* #F6FAF7 */
  --foreground: 158 28% 12%;          /* #16251D */

  --card: 0 0% 100%;                  /* #FFFFFF */
  --card-foreground: 158 28% 12%;

  --muted: 150 18% 94%;               /* #EEF5F1 */
  --muted-foreground: 155 10% 42%;    /* #5E7067 */

  --border: 150 16% 86%;              /* #D4E0D9 */
  --input: 150 16% 86%;
  --ring: 148 58% 42%;

  --primary: 145 58% 45%;             /* #30B860 */
  --primary-foreground: 0 0% 100%;

  --secondary: 204 90% 48%;           /* #0EA5E9 */
  --secondary-foreground: 0 0% 100%;

  --success: 145 58% 45%;
  --success-foreground: 0 0% 100%;

  --warning: 38 92% 50%;              /* #F59E0B */
  --warning-foreground: 35 40% 12%;

  --destructive: 0 72% 51%;           /* #DC2626 */
  --destructive-foreground: 0 0% 100%;

  --info: 214 95% 57%;                /* #2F80ED */
  --info-foreground: 0 0% 100%;
}
```

### Practical palette

| Use | Color |
|---|---|
| App background | `bg-[#F6FAF7]` |
| Card background | `bg-white` |
| Primary text | `text-[#16251D]` |
| Secondary text | `text-[#5E7067]` |
| Primary action | `bg-[#30B860] text-white` |
| Primary hover | `hover:bg-[#279B51]` |
| Soft primary | `bg-[#E7F8ED] text-[#166534]` |
| Border | `border-[#D4E0D9]` |
| Danger | `text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]` |
| Warning | `text-[#92400E] bg-[#FFFBEB] border-[#FDE68A]` |
| Info | `text-[#1D4ED8] bg-[#EFF6FF] border-[#BFDBFE]` |

### Color rules

- Green = primary action, success, progress.
- Blue = sync/info/coach explanation.
- Amber = warning/needs attention.
- Red = destructive/error only.
- Purple should be removed unless there is a specific coach/AI brand role. The current purple “Chấp nhận” button feels arbitrary; make it green primary or neutral if it is not the main action.

---

## 6. Spacing, Layout, Radius, Shadows

### Layout dimensions

Mobile app frame:

```tsx
<main className="mx-auto min-h-dvh w-full max-w-md bg-background pb-24">
```

For desktop/tablet, use a responsive shell:

```tsx
<div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
```

### Spacing scale

Use Tailwind spacing consistently:

- Page horizontal padding: `px-4 sm:px-6`
- Page vertical spacing: `py-4`, section gap `space-y-4` or `gap-4`
- Card padding: `p-4` mobile, `p-5` desktop
- Internal compact gap: `gap-2`
- Form group gap: `gap-3`
- Major screen section gap: `gap-6`

### Radius

- Small controls: `rounded-lg`
- Cards: `rounded-2xl`
- Pills/chips: `rounded-full`
- Bottom sheets/modals: `rounded-t-3xl` mobile, `rounded-2xl` desktop

### Shadow

Avoid many visible borders + shadows together. Recommended:

```tsx
className="rounded-2xl border border-border/70 bg-card shadow-sm"
```

For elevated sheet:

```tsx
className="shadow-[0_16px_40px_rgba(22,37,29,0.14)]"
```

---

## 7. Component Primitives

Codex should create or normalize these primitives.

### `AppShell`

Responsibilities:

- Top header
- Content container
- Bottom nav on mobile
- Side nav on desktop if needed
- Safe area bottom padding

### `TopBar`

Current top bar is too visually persistent. Redesign:

- Height: `56px`
- Left: profile/avatar button
- Center: current date or page title, not both everywhere
- Right: notification button
- Sync status becomes a small optional pill below header only when not synced/pending/error.

Classes:

```tsx
<header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/75">
```

### `BottomNav`

- Fixed bottom, 5 main items max.
- Height 72-80px including safe area.
- Active state: soft green pill; icon + label.
- Ensure `main` has `pb-24`.

### `Card`

```tsx
<section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
```

### `Button`

Variants:

- `primary`: green filled
- `secondary`: white/neutral bordered
- `ghost`: no border
- `danger`: red soft or red filled for confirmation
- `disabled`: muted bg/text, no shadow

Do not use the same pill style for every action. Primary CTAs should be visually distinct.

### `Chip` / `SegmentedControl`

Use for tabs/filters, not for normal buttons.

- Active: `bg-primary/12 text-green-800 border-primary/40`
- Inactive: `bg-white text-muted-foreground border-border`

### `Sheet` / `Drawer`

Use for:

- Hydration details
- Exercise detail
- Filter advanced
- Routine edit actions
- Coach data used
- Settings dangerous actions

### `DataRow`

For settings rows:

```tsx
<div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
```

### `FormField`

- Label above input
- Help text optional
- Error text below
- Input height `44px` minimum

---

## 8. Navigation Architecture

Main user nav:

1. Hôm nay
2. Tập luyện
3. Lịch tập
4. Thư viện
5. Tiến độ

Settings should be accessible from avatar/profile button and also bottom nav only if there is no better profile route. Current bottom nav has Settings squeezed under a floating `N` button; remove that floating black button. It looks like a debug overlay or unrelated widget.

Recommended:

- Avatar button opens profile/settings sheet or route.
- Bottom nav remains only core workflows.
- Settings route has its own tabbed sections.

---

## 9. Screen-by-Screen Design Spec

## 9.1 Today Dashboard

### Current issues

- Giant decorative progress circle takes too much vertical space and does not map clearly to actionable data.
- Header typography is too decorative.
- Multiple cards compete; no clear “next best action”.
- Recent activity and metric cards appear before the user has completed core daily actions.

### Target layout

```text
TopBar
Sync pill if needed
Hero summary card
Daily action grid
Today workout card
Hydration card
Supplement card
Recent activity collapsed preview
```

### Hero summary card

Purpose: answer “What should I do now?”

Content:

- Title: “Hôm nay”
- Subtitle: date + local/offline/sync state if relevant
- Main status: “Push Day • 3 bài” or “Không có buổi tập hôm nay”
- Primary CTA: “Bắt đầu tập” / “Tiếp tục tập”
- Secondary CTA: “Xem lịch”

Style:

```tsx
<section className="rounded-3xl bg-gradient-to-br from-[#173E2A] to-[#10251B] p-5 text-white shadow-lg">
```

Use dark hero only for the primary workout action. Do not repeat dark card style everywhere.

### Daily action grid

2-column compact cards:

- Nước: progress + `+250ml`, `+500ml`
- Creatine: status + `Đã uống`

Do not show full logs here. `Chi tiết` opens a sheet.

### Tailwind example

```tsx
<div className="grid grid-cols-2 gap-3">
  <ActionCard title="Nước" value="750 / 2750ml" progress={27} />
  <ActionCard title="Creatine" value="Chưa log" action="Đã uống" />
</div>
```

### Acceptance criteria

- No decorative circle above the fold.
- Primary action visible within first 360px height.
- Hydration and creatine actions are one tap.
- Secondary details open sheet/drawer.

---

## 9.2 Training Plan / Workout Home

### Current issues

- Screen is nearly empty except a large dark card and weekly strip.
- The “Bắt đầu tập” card is good directionally but lacks supporting context.

### Target layout

```text
TopBar
Workout Hero: next workout + CTA
Weekly schedule strip
Plan summary card
Recovery/coach suggestion card
```

### Workout hero

- Name: “Ngày thân trên”
- Details: “3 bài • 45–60 phút • Trên/Dưới”
- CTA: `Bắt đầu tập`
- Secondary: `Xem bài tập`

### Weekly schedule strip

- Use horizontal scroll chips/cards, not cramped 7 equal boxes if screen is narrow.
- Active day has filled/soft green state.
- Rest days have muted state.

### Plan summary

Show:

- Days/week
- Current routine
- Next workout
- Recent completion

Hidden behind `Chỉnh lịch`: edit builder.

---

## 9.3 Live Workout Session

### Current issues

- Too much page scrolling during a live workout.
- Sticky green CTA overlaps bottom nav and content.
- Rest timer card is huge and pushes safety/queue/history below.
- Several controls are visible even if not needed immediately.

### Target UX

During a workout, the current set must dominate. Everything else is secondary.

### Target layout

```text
Compact live header
Current exercise card
Set input card
Sticky bottom action bar
Collapsible: rest timer
Collapsible: queue
Collapsible: set history
Danger zone: finish/cancel in menu
```

### Live header

- Exercise progress: `Bài 1/3`
- Session timer
- Small `Pause` button
- Overflow menu for finish/cancel/reorder

### Current exercise card

- `Barbell Bench Press`
- Target: `4 × 6–8`
- Last performance: `57.5kg × 8, 8, 7`
- Button: `Đổi bài` in overflow/sheet, not primary.

### Set input card

Make the inputs thumb-friendly:

```text
Weight              Reps               RPE
[-] 42.5kg [+]      [-] 8 [+]          [-] 8 [+]
```

Use larger tap targets: `h-12` minimum.

### Sticky action bar

At bottom above nav or replace nav during workout:

- Primary: `Hoàn thành set`
- Secondary: `Bỏ qua set`

Do not show full bottom nav during a live workout if it competes with set completion. Prefer a workout-only bottom bar and a small `Thoát`/back button in header.

### Rest timer

Collapsed by default after a set completes; expand as a bottom sheet or compact card:

- Timer large
- `-15`, `Tạm dừng`, `+15`
- Close/minimize

### Acceptance criteria

- User can complete a set with thumb in one tap.
- No overlap between sticky CTA and bottom nav.
- Finish/cancel is protected by confirmation.
- Queue/history are collapsed by default.

---

## 9.4 Schedule / Routines

### Current issues

- Marketplace, coach planner, weekly schedule, active routine, CSV import all live in one long page.
- This is still a feature dump.

### Target IA

Use tabs inside `Lịch tập`:

1. `Lịch của tôi`
2. `Template`
3. `Planner`
4. `Import`

Default: `Lịch của tôi`.

### My schedule screen

Show:

- Active routine summary
- Weekly schedule
- Current selected day
- Exercise list
- CTA: `Chỉnh lịch`

### Edit mode

Only after clicking `Chỉnh lịch`:

- Add/remove/reorder exercises
- Edit sets/reps/rest
- Rename routine/day
- Delete controls

### Template marketplace

Separate tab/screen:

- Search
- Filter chips
- Template cards
- Detail opens sheet/route

### Planner

Separate tab/screen:

- Goal, days/week, equipment, experience
- Generate preview
- Apply preview

### Import CSV/XLSX

Separate `Import` tab or Settings > Data. It should not be on the main schedule view.

---

## 9.5 Exercise Library / Marketplace

### Current issues

- Text overlaps in exercise list rows.
- “Marketplace” label appears over exercise names.
- Detail panel is embedded below list, causing huge scroll.
- Advanced data such as cues/mistakes is too visible on list screen.

### Target layout

```text
Search bar
Filter row: Muscle, Equipment, Difficulty
Advanced filter sheet button
Result list
Detail sheet / detail route
```

### Exercise row/card spec

Height: 76-88px. No text overlap.

```text
[Icon] Barbell Hip Thrust           [Detail]
      Glutes • Barbell • Intermediate
      Marketplace
```

Tailwind:

```tsx
<div className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-border/70 bg-white p-3">
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" />
  <div className="min-w-0 flex-1">
    <h3 className="truncate text-sm font-semibold text-foreground">Barbell Hip Thrust</h3>
    <p className="mt-0.5 truncate text-xs text-muted-foreground">Glutes • Barbell • Intermediate</p>
    <Badge>Marketplace</Badge>
  </div>
  <Button size="sm" variant="secondary">Chi tiết</Button>
</div>
```

### Detail sheet

Open when tapping item. Do not display detail permanently in the list.

Sections:

- Header: name, tags, add/clone actions
- Cues
- Common mistakes
- Substitutions
- Cautions
- Source/license collapsed

### Acceptance criteria

- No overlapping text.
- List screen remains short and scannable.
- Detail is opened intentionally.
- Filters are accessible but not all advanced filters are visible.

---

## 9.6 Progress / Coach

### Current issues

- Coach recommendation, history, metrics, trend charts, body form, social sharing are mixed across long scrolls.
- Progress screen duplicates metric cards across tabs.
- Body metric form appears inline and too raw.

### Target tabs

Inside Progress:

1. `Tổng quan`
2. `Tập luyện`
3. `Cơ thể`
4. `Coach`
5. `Chia sẻ`

But avoid duplicating the same metric cards in every tab.

### Overview

Show:

- 4 key metrics
- 7-day trend chart
- Coach card preview
- Recent achievements

### Coach tab

Coach recommendation card:

- Title: `Giữ mức 60kg`
- Summary: one sentence
- Data confidence / rule-first badge
- Primary: `Chấp nhận`
- Secondary: `Từ chối`
- Links: `Xem dữ liệu dùng`, `Thêm phản hồi`

Use green primary, neutral secondary. Remove purple.

### Body tab

- Trend chart
- Add metric button
- Metric history list
- Form opens in sheet/modal, not always inline.

### Share tab

- Privacy state
- Share cards
- History/empty state
- Explicit permissions

### Charts

Current bars look placeholder-like. Use simple, polished chart cards:

- rounded plotting area
- muted gridlines
- primary gradient bars or line
- labels with `text-xs text-muted-foreground`

If no chart library, simple CSS bars are acceptable but must be clean and aligned.

---

## 9.7 Settings

### Current issues

- Settings is a dense collection of chips and raw forms.
- Profile/auth/password/onboarding/hydration/creatine/reminders are in one long form.
- Supplement config cards are bulky and not production-polished.
- Sync diagnostics show too much raw backend/environment detail.

### Target layout

Settings should use list sections first. Details open on tap.

```text
Profile card
Settings sections:
- Account
- Training preferences
- Hydration & supplements
- Notifications
- Privacy & social
- Integrations
- Sync
- Data & export
```

### Mobile settings pattern

Use section list rows:

```text
[icon] Account                  >
      Email, password, sign out
[icon] Training preferences      >
      Goal, days/week, equipment
[icon] Hydration & supplements   >
      Water target, creatine, reminders
```

Do not show every form field by default.

### Profile/account detail

- Email field
- Auth actions
- Password reset/update
- Sign out
- Local mode/cloud mode explanation

### Training preferences detail

- Goal
- Days/week
- Equipment
- Restart onboarding

### Hydration & supplements detail

- Water target
- Creatine enabled/target/reminder
- Other drink modules hidden in advanced accordion

### Privacy/social detail

- Leaderboard opt-in
- Sharing permissions
- Friends list

Use modern switch controls instead of raw checkboxes.

### Health integrations detail

The Health Connect screen is too technical. Redesign with:

- Explainer card
- Permissions list with switches
- Status cards
- Primary: `Yêu cầu quyền`
- Danger: `Thu hồi quyền`

### Sync detail

Normal users need summary, not raw config.

Show:

- Storage mode
- Pending queue count
- Last sync
- Sync health: OK / needs setup / error

Advanced diagnostics collapsed:

- requestId
- supabase config status
- webPush config
- cronSecret config

### Data & Privacy

Keep current idea but polish:

- Export JSON
- Export CSV
- Import JSON
- Danger zone collapsed with confirmation
- Explain what includes personal data

---

## 10. Tailwind Implementation Guide

## 10.1 Tailwind config tokens

If Tailwind is installed, configure colors like this:

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
      },
    },
  },
};

export default config;
```

## 10.2 Base CSS

```css
* {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  min-height: 100dvh;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
}

button,
input,
select,
textarea {
  font: inherit;
}

:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

## 10.3 Reusable class patterns

```ts
export const surface = "rounded-2xl border border-border/70 bg-card shadow-sm";
export const page = "mx-auto min-h-dvh w-full max-w-md bg-background px-4 pb-24 pt-3";
export const section = "space-y-3";
export const mutedText = "text-sm leading-5 text-muted-foreground";
export const primaryButton = "inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50";
export const secondaryButton = "inline-flex h-11 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50";
```

---

## 11. Concrete Implementation Priorities

Codex should not try to polish everything randomly. Implement in this order.

### Priority 1 — Global design reset

- Remove serif display heading styling.
- Normalize font, color tokens, card/button/input styles.
- Remove the floating black `N` control if it is not a required product feature.
- Fix bottom nav overlap with `pb-24` and safe-area padding.

### Priority 2 — Fix Library text overlap

- Rebuild exercise row/card component.
- Move marketplace details into sheet/route.
- Ensure no text overlap under any viewport width.

### Priority 3 — Fix Live Workout usability

- Replace full bottom nav with workout action bar during active session, or ensure CTA sits above nav cleanly.
- Collapse queue/history/rest timer by default.
- Make current set input the dominant area.

### Priority 4 — Rebuild Today screen

- Remove decorative large circle.
- Add concise hero + action cards.
- Move logs/details to sheets.

### Priority 5 — Rebuild Settings IA

- Convert chip-heavy tab layout into list-first settings sections.
- Move detailed forms into separate panels/sheets.
- Replace raw checkboxes with switches.

### Priority 6 — Progress and Schedule cleanup

- Split long feature-dump pages into tabs with one goal per tab.
- Remove duplicated metric grids where they do not belong.

---

## 12. Acceptance Checklist

### Visual production checklist

- [ ] One consistent sans-serif font system.
- [ ] No oversized serif headers in app screens.
- [ ] No text overlap in any list/card.
- [ ] Cards have consistent radius, padding, border, shadow.
- [ ] Primary/secondary/destructive buttons are visually distinct.
- [ ] Green is not used for every possible state.
- [ ] Bottom nav never overlaps content or sticky CTA.

### UX checklist

- [ ] Today screen shows next action within first viewport.
- [ ] Live workout can complete a set without scrolling.
- [ ] Routine edit mode is separate from view mode.
- [ ] Marketplace details open intentionally, not permanently below lists.
- [ ] Settings starts with sections, not raw forms.
- [ ] Advanced/debug/sync diagnostics are collapsed.
- [ ] Dangerous actions require confirmation.

### Accessibility checklist

- [ ] Touch targets are at least 44px for main controls.
- [ ] Focus-visible styles exist.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Inputs have labels.
- [ ] Switches/checkboxes have readable labels.
- [ ] Text contrast meets WCAG defaults.
- [ ] Reduced motion is respected.

### Technical checklist

- [ ] Existing API functionality preserved.
- [ ] No secrets/raw tokens exposed.
- [ ] `npm --workspace @evolvefit/web run build` passes, or the correct project build command passes.
- [ ] No unrelated docs/code are deleted.

---

## 13. Codex Prompt To Use

```text
Read docs/evolvefit-production-screen-ui-design-spec.md and docs/evolvefit-production-ui-ux-redesign-brief.md first.

The current EvolveFit UI still looks prototype-like: wrong typography, weak hierarchy, overused cards, text overlaps in Library, live workout scrolling/CTA problems, and settings are too raw/dense.

Implement the production screen-by-screen design spec. Use Tailwind-style tokens/components. Prioritize: global design reset, Library row/detail redesign, live workout usability, Today dashboard rebuild, Settings IA cleanup, then Schedule/Progress cleanup.

Do not remove product functionality or change backend/API behavior. Preserve local-first behavior and all existing routes where possible. Create reusable components instead of one-off styling. Verify with the project web build command.
```

---

## 14. Final Design Direction Summary

EvolveFit should look like a calm, high-trust, mobile-first fitness companion:

- Inter-like sans typography
- white cards on soft green-tinted background
- strong dark workout hero only where useful
- green primary action and progress
- blue info/sync/coach details
- amber warning
- red destructive/error
- clear cards, fewer visible controls, more intentional sheets/details
- live workout optimized for thumb use and zero confusion

The goal is not “more beautiful cards”. The goal is a real app where a real user can open it, understand the next action, log fast, train safely, and manage settings without feeling like they are inside an admin/debug panel.
