import type { LanguageModel } from "ai";

export type EntityType =
  | "person" | "place" | "organization" | "project" | "event"
  | "activity" | "concept" | "emotion" | "other";

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  description?: string;
  metadata: Record<string, string | number | boolean>;
  mentions: number;
  firstSeen: string;
  lastSeen: string;
  questions?: string[];
}

export interface Relation {
  id: string;
  source: string;
  target: string;
  label: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
  supersededAt?: string;
}

export interface GraphEntry {
  id: string;
  text: string;
  createdAt: string;
  entityIds: string[];
  relationIds: string[];
}

export interface GraphState {
  entities: Record<string, Entity>;
  relations: Record<string, Relation>;
  entries: GraphEntry[];
}

export type ExtractionMode = "wiki" | "granular";

export type IngestRole = "user" | "agent" | "source";

export interface ConversationTurn {
  role: IngestRole;
  text: string;
  createdAt: string;
}

export interface GraphPatch {
  entities: Array<{
    name: string;
    type: EntityType;
    description?: string;
    metadata?: Record<string, string>;
    questions?: string[];
  }>;
  relations: Array<{
    source: string;
    target: string;
    label: string;
    metadata?: Record<string, string>;
  }>;
  supersedes?: string[];
}

export interface Agenda {
  thinEntities: string[];
  justMentioned: string[];
  uncertainRelations: Array<{ source: string; label: string; target: string; score: number }>;
  bridgeCandidates: Array<[string, string]>;
  openQuestions: Array<{ entity: string; question: string }>;
  entityCount: number;
  relationCount: number;
}

export interface StorageAdapter {
  load(): Promise<GraphState | null>;
  save(state: GraphState): Promise<void>;
  clear?(): Promise<void>;
}

export interface EngineConfig {
  model: LanguageModel;
  mode?: ExtractionMode;
  storage?: StorageAdapter;
  prompts?: Partial<Record<ExtractionMode, string>>;
  maxContextEntities?: number;
  conversationWindow?: number;
  temperature?: number;
  providerOptions?: Record<string, unknown>;
  noiseNames?: Iterable<string>;
  onError?: (err: unknown) => void;
}

export const emptyState = (): GraphState => ({ entities: {}, relations: {}, entries: [] });
export const emptyPatch = (): GraphPatch => ({ entities: [], relations: [], supersedes: [] });
