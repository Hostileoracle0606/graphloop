import { z } from "zod";

export const ENTITY_TYPES = [
  "person", "place", "organization", "project", "event",
  "activity", "concept", "emotion", "other",
] as const;

export const entityPatchSchema = z.object({
  name: z.string().min(1).describe("Entity name as it appears in the utterance."),
  type: z.enum(ENTITY_TYPES).describe("Named-entity category."),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  questions: z.array(z.string()).optional()
    .describe("Wiki-mode only: 2-4 lines of questioning to pursue about this entity."),
});

export const relationPatchSchema = z.object({
  source: z.string().min(1).describe("Source entity name."),
  target: z.string().min(1).describe("Target entity name."),
  label: z.string().min(1).describe("Snake_case verb phrase, e.g. works_with."),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const graphPatchSchema = z.object({
  entities: z.array(entityPatchSchema),
  relations: z.array(relationPatchSchema),
  supersedes: z.array(z.string().min(1)).optional()
    .describe("Ids of existing relations the user just contradicted."),
});
