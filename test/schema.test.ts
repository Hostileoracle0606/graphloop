import { describe, expect, test } from "vitest";
import { graphPatchSchema } from "../src/schema";

describe("graphPatchSchema", () => {
  test("accepts a valid patch", () => {
    const r = graphPatchSchema.safeParse({
      entities: [{ name: "Maya", type: "person" }],
      relations: [{ source: "Maya", target: "Atlas", label: "on" }],
    });
    expect(r.success).toBe(true);
  });

  test("rejects an invalid entity type", () => {
    const r = graphPatchSchema.safeParse({
      entities: [{ name: "Maya", type: "alien" }],
      relations: [],
    });
    expect(r.success).toBe(false);
  });
});
