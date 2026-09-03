import { createSupabaseRestRequest } from "./integrations";

export type DataAdapter<T extends { id: string }> = {
  list(): Promise<T[]>;
  create(input: Omit<T, "id">): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<{ id: string }>;
};

export class MemoryDataAdapter<T extends { id: string }> implements DataAdapter<T> {
  constructor(private readonly rows: T[]) {}

  async list(): Promise<T[]> {
    return this.rows;
  }

  async create(input: Omit<T, "id">): Promise<T> {
    const row = { ...input, id: crypto.randomUUID() } as T;
    this.rows.push(row);
    return row;
  }

  async update(id: string, patch: Partial<T>): Promise<T> {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error("row not found");
    Object.assign(row, patch);
    return row;
  }

  async remove(id: string): Promise<{ id: string }> {
    const index = this.rows.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("row not found");
    this.rows.splice(index, 1);
    return { id };
  }
}

export class SupabaseRestAdapter<T extends { id: string }> implements DataAdapter<T> {
  constructor(
    private readonly table: string,
    private readonly env: NodeJS.ProcessEnv = process.env
  ) {}

  async list(): Promise<T[]> {
    const response = await fetch(createSupabaseRestRequest(`${this.table}?select=*`, { method: "GET" }, this.env));
    if (!response.ok) throw new Error(`Supabase list failed: ${response.status}`);
    return (await response.json()) as T[];
  }

  async create(input: Omit<T, "id">): Promise<T> {
    const response = await fetch(
      createSupabaseRestRequest(this.table, { method: "POST", body: JSON.stringify(input) }, this.env)
    );
    if (!response.ok) throw new Error(`Supabase create failed: ${response.status}`);
    return ((await response.json()) as T[])[0];
  }

  async update(id: string, patch: Partial<T>): Promise<T> {
    const response = await fetch(
      createSupabaseRestRequest(`${this.table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(patch) }, this.env)
    );
    if (!response.ok) throw new Error(`Supabase update failed: ${response.status}`);
    return ((await response.json()) as T[])[0];
  }

  async remove(id: string): Promise<{ id: string }> {
    const response = await fetch(createSupabaseRestRequest(`${this.table}?id=eq.${id}`, { method: "DELETE" }, this.env));
    if (!response.ok) throw new Error(`Supabase delete failed: ${response.status}`);
    return { id };
  }
}

export function createDataAdapter<T extends { id: string }>(
  table: string,
  memoryRows: T[],
  env: NodeJS.ProcessEnv = process.env
): DataAdapter<T> {
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new SupabaseRestAdapter<T>(table, env);
  }
  return new MemoryDataAdapter<T>(memoryRows);
}
