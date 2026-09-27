import { AsyncLocalStorage } from "node:async_hooks";
import type { AppState } from "@evolvefit/shared";
import { initialState } from "@evolvefit/shared";
import type { ApiUser, AppRepository } from "./repositories";
import { demoUser, MemoryAppRepository } from "./repositories";
import type { ResourceMutation } from "./repositories";

export type ApiRuntime = {
  user: ApiUser;
  repository: AppRepository;
  state: AppState;
  mutations: ResourceMutation[];
};

const runtimeStorage = new AsyncLocalStorage<ApiRuntime>();
const demoState = structuredClone(initialState);
const fallbackRepository = new MemoryAppRepository();

export function currentApiState(): AppState {
  return runtimeStorage.getStore()?.state ?? demoState;
}

export function currentApiRuntime(): ApiRuntime {
  const runtime = runtimeStorage.getStore();
  if (runtime) return runtime;
  return { user: demoUser(demoState.profile.email), repository: fallbackRepository, state: demoState, mutations: [] };
}

export async function runWithApiRuntime<T>(runtime: ApiRuntime, handler: () => Promise<T> | T): Promise<T> {
  return runtimeStorage.run(runtime, handler);
}

export function recordResourceMutation(mutation: ResourceMutation): void {
  runtimeStorage.getStore()?.mutations.push(mutation);
}

export function resourceMutationCheckpoint(): number {
  return runtimeStorage.getStore()?.mutations.length ?? 0;
}

export function drainResourceMutations(fromIndex = 0): ResourceMutation[] {
  const runtime = runtimeStorage.getStore();
  if (!runtime) return [];
  const mutations = runtime.mutations.splice(fromIndex);
  return mutations;
}
