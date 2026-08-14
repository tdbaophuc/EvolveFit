# EvolveFit - UI/UX Design Specification

## 1. Mục tiêu thiết kế

EvolveFit phải có cảm giác như một mobile app tập luyện thật sự, không giống website dashboard. Giao diện cần ưu tiên thao tác nhanh trong 3 hoàn cảnh: vừa uống nước, đang nghỉ giữa set, và kiểm tra tiến độ cuối ngày.

Nguyên tắc chính:

- Một thao tác lặp lại hàng ngày nên hoàn thành trong 1-2 chạm.
- Các nút chính phải đủ lớn để bấm bằng ngón cái khi đang di chuyển hoặc đang tập.
- Màn hình đầu tiên là màn hình hành động, không phải màn hình giới thiệu.
- Dữ liệu quan trọng nhất của hôm nay phải nhìn thấy ngay trong 5 giây.
- Không dùng giao diện quá game hóa ở MVP; badge và leaderboard chỉ là động lực phụ.
- Tránh quá nhiều form nhập liệu. Khi cần nhập số, ưu tiên button, stepper, slider, picker.

## 2. Visual direction

### Cảm giác tổng thể

Ứng dụng nên có phong cách hiện đại, gọn, thể thao, rõ số liệu. Không nên dùng giao diện quá "cute" như Plant Nanny vì EvolveFit còn là workout tracker nghiêm túc. Hydration có thể mềm hơn, nhưng workout mode cần chắc, tương phản cao, ít phân tán.

Từ khóa thiết kế:

- Fast
- Clean
- Athletic
- Focused
- Personal
- Data-readable

### Màu sắc

Không nên để toàn bộ app chỉ là xanh nước. Dùng bảng màu có 3 nhóm rõ:

- Hydration: cyan/blue dùng cho nước, progress ring, log nước.
- Training: lime/green hoặc amber dùng cho workout, PR, progressive overload.
- Recovery/Coach: violet hoặc neutral dùng cho readiness, AI suggestion.
- Danger/warning: red/orange cho miss goal, quá tải, failed set.

Đề xuất token:

- Background: `#0F172A` hoặc `#111827` cho dark mode.
- Surface: `#182235`, `#1F2937`.
- Text primary: `#F8FAFC`.
- Text secondary: `#CBD5E1`.
- Hydration primary: `#38BDF8`.
- Training primary: `#A3E635`.
- Supplement accent: `#FACC15`.
- Coach accent: `#A78BFA`.
- Error: `#F87171`.

Light mode có thể làm sau, nhưng nếu thiết kế ngay từ đầu thì cần tương đương:

- Background: `#F8FAFC`.
- Surface: `#FFFFFF`.
- Text primary: `#0F172A`.
- Border: `#E2E8F0`.

### Typography

- Font đề xuất: Inter, SF Pro, hoặc Geist.
- Không dùng chữ quá mảnh.
- Số liệu chính cần to, rõ, dễ đọc khi liếc nhanh.
- Không dùng letter spacing âm.

Scale gợi ý:

- Hero metric: 40-48px, semibold/bold.
- Section title: 18-22px, semibold.
- Card title: 15-17px, semibold.
- Body: 14-16px.
- Caption: 12-13px.
- Button label: 15-17px, semibold.

### Border radius và spacing

- Card: 8px.
- Button lớn: 12px nếu là hành động chính, 8px nếu là control trong tool.
- Icon button: hình vuông/circle-like, kích thước ổn định.
- Khoảng cách màn hình mobile: padding ngang 16px.
- Gap giữa nhóm section: 20-24px.
- Gap trong card/control: 8-12px.

## 3. Navigation

### Mobile primary navigation

Dùng bottom tab bar cố định với 5 tab:

1. Today
2. Workout
3. Progress
4. Coach
5. Settings

Achievements không nhất thiết là tab riêng ở MVP. Có thể đặt trong Progress hoặc mở từ Today qua badge chip. Khi gamification mạnh hơn, thêm entry trong Progress.

Tab bar:

- Cao 64-72px, có safe-area bottom.
- Icon + label ngắn.
- Active tab có màu theo ngữ cảnh hoặc màu primary trung tính.
- Không đặt quá nhiều action trong tab bar.

### Primary action

Today không cần floating action button vì quick actions đã nằm ngay trên màn hình. Live Workout có thể dùng bottom sticky action `Complete Set`.

## 4. Information architecture

### Today

Mục tiêu: log nhanh và biết hôm nay đang ổn hay chưa.

Thứ tự nội dung:

1. Header nhỏ: greeting, ngày, status sync/offline.
2. Hydration hero: progress ring, lượng đã uống, mục tiêu, expected progress.
3. Quick water actions: các nút amount hay dùng.
4. Slider custom amount: mở dạng bottom sheet hoặc inline compact.
5. Supplement row: creatine và supplement hôm nay.
6. Workout today: tên buổi, giờ dự kiến, nút Start.
7. Readiness check-in mini: Energy, Sleep, Soreness dạng 3 chip.
8. Badge/monthly progress strip.
9. Timeline gần nhất: 3 log cuối.

Không nên đưa chart phức tạp lên Today.

### Hydration detail

Mục tiêu: chỉnh/sửa log, cấu hình goal và reminder.

Thứ tự nội dung:

1. Daily progress chart theo giờ.
2. Log timeline hôm nay.
3. Drink type filter.
4. Goal setting.
5. Quick amount management.
6. Reminder settings.

### Workout

Mục tiêu: bắt đầu buổi tập và quản lý routine.

Thứ tự nội dung:

1. Today's workout card.
2. Weekly schedule.
3. Active routine.
4. Recent workouts.
5. Exercise library.

### Live Workout

Mục tiêu: log set nhanh nhất có thể.

Thứ tự nội dung:

1. Sticky top: workout name, elapsed time, exercise progress.
2. Current exercise: tên bài, muscle group, target.
3. Last time comparison: weight/reps/RPE buổi trước.
4. Set rows: target vs actual.
5. Current set controls: weight stepper, reps stepper, RPE optional.
6. Rest timer: auto-start, large countdown.
7. Sticky bottom: `Complete Set`, `Skip`, `Finish`.

Live Workout nên có "focus mode": ít màu, ít thông tin phụ, font số to.

### Progress

Mục tiêu: xem xu hướng và thành tựu.

Sections:

- Hydration 7/30 days.
- Workout consistency.
- Volume by muscle group.
- e1RM trend.
- Body metrics.
- PR list.
- Badges.

### Coach

Mục tiêu: đưa gợi ý có thể tin được.

Sections:

- Today's readiness.
- Recommendations queue.
- Explanation card: "Vì sao app đề xuất điều này".
- Accepted/rejected history.
- Ask Coach input, chỉ nên mở sau khi có dữ liệu đủ.

### Settings

Sections:

- Profile.
- Units.
- Wake/sleep time.
- Notification permission.
- Creatine reminder.
- Quick amount presets.
- Privacy/leaderboard opt-in.
- Data export/delete.

## 5. Screen specs

### 5.1 Onboarding

Onboarding nên ngắn, chia thành 4-5 bước, mỗi bước chỉ hỏi một nhóm thông tin.

Step 1: Account

- Email/Google login.
- Có thể cho dùng thử local mode sau này, nhưng MVP nên cần auth để sync.

Step 2: Body and units

- Weight.
- Height.
- Units: kg/ml mặc định cho Việt Nam.

Step 3: Daily rhythm

- Wake time.
- Sleep time.
- Quiet hours auto-fill theo sleep time.

Step 4: Hydration and supplement

- Suggested water goal.
- Quick amount presets: 250ml, 500ml, 750ml.
- Creatine amount: 5g default.
- Creatine reminder time.

Step 5: Workout setup

- Choose template: PPL, Upper/Lower, Full Body, Custom.
- Days per week.
- Start date.

Design notes:

- Mỗi màn hình có progress indicator.
- Dùng pickers/sliders thay vì text input khi có thể.
- Có `Skip for now` với các phần không bắt buộc.

### 5.2 Today screen

Layout mobile:

```text
Top safe area
Header: "Today" + date + sync status

Hydration hero
  Progress ring
  1,250 / 2,500 ml
  "On pace" / "500 ml behind"

Quick add grid
  +250 ml   +500 ml   +750 ml
  Custom slider trigger

Supplement row
  Creatine 5g [Log]
  Next reminder 17:30

Workout today
  Push Day
  6 exercises
  [Start]

Readiness chips
  Energy 4/5   Sleep Good   Soreness Low

Monthly badges strip
  Hydration 18/24 days
  Volume +6%

Recent activity
Bottom tab
```

Key controls:

- Quick amount button: icon + amount, height 56-64px.
- Hydration hero tap opens Hydration detail.
- Custom amount opens bottom sheet with slider.
- Toast after log: "Logged 500 ml" + Undo.

Slider behavior:

- Hydration slider range: 50-1500ml.
- Step: 50ml.
- Display selected amount as large number.
- Primary action: `Log 650 ml`.
- Secondary: `Pin as quick button`.
- After user logs a custom amount 2-3 times, suggest pinning automatically.

### 5.3 Supplement / creatine logging

Supplement row states:

- Not logged: accent border, `Log 5g`.
- Logged: subdued, check icon, timestamp.
- Missed: warning state after configured window.
- Skipped: neutral state.

Creatine custom sheet:

- Slider range: 1-10g.
- Step: 0.5g.
- Quick chips: 3g, 5g, 7.5g.
- Reminder time picker.
- Toggle: remind before scheduled time.

Notification copy:

- "Creatine in 15 minutes"
- Actions: `Log 5g`, `Snooze`

### 5.4 Hydration detail

Components:

- Top progress card.
- Hourly progress line/bar chart.
- Timeline list grouped by time.
- Drink type chips.
- Goal and reminder settings.
- Quick amount editor.

Timeline row:

- Time.
- Drink type icon.
- Amount.
- Edit/delete menu.

Quick amount editor:

- Reorder list.
- Pin/unpin.
- Add custom amount.
- Limit visible quick buttons on Today to 3-4 items.

### 5.5 Workout list

Today's workout card:

- Routine day name.
- Estimated duration.
- Exercise count.
- Last completed date.
- Primary button `Start`.

Weekly schedule:

- Horizontal day chips.
- Completed, scheduled, missed states.

Routine card:

- Name.
- Days/week.
- Muscle split.
- Edit button.

### 5.6 Live Workout

This is the most important UX surface after Today.

Layout:

```text
Sticky top
  Push Day | 24:15 | Exercise 2/6

Current exercise
  Incline Bench Press
  Target: 3 sets x 8-10
  Last: 42.5kg x 8, 8, 7

Set table
  Set  Target     Actual       RPE
  1    42.5 x 8   Done         8
  2    42.5 x 8   Current
  3    42.5 x 8   Pending

Controls
  Weight [-] 42.5kg [+]
  Reps   [-] 8     [+]

Rest timer area

Sticky bottom
  Complete Set
```

Interaction:

- `Complete Set` logs current set instantly.
- Tapping a completed set opens edit sheet.
- Holding weight/reps stepper accelerates.
- Rest timer starts automatically after complete set.
- When rest ends, vibrate/sound/notification if enabled.
- After final set of exercise, show next exercise preview.

Important states:

- Resting.
- Ready for next set.
- Failed target.
- PR detected.
- Workout paused.
- Offline sync pending.

### 5.7 Progress

Progress should be useful but not overwhelming.

Top summary:

- Consistency score.
- Hydration average.
- Workout completed this week.
- Active badges.

Charts:

- Hydration 7/30-day bars.
- Training volume by week.
- e1RM trend by exercise.
- Body weight trend.

Badge panel:

- Current month hydration badge: progress requirement.
- Volume progression badge: current vs previous month.
- Streak months.

### 5.8 Achievements and leaderboard

Achievements should motivate without punishing too hard.

Badge card:

- Badge icon.
- Name.
- Current status: Active, Locked, Lost this month.
- Progress: "18/24 days reached water goal".
- Valid until: end of month.

Leaderboard:

- Hidden unless user opts in.
- Show display name, avatar, badge streak, rank.
- Categories:
  - Hydration consistency.
  - Training progression.
  - Overall consistency.

Privacy:

- Default: private.
- Before opt-in, explain what will be public: display name, avatar, score/rank, badge status.
- Never show raw body metrics or exact workout numbers publicly by default.

### 5.9 Coach

Recommendation card:

- Title: "Giữ mức tạ hôm nay" hoặc "Giảm volume chân 20%".
- Reason: short explanation.
- Confidence/source: Rule-based, AI-assisted.
- Actions: Accept, Reject, Remind me later.

AI copy must be specific and humble:

- Good: "Bạn fail squat 2 buổi liên tiếp và soreness cao. Nên giảm 5-10% tải hôm nay."
- Avoid: "Bạn chắc chắn nên..."

### 5.10 Settings

Settings should be boring and predictable.

Groups:

- Account.
- Units and timezone.
- Daily schedule.
- Notifications.
- Hydration.
- Supplements.
- Workout defaults.
- Privacy.
- Data.

Use native-like list rows with chevrons, toggles, and pickers.

## 6. Component library

### Core components

- `AppShell`
- `BottomTabBar`
- `TopHeader`
- `MetricRing`
- `QuickAmountButton`
- `AmountSliderSheet`
- `SupplementChip`
- `WorkoutTodayCard`
- `ReadinessChip`
- `SetRow`
- `StepperControl`
- `RestTimer`
- `ProgressChartCard`
- `BadgeCard`
- `RecommendationCard`
- `ToastWithUndo`
- `OfflineSyncIndicator`

### Button hierarchy

Primary:

- Filled, high contrast.
- Used for `Log`, `Start Workout`, `Complete Set`, `Accept`.

Secondary:

- Outlined or soft fill.
- Used for `Edit`, `Snooze`, `Pin`.

Destructive:

- Red text or red outline.
- Used for delete/remove only.

Icon buttons:

- Use icons for settings, edit, delete, close, reorder, timer, notification.
- Add tooltip on desktop/tablet.

### Cards

Use cards for discrete modules only:

- Hydration hero.
- Workout today.
- Recommendation.
- Badge.
- Chart.

Do not nest cards inside cards.

## 7. Interaction details

### Logging water

Fast path:

1. User opens Today.
2. Taps `+500ml`.
3. App updates progress instantly.
4. Toast appears with Undo.
5. Sync happens in background.

Custom path:

1. User taps Custom.
2. Bottom sheet opens with slider.
3. User drags to amount.
4. Taps `Log`.
5. App asks/suggests pin if repeated.

### Logging creatine

Fast path:

1. User taps `Log 5g`.
2. Row changes to checked state.
3. Reminder for today is cancelled.

Custom path:

1. User opens creatine sheet.
2. Adjusts slider.
3. Logs amount.
4. Optionally pins amount.

### Completing a set

1. User reviews prefilled weight/reps.
2. Adjusts only if needed.
3. Taps `Complete Set`.
4. Rest timer starts.
5. Next set is prefilled.

### Undo

Undo should be available for:

- Water log.
- Supplement log.
- Set completion.

Toast duration:

- 5-8 seconds.
- Also keep edit available from timeline/history.

## 8. Empty states

Hydration empty:

- Show goal and quick buttons anyway.
- Text: "Chưa có log hôm nay."
- Primary action: `Log 250ml`.

Workout empty:

- If no routine: show template picker.
- If no workout today: show next scheduled workout.

Progress empty:

- Explain that charts appear after 3-7 days of data.
- Do not show fake charts unless clearly marked demo.

Coach empty:

- "Cần thêm vài buổi tập để đưa gợi ý tốt hơn."
- Show checklist of needed data.

## 9. Loading, offline, and error states

Loading:

- Skeleton for cards.
- Do not block quick log if local cache is ready.

Offline:

- Show small offline indicator.
- Allow logging.
- Mark entries as pending sync.
- Retry automatically.

Error:

- For failed sync, keep local log and show retry.
- For failed AI, show rule-based fallback.
- For denied notification permission, show non-blocking warning and in-app reminder fallback.

## 10. Accessibility

- Touch target minimum: 44x44px, preferably 56px for frequent actions.
- Color contrast AA.
- Do not rely only on color for status; use icon/text too.
- All controls need labels.
- Slider must have stepper fallback for precision.
- Support reduced motion.
- Haptic feedback optional, not required for comprehension.

## 11. Responsive behavior

### Mobile

- Single column.
- Bottom navigation.
- Sticky primary action in Live Workout.
- Bottom sheets for edit/custom amount.

### Tablet

- Two-column layout on Today:
  - Left: hydration/supplements.
  - Right: workout/readiness.
- Side panel possible for charts.

### Desktop

- Sidebar navigation.
- Wider charts.
- Live Workout can still stay centered and compact because it is a tool surface.

## 12. Design handoff checklist

Designer should produce:

- Mobile Today screen.
- Hydration custom amount bottom sheet.
- Creatine reminder sheet.
- Workout list screen.
- Live Workout normal/resting/PR states.
- Progress screen with badges.
- Achievements/leaderboard opt-in.
- Coach recommendation screen.
- Settings notification/privacy screens.
- Empty/error/offline states.

Minimum prototype flows:

1. Log water with quick button.
2. Log water with slider and pin amount.
3. Set creatine reminder and log creatine.
4. Start workout and complete 2 sets.
5. Earn monthly badge.
6. Opt in/out of leaderboard.

## 13. MVP visual priorities

Must be polished first:

1. Today hydration hero and quick buttons.
2. Slider bottom sheet.
3. Creatine row/reminder.
4. Live Workout set logging.
5. Rest timer.

Can be simpler in first design:

- Leaderboard.
- AI Coach.
- Advanced analytics.
- Progress photos.
- Native widget mockups.
