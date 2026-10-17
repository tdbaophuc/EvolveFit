"use client";

import React, { useState, type FormEvent } from "react";
import { ChevronRight, Dumbbell, Plus, Search, SlidersHorizontal } from "lucide-react";
import { isUserOwnedExercise, type EquipmentType, type ExerciseDefinition, type MovementPattern } from "@evolvefit/shared";
import { Button, Chip, EmptyState, FormField, InlineNotice, SegmentedControl, Sheet } from "@/components/ui";
import { difficultyLabel, equipmentLabel, movementLabel, muscleBuckets, muscleLabel } from "@/lib/i18n/vi";
import { useLibraryScreen, type CustomExerciseInput, type LibraryFilters } from "./use-library-screen";

const equipmentOptions = Object.keys(equipmentLabel) as EquipmentType[];
const movementOptions = Object.keys(movementLabel) as MovementPattern[];
const selectClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-[15px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

function metaLine(exercise: ExerciseDefinition) {
  return [muscleLabel(exercise.muscleGroup), equipmentLabel[exercise.equipment] ?? exercise.equipment, exercise.difficulty ? difficultyLabel[exercise.difficulty] : undefined]
    .filter(Boolean)
    .join(" • ");
}

function sourceBadge(exercise: ExerciseDefinition) {
  if (isUserOwnedExercise(exercise)) return "Bài của tôi";
  return exercise.catalogSource === "marketplace" ? "Marketplace" : "Có sẵn";
}

/** Fixed-height row (spec 9.5): truncation instead of overlap; tapping opens the detail sheet. */
function ExerciseRow({ exercise, onOpen }: { exercise: ExerciseDefinition; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${exercise.name}: xem chi tiết`}
        className="flex min-h-[76px] w-full cursor-pointer items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
          <Dumbbell size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{exercise.name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{metaLine(exercise)}</span>
          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{sourceBadge(exercise)}</span>
        </span>
        <ChevronRight size={18} aria-hidden className="shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

function DetailList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="grid gap-1.5">
      <h3 className="m-0 text-sm font-semibold">{title}</h3>
      <ul className="m-0 grid gap-1 pl-5 text-[15px] leading-6 text-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function CustomExerciseForm({ initial, submitLabel, onSubmit }: { initial?: ExerciseDefinition; submitLabel: string; onSubmit: (input: CustomExerciseInput) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [muscleGroup, setMuscleGroup] = useState(initial?.muscleGroup ?? "Ngực");
  const [equipment, setEquipment] = useState<EquipmentType>(initial?.equipment ?? "dumbbell");
  const [movementPattern, setMovementPattern] = useState<MovementPattern>(initial?.movementPattern ?? "isolation");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Nhập tên bài tập.");
      return;
    }
    onSubmit({ name: name.trim(), muscleGroup: muscleGroup.trim() || "Tùy chỉnh", equipment, movementPattern });
  }

  return (
    <form className="grid gap-3" onSubmit={submit} aria-label={submitLabel}>
      <FormField label="Tên bài tập" value={name} onChange={(event) => setName(event.target.value)} error={error || undefined} autoFocus />
      <label className="grid gap-1.5 text-sm font-medium">
        Nhóm cơ
        <select className={selectClass} value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}>
          {muscleBuckets.map((bucket) => (
            <option key={bucket.id} value={bucket.label}>
              {bucket.label}
            </option>
          ))}
          {!muscleBuckets.some((bucket) => bucket.label === muscleGroup) && <option value={muscleGroup}>{muscleGroup}</option>}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Dụng cụ
        <select className={selectClass} value={equipment} onChange={(event) => setEquipment(event.target.value as EquipmentType)}>
          {equipmentOptions.map((item) => (
            <option key={item} value={item}>
              {equipmentLabel[item]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Kiểu chuyển động
        <select className={selectClass} value={movementPattern} onChange={(event) => setMovementPattern(event.target.value as MovementPattern)}>
          {movementOptions.map((item) => (
            <option key={item} value={item}>
              {movementLabel[item]}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" fullWidth>
        {submitLabel}
      </Button>
    </form>
  );
}

function FilterSheet(props: { open: boolean; onClose: () => void; filters: LibraryFilters; tags: string[]; setFilters: (next: Partial<LibraryFilters>) => void; reset: () => void }) {
  return (
    <Sheet
      open={props.open}
      onClose={props.onClose}
      title="Bộ lọc"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={props.reset}>
            Xoá bộ lọc
          </Button>
          <Button onClick={props.onClose}>Xem kết quả</Button>
        </div>
      }
    >
      <div className="grid gap-5">
        <fieldset className="m-0 grid gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">Dụng cụ</legend>
          <div className="flex flex-wrap gap-2">
            <Chip selected={props.filters.equipment === "all"} onClick={() => props.setFilters({ equipment: "all" })}>
              Tất cả
            </Chip>
            {equipmentOptions.map((item) => (
              <Chip key={item} selected={props.filters.equipment === item} onClick={() => props.setFilters({ equipment: item })}>
                {equipmentLabel[item]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0 grid gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">Độ khó</legend>
          <div className="flex flex-wrap gap-2">
            {(["all", "beginner", "intermediate", "advanced"] as const).map((item) => (
              <Chip key={item} selected={props.filters.difficulty === item} onClick={() => props.setFilters({ difficulty: item })}>
                {item === "all" ? "Tất cả" : difficultyLabel[item]}
              </Chip>
            ))}
          </div>
        </fieldset>
        {props.tags.length > 0 && (
          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-2 text-sm font-semibold">Tag</legend>
            <div className="flex flex-wrap gap-2">
              <Chip selected={props.filters.tag === "all"} onClick={() => props.setFilters({ tag: "all" })}>
                Tất cả
              </Chip>
              {props.tags.map((tag) => (
                <Chip key={tag} selected={props.filters.tag === tag} onClick={() => props.setFilters({ tag })}>
                  {tag}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </Sheet>
  );
}

/** Exercise library (spec 9.5). */
export function LibraryScreen() {
  const screen = useLibraryScreen();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selected = screen.selected;
  const selectedIsMine = selected ? isUserOwnedExercise(selected) : false;

  function closeDetail() {
    setEditing(false);
    setConfirmDelete(false);
    screen.close();
  }

  return (
    <div className="grid gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold leading-8">Thư viện bài tập</h1>
          <p className="m-0 text-sm leading-5 text-muted-foreground">{screen.totalResults} bài phù hợp</p>
        </div>
        <Button size="sm" variant="secondary" leadingIcon={<Plus size={16} />} onClick={() => setCreating(true)}>
          Tạo bài
        </Button>
      </header>

      <SegmentedControl
        label="Nguồn bài tập"
        value={screen.tab}
        onChange={screen.setTab}
        options={[
          { value: "catalog", label: "Thư viện" },
          { value: "mine", label: `Bài của tôi (${screen.ownCount})` }
        ]}
      />

      <div className="relative">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          aria-label="Tìm bài tập"
          placeholder="Tìm theo tên, nhóm cơ, dụng cụ…"
          value={screen.search}
          onChange={(event) => screen.setSearch(event.target.value)}
          className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-[15px] placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Lọc theo nhóm cơ">
        <Chip selected={screen.filters.bucket === "all"} onClick={() => screen.setFilters({ bucket: "all" })}>
          Tất cả
        </Chip>
        {muscleBuckets.map((bucket) => (
          <Chip key={bucket.id} selected={screen.filters.bucket === bucket.id} onClick={() => screen.setFilters({ bucket: bucket.id })} className="shrink-0">
            {bucket.label}
          </Chip>
        ))}
        <Chip selected={screen.activeFilterCount > 0} onClick={() => setFiltersOpen(true)} className="shrink-0">
          <SlidersHorizontal size={14} aria-hidden /> Bộ lọc{screen.activeFilterCount ? ` (${screen.activeFilterCount})` : ""}
        </Chip>
      </div>

      {screen.catalogUnavailable && <InlineNotice tone="warning">Không tải được thư viện trên máy chủ. Đang hiển thị bản có sẵn trên thiết bị.</InlineNotice>}

      {screen.results.length ? (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Kết quả bài tập">
          {screen.results.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} onOpen={() => screen.open(exercise.id)} />
          ))}
        </ul>
      ) : screen.tab === "mine" && !screen.ownCount ? (
        <EmptyState
          icon={<Dumbbell size={28} />}
          title="Chưa có bài tự tạo"
          description="Tạo bài riêng khi thư viện chưa có biến thể bạn cần."
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              Tạo bài
            </Button>
          }
        />
      ) : (
        <EmptyState
          title="Không có bài phù hợp"
          description="Thử bỏ bớt bộ lọc hoặc tìm theo từ khoá khác."
          action={
            <Button size="sm" variant="secondary" onClick={screen.resetFilters}>
              Xoá bộ lọc
            </Button>
          }
        />
      )}
      {screen.results.length < screen.totalResults && (
        <Button variant="secondary" onClick={screen.showMore}>
          Xem thêm ({screen.totalResults - screen.results.length})
        </Button>
      )}

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={screen.filters} tags={screen.tags} setFilters={screen.setFilters} reset={screen.resetFilters} />

      <Sheet open={creating} onClose={() => setCreating(false)} title="Tạo bài tập riêng">
        <CustomExerciseForm
          submitLabel="Tạo bài"
          onSubmit={(input) => {
            screen.createCustom(input);
            setCreating(false);
            screen.setTab("mine");
          }}
        />
      </Sheet>

      <Sheet
        open={Boolean(selected)}
        onClose={closeDetail}
        title={selected?.name ?? ""}
        description={selected ? metaLine(selected) : undefined}
        footer={
          selected && !editing ? (
            <div className="grid gap-2">
              <Button
                fullWidth
                disabled={!screen.targetDayName}
                onClick={() => {
                  screen.addToDay(selected);
                  closeDetail();
                }}
              >
                {screen.targetDayName ? `Thêm vào ${screen.targetDayName}` : "Chưa có ngày tập để thêm"}
              </Button>
              {selectedIsMine ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    Sửa
                  </Button>
                  {confirmDelete ? (
                    <Button variant="danger" onClick={() => screen.deleteCustom(selected.id)}>
                      Xác nhận xoá
                    </Button>
                  ) : (
                    <Button variant="danger-soft" onClick={() => setConfirmDelete(true)}>
                      Xoá bài
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => {
                    screen.cloneToMine(selected);
                    closeDetail();
                  }}
                >
                  Tạo bản riêng để chỉnh sửa
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {selected &&
          (editing ? (
            <CustomExerciseForm
              initial={selected}
              submitLabel="Lưu thay đổi"
              onSubmit={(input) => {
                screen.updateCustom(selected.id, input);
                setEditing(false);
              }}
            />
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{sourceBadge(selected)}</span>
                {selected.movementPattern && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{movementLabel[selected.movementPattern]}</span>}
                {(selected.primaryMuscles ?? []).map((muscle) => (
                  <span key={muscle} className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground">
                    {muscle}
                  </span>
                ))}
              </div>
              <DetailList title="Gợi ý kỹ thuật" items={selected.cues} />
              <DetailList title="Lỗi thường gặp" items={selected.commonMistakes} />
              <DetailList title="Bài thay thế" items={selected.substitutions} />
              <DetailList title="Lưu ý" items={selected.contraindications} />
              {selected.notes && <p className="m-0 text-[15px] leading-6">{selected.notes}</p>}
              {(selected.source || selected.license) && (
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer font-medium">Nguồn và giấy phép</summary>
                  <p className="m-0 mt-2">{[selected.source, selected.license].filter(Boolean).join(" • ")}</p>
                </details>
              )}
            </div>
          ))}
      </Sheet>
    </div>
  );
}
