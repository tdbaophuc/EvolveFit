# Exercise Marketplace Catalog

Cap nhat: 2026-09-27

## Boundary

- `built-in`: bai co san trong app, public read-only, dung lam fallback/offline catalog.
- `marketplace`: bai public curated, user thuong chi doc, tim, xem chi tiet, them vao routine hoac clone thanh custom.
- `custom`: bai rieng cua user, duoc sync/import/export/delete nhu du lieu ca nhan.
- `archived`: khong hien trong marketplace mac dinh, routine cu van giu `definitionId`/ten bai da copy.
- `pending-review` va `draft`: danh cho Goal admin/content governance, khong public cho user thuong.

## Taxonomy MVP

- `muscleGroup`: nhom hien thi chinh: Nguc, Lung, Chan, Vai, Tay, Core hoac Custom.
- `primaryMuscles`/`secondaryMuscles`: ten co chi tiet de search va planner dung.
- `movementPattern`: `push`, `pull`, `squat`, `hinge`, `lunge`, `carry`, `isolation`, `core`.
- `equipment`: `barbell`, `dumbbell`, `cable`, `machine`, `bodyweight`, `kettlebell`, `other`.
- `difficulty`: `beginner`, `intermediate`, `advanced`.
- `forceType`: `push`, `pull`, `static`, `mixed`.
- `tags`: dung cho filter nhanh, vi du `home-friendly`, `unilateral`, `posterior chain`.

## API Surface

- `GET /api/exercises/marketplace`: search/filter/pagination published marketplace exercises.
- `GET /api/exercises/marketplace/:id`: detail theo id hoac slug.
- `GET /api/exercises/marketplace/:id/substitutions`: goi y bai thay the theo equipment.
- `POST /api/exercises/marketplace/:id/clone`: tao custom copy user-owned.
- `POST /api/exercises/marketplace/:id/add-to-routine`: them bai vao routine day cua user.

## Seed/Publish Runbook

1. Them bai curated vao `marketplaceExerciseDefinitions` cho local/offline fallback.
2. Neu staging/production dung Supabase, insert/upsert vao `exercise_library` voi `catalog_source='marketplace'`, `status='published'`, `built_in=true`, `slug` unique.
3. Dam bao `source` va `license` ro rang truoc khi publish media/copy.
4. Archive thay vi hard-delete khi bai da tung duoc user them vao routine.
5. Goal admin se bo sung dashboard publish/archive va audit log; truoc do chi publish bang migration/SQL co review.
