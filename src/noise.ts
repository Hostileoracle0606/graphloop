import type { GraphPatch } from "./types";

export const DEFAULT_NOISE_NAMES = new Set([
  "i", "me", "my", "mine", "you", "your", "yours", "we", "us", "our",
  "they", "them", "their",
  "today", "yesterday", "tomorrow", "morning", "afternoon", "evening",
  "night", "now", "later",
]);

export const normalizeName = (name: string): string =>
  name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, "").trim();

export const filterNoise = (
  patch: GraphPatch,
  extra?: Iterable<string>,
): GraphPatch => {
  const stop = new Set(DEFAULT_NOISE_NAMES);
  if (extra) for (const n of extra) stop.add(normalizeName(n));

  const kept = patch.entities.filter((e) => {
    const key = normalizeName(e.name);
    if (!key) return false;
    if (stop.has(key)) return false;
    if (key.length < 2) return false;
    return true;
  });
  const keptKeys = new Set(kept.map((e) => normalizeName(e.name)));
  const droppedKeys = new Set(
    patch.entities.map((e) => normalizeName(e.name)).filter((k) => !keptKeys.has(k)),
  );
  const relations = patch.relations.filter(
    (r) => !droppedKeys.has(normalizeName(r.source)) && !droppedKeys.has(normalizeName(r.target)),
  );
  return { entities: kept, relations, supersedes: patch.supersedes };
};
