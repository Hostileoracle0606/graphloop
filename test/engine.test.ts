import { describe, expect, test, vi } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { LiveGraphEngine } from "../src/engine";

const mockReturning = (patch: unknown) =>
  new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "text", text: JSON.stringify(patch) }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    }),
  });

describe("LiveGraphEngine", () => {
  test("ingest extracts, merges, and emits onChange", async () => {
    const engine = new LiveGraphEngine({
      model: mockReturning({
        entities: [{ name: "Maya", type: "person" }],
        relations: [],
      }),
    });
    const onChange = vi.fn();
    engine.onChange(onChange);
    await engine.ingest("I met Maya today", { role: "user" });

    expect(engine.getState().entities["maya"]!.name).toBe("Maya");
    expect(onChange).toHaveBeenCalledOnce();
    expect(engine.getAgenda().entityCount).toBe(1);
  });

  test("hydrate loads prior state from storage", async () => {
    const first = new LiveGraphEngine({
      model: mockReturning({ entities: [{ name: "Atlas", type: "project" }], relations: [] }),
    });
    await first.ingest("Atlas is live", { role: "user" });
    const saved = first.getStorage();

    const second = new LiveGraphEngine({ model: mockReturning({ entities: [], relations: [] }), storage: saved });
    await second.hydrate();
    expect(second.getState().entities["atlas"]!.name).toBe("Atlas");
  });
});
