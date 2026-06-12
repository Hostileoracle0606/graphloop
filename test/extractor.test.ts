import { describe, expect, test } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { extract } from "../src/extractor";
import { DEFAULT_PROMPTS } from "../src/prompts";
import { emptyState } from "../src/types";

const mockReturning = (patch: unknown) =>
  new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "text", text: JSON.stringify(patch) }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 20, text: 20, reasoning: undefined },
      },
      warnings: [],
    }),
  });

const baseArgs = {
  state: emptyState(),
  conversation: [],
  mode: "granular" as const,
  prompts: DEFAULT_PROMPTS,
  maxContextEntities: 30,
  temperature: 0.2,
};

describe("extract", () => {
  test("returns a noise-filtered patch from the model", async () => {
    const model = mockReturning({
      entities: [{ name: "Maya", type: "person" }, { name: "I", type: "person" }],
      relations: [],
    });
    const patch = await extract({ ...baseArgs, text: "I met Maya", model });
    expect(patch.entities.map((e) => e.name)).toEqual(["Maya"]); // "I" filtered
  });

  test("returns empty patch on a recoverable model error", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => { throw new Error("safety block"); },
    });
    const patch = await extract({ ...baseArgs, text: "anything", model });
    expect(patch).toEqual({ entities: [], relations: [], supersedes: [] });
  });
});
