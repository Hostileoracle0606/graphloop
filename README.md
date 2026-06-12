<div align="center">

# graphloop

**Live, self-curating knowledge graph engine for AI agents**

[![npm version](https://img.shields.io/npm/v/graphloop?color=0f172a&label=npm)](https://www.npmjs.com/package/graphloop)
[![license](https://img.shields.io/badge/license-MIT-0f172a)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-0f172a)](https://www.typescriptlang.org/)
[![AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-provider--neutral-0f172a)](https://sdk.vercel.ai/)

</div>

---

`graphloop` turns a stream of text utterances into a **live, incrementally-built knowledge graph** and — critically — tells your agent exactly what it doesn't yet know.

Every `ingest()` call extracts entities and relations using your chosen model, merges them into a running `GraphState` with full contradiction handling, then immediately returns an **Agenda**: which entities are thin, which relations are uncertain, and which entity pairs could be bridged. The agent reads the agenda to decide its next question. That answer flows back into the graph. The loop closes.

```
ingest(text) ──► extractor (generateObject) ──► GraphPatch
                                                      │
                      abort superseded calls          ▼
                                         merge reducer ──► GraphState ──► onChange()
                                                      │
                                         getAgenda() ──► Agenda
                                                      │
             agent asks a better question ◄──────────┘
```

## Features

- **Provider-neutral extraction** — plug in any model via the [Vercel AI SDK](https://sdk.vercel.ai/): Gemini, GPT-4o, Claude, Mistral, or any compatible provider
- **Self-curating agenda** — `getAgenda()` surfaces thin entities, uncertain relations, and bridge candidates so agents know exactly what to ask next
- **Contradiction handling** — the merge reducer soft-deletes superseded relations and self-heals them if re-asserted; your graph stays consistent as facts change
- **Abort/supersede pattern** — mid-utterance extractions are cancelled when newer context arrives; only the most recent write counts
- **Two extraction modes** — `"granular"` (high recall, all named entities) and `"wiki"` (high precision, anchored entities with follow-up question backlog)
- **Pluggable storage** — swap in Supabase, Postgres, Redis, or `localStorage` via a two-method `StorageAdapter` interface; in-memory default included
- **Optional React bindings** — `useLiveGraph` hook + force-directed `GraphView` renderer, shipped behind subpath exports so server-only users pay zero bundle cost

## Installation

```bash
npm install graphloop ai zod
```

Install your model provider:

```bash
npm install @ai-sdk/google      # Gemini
npm install @ai-sdk/openai      # OpenAI / GPT
npm install @ai-sdk/anthropic   # Claude
npm install @ai-sdk/mistral     # Mistral
```

Any provider that implements the AI SDK `LanguageModel` interface works.

## Quickstart

### Core (framework-free)

```ts
import { LiveGraphEngine } from "graphloop";
import { google } from "@ai-sdk/google";

const engine = new LiveGraphEngine({
  model: google("gemini-2.0-flash"),
  mode: "granular",          // "granular" | "wiki"
});

// Subscribe to every graph update
engine.onChange((state) => {
  console.log(`${Object.keys(state.entities).length} entities in graph`);
});

// Ingest a turn — extraction runs, graph updates, onChange fires
await engine.ingest("I went running with Maya in Brooklyn this morning.", {
  role: "user",
});

// Ask the graph what it doesn't yet know
const agenda = engine.getAgenda();
console.log(agenda.thinEntities);        // ["Maya", "Brooklyn"]  — need more context
console.log(agenda.uncertainRelations);  // [{ source: "I", label: "ran_with", target: "Maya", score: 3 }]
console.log(agenda.bridgeCandidates);    // entity pairs to probe
console.log(agenda.openQuestions);       // wiki-mode question backlog per entity
```

### React

```tsx
import { useLiveGraph } from "graphloop/react";
import { openai } from "@ai-sdk/openai";

export function KnowledgePanel() {
  const { state, agenda, ingest, status } = useLiveGraph({
    model: openai("gpt-4o"),
    mode: "wiki",
  });

  return (
    <div>
      <button
        disabled={status === "extracting"}
        onClick={() =>
          ingest("Alice leads the Atlas project with Sam on infrastructure.", {
            role: "user",
          })
        }
      >
        {status === "extracting" ? "Thinking…" : "Ingest"}
      </button>

      <p>
        {agenda.entityCount} entities · {agenda.relationCount} relations
      </p>

      {agenda.thinEntities.length > 0 && (
        <p>Ask about: {agenda.thinEntities.slice(0, 3).join(", ")}</p>
      )}
    </div>
  );
}
```

### GraphView — force-directed renderer (optional)

```tsx
import { GraphView } from "graphloop/react/graph-view";

// Peer deps for the renderer only — core and hook are unaffected
// npm install react-force-graph-2d d3-force-3d

<GraphView
  entities={Object.values(state.entities)}
  relations={Object.values(state.relations)}
/>
```

> `GraphView` is on its own subpath (`graphloop/react/graph-view`) so importing `graphloop/react` never pulls in the force-graph bundle.

---

## Core concepts

### Extraction modes

| Mode | When to use |
|---|---|
| `"granular"` | Maximum recall — extracts all named entities and wires dense relations. Good for document ingestion, chat logs, open-ended conversations. |
| `"wiki"` | Precision-first — applies a "wiki-page test" (would this entity anchor a real article?). Populates a `questions` backlog per entity for structured follow-up. Good for interview-style agents where depth matters more than breadth. |

### The Agenda

`engine.getAgenda()` returns a snapshot of what the graph doesn't know:

| Field | Description |
|---|---|
| `thinEntities` | Entity names with < 30 words of coverage, ranked by mentions. Ask about these first. |
| `justMentioned` | Entities named in the most recent utterance — highest relevance for immediate follow-up. |
| `uncertainRelations` | Relations scored 0–3 on structural signals (single-mention, cross-turn endpoints, first-time pair). Score ≥ 2 surfaces. |
| `bridgeCandidates` | Entity pairs that share a common neighbor but have no direct relation. The graph suspects a connection. |
| `openQuestions` | Per-entity question backlog populated in `"wiki"` mode. |

### Contradiction handling

When a user corrects a prior statement, the extractor returns the contradicted relation's id in `supersedes`. The merge reducer stamps `supersededAt` on the old relation (soft-delete) so it disappears from active queries. If the user re-asserts the same relation later, `supersededAt` is cleared automatically — no manual reconciliation needed.

### Custom storage

Persist the graph anywhere by implementing two methods:

```ts
import type { StorageAdapter, GraphState } from "graphloop";

class SupabaseAdapter implements StorageAdapter {
  async load(): Promise<GraphState | null> {
    const { data } = await supabase.from("graphs").select("state").single();
    return data?.state ?? null;
  }
  async save(state: GraphState): Promise<void> {
    await supabase.from("graphs").upsert({ state });
  }
}

const engine = new LiveGraphEngine({
  model: google("gemini-2.0-flash"),
  storage: new SupabaseAdapter(),
});

await engine.hydrate(); // load persisted state on startup
```

### Advanced config

```ts
const engine = new LiveGraphEngine({
  model: anthropic("claude-opus-4-8"),

  mode: "wiki",

  // Override prompts entirely
  prompts: {
    wiki: "You are a precision extractor. Only extract entities anchored by...",
    granular: "...",
  },

  // How many existing entities to send as context to the extractor (default: 30)
  maxContextEntities: 50,

  // Conversation window for pronoun resolution (default: 8 turns)
  conversationWindow: 12,

  // Model temperature (default: 0.2)
  temperature: 0.1,

  // Additional noise names to filter from output
  noiseNames: ["bot", "assistant", "system"],

  // Provider-specific options (e.g. Gemini thinking budget)
  providerOptions: {
    google: { thinkingConfig: { thinkingBudget: 0 } },
  },

  onError: (err) => console.error("[graphloop]", err),
});
```

---

## API reference

### `LiveGraphEngine`

| Method | Signature | Description |
|---|---|---|
| `ingest` | `(text: string, opts?: { role?: "user" \| "agent" \| "source" }) => Promise<void>` | Extract entities + relations from text, merge into graph, fire `onChange`. Aborts any in-flight extraction. |
| `getState` | `() => GraphState` | Current graph snapshot. |
| `getAgenda` | `() => Agenda` | Self-curating planner snapshot. |
| `onChange` | `(cb: (state: GraphState) => void) => () => void` | Subscribe to graph updates; returns unsubscribe. |
| `hydrate` | `() => Promise<void>` | Load prior state from storage adapter (call once on startup). |
| `reset` | `() => void` | Clear graph and conversation buffer. |
| `abort` | `() => void` | Cancel any in-flight extraction. |
| `setMode` | `(mode: ExtractionMode) => void` | Switch extraction mode at runtime. |
| `getStorage` | `() => StorageAdapter` | Access the underlying storage adapter. |

### `useLiveGraph(config)` — React hook

Returns `{ state, agenda, ingest, status, error, reset }`. Engine is created once and stable across renders. Config changes (e.g. `model` prop) are read through a ref and take effect on the next `ingest()` call without tearing down the session.

### Exports

```ts
// Core
import {
  LiveGraphEngine,
  merge, slugify,
  buildAgenda,
  extract,
  filterNoise, normalizeName, DEFAULT_NOISE_NAMES,
  graphPatchSchema, entityPatchSchema, relationPatchSchema, ENTITY_TYPES,
  DEFAULT_PROMPTS, WIKI_EXTRACTOR_PROMPT, GRANULAR_EXTRACTOR_PROMPT,
  InMemoryStorage,
  emptyState, emptyPatch,
} from "graphloop";

// React hook
import { useLiveGraph } from "graphloop/react";

// Force-directed renderer (heavy optional peer deps)
import { GraphView, GraphMinimap, GraphLegend } from "graphloop/react/graph-view";
```

---

## v0.1 scope

**What's included:** core engine, React bindings (`useLiveGraph`), force-directed renderer (`GraphView`), in-memory storage.

**Deferred to v0.2+:**
- Voice/audio adapter (Gemini Live, WebRTC transcript feeds)
- Persistence backends (Supabase, Postgres, Redis) as official packages
- Vue and Svelte bindings
- Streaming extraction (`streamObject` for partial entity pop-in mid-utterance)
- Obsidian/Markdown export

---

## License

MIT © 2026 Trinab
