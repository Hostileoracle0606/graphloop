import { describe, expect, test } from "vitest";
import { filterNoise, normalizeName } from "../src/noise";
import type { GraphPatch } from "../src/types";

describe("normalizeName", () => {
  test("lowercases and strips punctuation", () => {
    expect(normalizeName("Maya!")).toBe("maya");
    expect(normalizeName("  CS246 ")).toBe("cs246");
  });
});

describe("filterNoise", () => {
  test("drops pronoun/filler entities and relations pointing at them", () => {
    const patch: GraphPatch = {
      entities: [
        { name: "I", type: "person" },
        { name: "Maya", type: "person" },
        { name: "today", type: "other" },
      ],
      relations: [
        { source: "I", target: "Maya", label: "knows" },
        { source: "Maya", target: "Brooklyn", label: "in" },
      ],
      supersedes: ["r1"],
    };
    const out = filterNoise(patch);
    expect(out.entities.map((e) => e.name)).toEqual(["Maya"]);
    expect(out.relations).toEqual([{ source: "Maya", target: "Brooklyn", label: "in" }]);
    expect(out.supersedes).toEqual(["r1"]);
  });

  test("respects extra noise names", () => {
    const patch: GraphPatch = { entities: [{ name: "Lumen", type: "other" }], relations: [] };
    expect(filterNoise(patch, new Set(["lumen"])).entities).toEqual([]);
  });
});
