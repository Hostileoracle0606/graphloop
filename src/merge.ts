import type { Entity, GraphEntry, GraphPatch, GraphState, Relation } from "./types";

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || `e-${Math.random().toString(36).slice(2, 8)}`
  );
}

const MAX_QUESTIONS_PER_ENTITY = 8;

const mergeQuestions = (
  existing: string[] | undefined,
  incoming: string[] | undefined,
): string[] | undefined => {
  if (!existing?.length && !incoming?.length) return existing;
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const q of [...(incoming ?? []), ...(existing ?? [])]) {
    const trimmed = q?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase().replace(/[^a-z0-9 ]+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(trimmed);
    if (merged.length >= MAX_QUESTIONS_PER_ENTITY) break;
  }
  return merged.length ? merged : undefined;
};

export function merge(
  prev: GraphState,
  text: string,
  patch: GraphPatch,
): { next: GraphState; entryId: string } {
  const now = new Date().toISOString();
  const entities: Record<string, Entity> = { ...prev.entities };
  const relations: Record<string, Relation> = { ...prev.relations };
  const entryEntityIds: string[] = [];
  const entryRelationIds: string[] = [];

  const nameToId: Record<string, string> = {};
  for (const e of patch.entities ?? []) {
    if (!e?.name) continue;
    const id = slugify(e.name);
    nameToId[e.name.toLowerCase()] = id;
    const existing = entities[id];
    entities[id] = existing
      ? {
          ...existing,
          description: e.description || existing.description,
          metadata: { ...existing.metadata, ...(e.metadata ?? {}) },
          mentions: existing.mentions + 1,
          lastSeen: now,
          type: existing.type === "other" ? e.type : existing.type,
          questions: mergeQuestions(existing.questions, e.questions),
        }
      : {
          id,
          name: e.name,
          type: e.type ?? "other",
          description: e.description,
          metadata: e.metadata ?? {},
          mentions: 1,
          firstSeen: now,
          lastSeen: now,
          questions: mergeQuestions(undefined, e.questions),
        };
    entryEntityIds.push(id);
  }

  const explicitlyTaggedIds = new Set(Object.values(nameToId));

  for (const r of patch.relations ?? []) {
    const src = nameToId[r.source?.toLowerCase()] ?? slugify(r.source ?? "");
    const tgt = nameToId[r.target?.toLowerCase()] ?? slugify(r.target ?? "");
    if (!src || !tgt || src === tgt) continue;
    const rid = `${src}__${r.label}__${tgt}`;
    if (!relations[rid]) {
      relations[rid] = {
        id: rid, source: src, target: tgt, label: r.label,
        metadata: r.metadata ?? {}, createdAt: now,
      };
    } else {
      // Re-asserting an existing (possibly superseded) relation: strip supersededAt (self-heal)
      const { supersededAt: _ignored, ...rest } = relations[rid];
      relations[rid] = { ...rest, metadata: { ...rest.metadata, ...(r.metadata ?? {}) } };
    }
    entryRelationIds.push(rid);
  }

  // Backfill: bump mention counts for relation endpoints not in this patch's entity list
  const implicitlyTouchedIds = new Set<string>();
  for (const r of patch.relations ?? []) {
    const src = nameToId[r.source?.toLowerCase()] ?? slugify(r.source ?? "");
    const tgt = nameToId[r.target?.toLowerCase()] ?? slugify(r.target ?? "");
    for (const id of [src, tgt]) {
      if (!id || explicitlyTaggedIds.has(id) || implicitlyTouchedIds.has(id)) continue;
      const existing = entities[id];
      if (!existing) continue;
      implicitlyTouchedIds.add(id);
      entities[id] = { ...existing, mentions: existing.mentions + 1, lastSeen: now };
      entryEntityIds.push(id);
    }
  }

  // Apply supersedes: soft-delete relations (re-assertion in the patch above already self-heals)
  for (const id of patch.supersedes ?? []) {
    const target = relations[id];
    if (!target || target.supersededAt) continue;
    relations[id] = { ...target, supersededAt: now };
  }

  const entryId = `e-${Date.now()}`;
  const entry: GraphEntry = {
    id: entryId, text, createdAt: now,
    entityIds: Array.from(new Set(entryEntityIds)),
    relationIds: Array.from(new Set(entryRelationIds)),
  };

  return { next: { entries: [entry, ...prev.entries], entities, relations }, entryId };
}
