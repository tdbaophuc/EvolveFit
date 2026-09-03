import { describe, expect, it } from "vitest";
import { createDataAdapter, MemoryDataAdapter, SupabaseRestAdapter } from "./data-adapter";

type Row = { id: string; name: string; value?: number };

describe("data adapters", () => {
  it("supports memory CRUD", async () => {
    const adapter = new MemoryDataAdapter<Row>([{ id: "1", name: "A" }]);
    const created = await adapter.create({ name: "B", value: 2 });
    expect(created.id).toBeTruthy();
    expect(await adapter.list()).toHaveLength(2);
    expect((await adapter.update(created.id, { value: 3 })).value).toBe(3);
    expect(await adapter.remove(created.id)).toEqual({ id: created.id });
  });

  it("selects Supabase adapter when env exists", () => {
    const adapter = createDataAdapter<Row>("rows", [], {
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
    });

    expect(adapter).toBeInstanceOf(SupabaseRestAdapter);
  });

  it("falls back to memory adapter without env", () => {
    expect(createDataAdapter<Row>("rows", [], {})).toBeInstanceOf(MemoryDataAdapter);
  });
});
