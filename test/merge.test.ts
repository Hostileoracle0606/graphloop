import { describe, expect, test } from "vitest";
import { merge, slugify } from "../src/merge";
import { emptyState } from "../src/types";

describe("slugify", () => {
  test("normalizes names to ids", () => {
    expect(slugify("Project Atlas")).toBe("project-atlas");
    expect(slugify("CS246")).toBe("cs246");
  });
});

describe("merge", () => {
  test("adds new entities and relations, counts mentions", () => {
    const { next } = merge(emptyState(), "I ran with Maya", {
      entities: [{ name: "Maya", type: "person" }, { name: "running", type: "activity" }],
      relations: [{ source: "running", target: "Maya", label: "with" }],
    });
    expect(next.entities["maya"].mentions).toBe(1);
    expect(next.relations["running__with__maya"].label).toBe("with");
    expect(next.entries).toHaveLength(1);
    expect(next.entries[0].entityIds).toContain("maya");
  });

  test("re-mention increments count and refreshes lastSeen", () => {
    const s1 = merge(emptyState(), "Maya", { entities: [{ name: "Maya", type: "person" }], relations: [] }).next;
    const s2 = merge(s1, "Maya again", { entities: [{ name: "Maya", type: "person" }], relations: [] }).next;
    expect(s2.entities["maya"].mentions).toBe(2);
  });

  test("supersede soft-deletes a relation; re-assertion self-heals it", () => {
    const s1 = merge(emptyState(), "Maya on Atlas", {
      entities: [{ name: "Maya", type: "person" }, { name: "Atlas", type: "project" }],
      relations: [{ source: "Maya", target: "Atlas", label: "on" }],
    }).next;
    const rid = "maya__on__atlas";
    const s2 = merge(s1, "actually not", { entities: [], relations: [], supersedes: [rid] }).next;
    expect(s2.relations[rid].supersededAt).toBeTruthy();
    const s3 = merge(s2, "Maya is on Atlas after all", {
      entities: [{ name: "Maya", type: "person" }, { name: "Atlas", type: "project" }],
      relations: [{ source: "Maya", target: "Atlas", label: "on" }],
    }).next;
    expect(s3.relations[rid].supersededAt).toBeUndefined();
  });

  test("merges questions, deduped, newest-first, capped at 8", () => {
    const { next } = merge(emptyState(), "Maya", {
      entities: [{ name: "Maya", type: "person", questions: ["q1", "q2", "q1"] }],
      relations: [],
    });
    expect(next.entities["maya"].questions).toEqual(["q1", "q2"]);
  });
});
