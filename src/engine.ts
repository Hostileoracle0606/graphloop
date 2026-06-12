import { buildAgenda } from "./agenda";
import { extract } from "./extractor";
import { merge } from "./merge";
import { DEFAULT_PROMPTS } from "./prompts";
import { InMemoryStorage } from "./storage";
import {
  emptyState,
  type Agenda,
  type ConversationTurn,
  type EngineConfig,
  type ExtractionMode,
  type GraphState,
  type IngestRole,
  type StorageAdapter,
} from "./types";

export class LiveGraphEngine {
  private state: GraphState = emptyState();
  private conversation: ConversationTurn[] = [];
  private listeners = new Set<(s: GraphState) => void>();
  private inFlight: AbortController | null = null;

  private readonly model;
  private mode: ExtractionMode;
  private readonly storage: StorageAdapter;
  private readonly prompts: Record<ExtractionMode, string>;
  private readonly maxContextEntities: number;
  private readonly conversationWindow: number;
  private readonly temperature: number;
  private readonly providerOptions;
  private readonly noiseNames?: Iterable<string>;
  private readonly onError?: (err: unknown) => void;

  constructor(config: EngineConfig) {
    this.model = config.model;
    this.mode = config.mode ?? "granular";
    this.storage = config.storage ?? new InMemoryStorage();
    this.prompts = { ...DEFAULT_PROMPTS, ...(config.prompts ?? {}) };
    this.maxContextEntities = config.maxContextEntities ?? 30;
    this.conversationWindow = config.conversationWindow ?? 8;
    this.temperature = config.temperature ?? 0.2;
    this.providerOptions = config.providerOptions;
    this.noiseNames = config.noiseNames;
    this.onError = config.onError;
  }

  getState(): GraphState { return this.state; }
  getAgenda(): Agenda { return buildAgenda(this.state, this.conversation); }
  getStorage(): StorageAdapter { return this.storage; }
  setMode(mode: ExtractionMode) { this.mode = mode; }

  onChange(cb: (s: GraphState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() { for (const cb of this.listeners) cb(this.state); }

  async hydrate(): Promise<void> {
    const loaded = await this.storage.load();
    if (loaded) { this.state = loaded; this.emit(); }
  }

  abort() { this.inFlight?.abort(); this.inFlight = null; }

  reset() {
    this.abort();
    this.state = emptyState();
    this.conversation = [];
    void this.storage.save(this.state);
    this.emit();
  }

  async ingest(text: string, opts: { role?: IngestRole } = {}): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    const role = opts.role ?? "source";
    this.conversation.push({ role, text: trimmed, createdAt: new Date().toISOString() });
    if (this.conversation.length > this.conversationWindow) {
      this.conversation = this.conversation.slice(-this.conversationWindow);
    }

    this.inFlight?.abort();
    const controller = new AbortController();
    this.inFlight = controller;

    try {
      const patch = await extract({
        text: trimmed,
        state: this.state,
        conversation: this.conversation,
        model: this.model,
        mode: this.mode,
        prompts: this.prompts,
        maxContextEntities: this.maxContextEntities,
        temperature: this.temperature,
        providerOptions: this.providerOptions,
        noiseNames: this.noiseNames,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      this.state = merge(this.state, trimmed, patch).next;
      await this.storage.save(this.state);
      this.emit();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      this.onError?.(err);
    } finally {
      if (this.inFlight === controller) this.inFlight = null;
    }
  }
}
