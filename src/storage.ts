import type { GraphState, StorageAdapter } from "./types";

export class InMemoryStorage implements StorageAdapter {
  private state: GraphState | null = null;

  async load(): Promise<GraphState | null> {
    return this.state ? structuredClone(this.state) : null;
  }

  async save(state: GraphState): Promise<void> {
    this.state = structuredClone(state);
  }

  async clear(): Promise<void> {
    this.state = null;
  }
}
