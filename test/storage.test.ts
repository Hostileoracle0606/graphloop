import { describe, expect, test } from "vitest";
import { InMemoryStorage } from "../src/storage";
import { emptyState } from "../src/types";

describe("InMemoryStorage", () => {
  test("returns null before save, round-trips after", async () => {
    const s = new InMemoryStorage();
    expect(await s.load()).toBeNull();
    const state = emptyState();
    state.entities["maya"] = {
      id: "maya", name: "Maya", type: "person", metadata: {},
      mentions: 1, firstSeen: "t", lastSeen: "t",
    };
    await s.save(state);
    expect((await s.load())?.entities["maya"]!.name).toBe("Maya");
  });
});
