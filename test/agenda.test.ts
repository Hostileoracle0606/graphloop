import { describe, expect, test } from "vitest";
import { buildAgenda } from "../src/agenda";
import { merge } from "../src/merge";
import { emptyState } from "../src/types";

describe("buildAgenda", () => {
  test("classifies a one-mention entity as thin and surfaces open questions", () => {
    const { next } = merge(emptyState(), "Maya", {
      entities: [{ name: "Maya", type: "person", questions: ["How long have you known her?"] }],
      relations: [],
    });
    const agenda = buildAgenda(next, [{ role: "user", text: "Maya", createdAt: new Date().toISOString() }]);
    expect(agenda.thinEntities).toContain("Maya");
    expect(agenda.openQuestions).toEqual([{ entity: "Maya", question: "How long have you known her?" }]);
    expect(agenda.justMentioned).toContain("Maya");
    expect(agenda.entityCount).toBe(1);
  });

  test("flags a single fresh relation as uncertain (score >= 2)", () => {
    const { next } = merge(emptyState(), "Maya on Atlas", {
      entities: [{ name: "Maya", type: "person" }, { name: "Atlas", type: "project" }],
      relations: [{ source: "Maya", target: "Atlas", label: "on" }],
    });
    const agenda = buildAgenda(next, []);
    expect(agenda.uncertainRelations[0]!).toMatchObject({ source: "Maya", label: "on", target: "Atlas" });
    expect(agenda.uncertainRelations[0]!.score).toBeGreaterThanOrEqual(2);
  });

  test("proposes a bridge between two entities sharing a neighbor but unlinked", () => {
    let s = emptyState();
    s = merge(s, "Maya on Atlas", {
      entities: [{ name: "Maya", type: "person" }, { name: "Atlas", type: "project" }],
      relations: [{ source: "Maya", target: "Atlas", label: "on" }],
    }).next;
    s = merge(s, "Sam on Atlas", {
      entities: [{ name: "Sam", type: "person" }, { name: "Atlas", type: "project" }],
      relations: [{ source: "Sam", target: "Atlas", label: "on" }],
    }).next;
    const agenda = buildAgenda(s, []);
    const pair = agenda.bridgeCandidates.map((p) => [...p].sort().join("+"));
    expect(pair).toContain(["maya", "sam"].sort().join("+"));
  });
});
