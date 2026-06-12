import { describe, expect, test } from "vitest";
import { DEFAULT_PROMPTS } from "../src/prompts";

describe("DEFAULT_PROMPTS", () => {
  test("has both modes, non-empty, de-branded", () => {
    expect(DEFAULT_PROMPTS.wiki.length).toBeGreaterThan(200);
    expect(DEFAULT_PROMPTS.granular.length).toBeGreaterThan(200);
    expect(DEFAULT_PROMPTS.wiki).not.toMatch(/lumen/i);
    expect(DEFAULT_PROMPTS.granular).not.toMatch(/lumen/i);
  });
});
