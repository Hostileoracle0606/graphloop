# graphloop

A live, self-curating knowledge graph engine for agents. Turns a stream of text utterances into a queryable graph with automatic gap-detection.

## Install

```bash
npm install graphloop ai zod
# Pick your provider:
npm install @ai-sdk/google      # Gemini
npm install @ai-sdk/openai      # OpenAI
npm install @ai-sdk/anthropic   # Anthropic
# ...any AI SDK provider works
```

## Core quickstart

```ts
import { LiveGraphEngine } from "graphloop";
import { google } from "@ai-sdk/google";

const engine = new LiveGraphEngine({
  model: google("gemini-2.0-flash"),
  mode: "granular",
});

engine.onChange((state) => console.log(state.entities));
await engine.ingest("I went running with Maya in Brooklyn.", { role: "user" });

const agenda = engine.getAgenda();
// agenda.thinEntities  → entities needing more context
// agenda.uncertainRelations → relations to verify
// agenda.bridgeCandidates   → pairs to connect
```

## React quickstart

```tsx
import { useLiveGraph } from "graphloop/react";
import { openai } from "@ai-sdk/openai";

function App() {
  const { state, agenda, ingest } = useLiveGraph({
    model: openai("gpt-4o"),
    mode: "wiki",
  });

  return (
    <div>
      <button onClick={() => ingest("Alice leads the Atlas project", { role: "user" })}>
        Ingest
      </button>
      <p>{agenda.entityCount} entities · {agenda.relationCount} relations</p>
    </div>
  );
}
```

## GraphView (optional)

```tsx
import { GraphView } from "graphloop/react/graph-view";
// npm install react-force-graph-2d d3-force-3d

<GraphView
  entities={Object.values(state.entities)}
  relations={Object.values(state.relations)}
/>
```

## How it works

The closed feedback loop — each `ingest()` call extracts entities + relations via the AI SDK's `generateObject` (provider-neutral), merges them into a running `GraphState` with contradiction handling, and immediately surfaces what the graph doesn't yet know via `getAgenda()`. The agenda drives smarter follow-up questions, whose answers flow back into the graph.

## Providers

Any AI SDK provider works — `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/mistral`, etc. You supply the model; `graphloop` handles the extraction structured output.

## v0.1 scope / non-goals

Core engine + React bindings. Not in v0.1: voice/audio adapter, persistence backends beyond in-memory (bring your own `StorageAdapter`), Vue/Svelte bindings.

## License

MIT
