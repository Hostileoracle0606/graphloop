import type { Agenda, ConversationTurn, GraphState } from "./types";

const wordCount = (s: string | undefined): number =>
  s ? s.trim().split(/\s+/).filter(Boolean).length : 0;

export function buildAgenda(state: GraphState, conversation: ConversationTurn[]): Agenda {
  const entities = Object.values(state.entities);
  const activeRelations = Object.values(state.relations).filter((r) => !r.supersededAt);

  // coverage -> thin (< 30 words)
  const wordsByEntity = new Map<string, number>();
  for (const e of entities) wordsByEntity.set(e.id, wordCount(e.description));
  for (const entry of state.entries) {
    for (const eid of entry.entityIds) {
      wordsByEntity.set(eid, (wordsByEntity.get(eid) ?? 0) + wordCount(entry.text));
    }
  }
  const thinEntities = entities
    .filter((e) => (wordsByEntity.get(e.id) ?? 0) < 30)
    .sort((a, b) => b.mentions - a.mentions)
    .map((e) => e.name);

  // justMentioned: entities whose name appears in the latest user turn text
  const lastUser = [...conversation].reverse().find((t) => t.role === "user")
    ?? [...conversation].reverse()[0];
  const probeText = (lastUser?.text ?? state.entries[0]?.text ?? "").toLowerCase();
  const justMentioned = entities
    .filter((e) => probeText.includes(e.name.toLowerCase()))
    .map((e) => e.name);

  // uncertainRelations: score 0-3, surface >= 2
  const mentionCountByRelation = new Map<string, number>();
  const firstEntryByEntity = new Map<string, string>();
  // entries are newest-first; iterate reversed to get oldest-first so first-seen is accurate
  for (const entry of state.entries.slice().reverse()) {
    for (const rid of entry.relationIds) {
      mentionCountByRelation.set(rid, (mentionCountByRelation.get(rid) ?? 0) + 1);
    }
    for (const eid of entry.entityIds) {
      // overwrite unconditionally in oldest-first order so last write = oldest entry
      firstEntryByEntity.set(eid, entry.id);
    }
  }
  const activePairCount = new Map<string, number>();
  for (const r of activeRelations) {
    const key = `${r.source} ${r.target}`;
    activePairCount.set(key, (activePairCount.get(key) ?? 0) + 1);
  }
  const uncertainRelations = activeRelations
    .map((r) => {
      let score = 0;
      if ((mentionCountByRelation.get(r.id) ?? 0) <= 1) score += 1;
      const se = firstEntryByEntity.get(r.source);
      const te = firstEntryByEntity.get(r.target);
      if (se && te && se !== te) score += 1;
      if ((activePairCount.get(`${r.source} ${r.target}`) ?? 0) <= 1) score += 1;
      return {
        source: state.entities[r.source]?.name,
        label: r.label,
        target: state.entities[r.target]?.name,
        score,
      };
    })
    .filter((r): r is { source: string; label: string; target: string; score: number } =>
      r.score >= 2 && Boolean(r.source) && Boolean(r.target))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // bridgeCandidates: shared neighbor, no direct link
  const neighbors = new Map<string, Set<string>>();
  const directlyLinked = new Set<string>();
  for (const r of activeRelations) {
    if (!neighbors.has(r.source)) neighbors.set(r.source, new Set());
    if (!neighbors.has(r.target)) neighbors.set(r.target, new Set());
    neighbors.get(r.source)!.add(r.target);
    neighbors.get(r.target)!.add(r.source);
    directlyLinked.add([r.source, r.target].sort().join(" "));
  }
  const ids = [...neighbors.keys()];
  const bridges: Array<{ a: string; b: string; shared: number }> = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!, b = ids[j]!;
      if (directlyLinked.has([a, b].sort().join(" "))) continue;
      const na = neighbors.get(a)!, nb = neighbors.get(b)!;
      let shared = 0;
      for (const n of na) if (nb.has(n)) shared++;
      if (shared > 0) bridges.push({ a, b, shared });
    }
  }
  const bridgeCandidates = bridges
    .sort((x, y) => y.shared - x.shared)
    .slice(0, 6)
    .map((br) => [br.a, br.b] as [string, string]);

  // openQuestions from wiki-mode entity backlog
  const openQuestions = entities
    .flatMap((e) => (e.questions ?? []).map((q) => ({ entity: e.name, question: q })))
    .slice(0, 12);

  return {
    thinEntities: thinEntities.slice(0, 10),
    justMentioned,
    uncertainRelations,
    bridgeCandidates,
    openQuestions,
    entityCount: entities.length,
    relationCount: activeRelations.length,
  };
}
