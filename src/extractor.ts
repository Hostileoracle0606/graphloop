import { generateObject, type LanguageModel } from "ai";
import { filterNoise } from "./noise";
import { graphPatchSchema } from "./schema";
import {
  emptyPatch,
  type ConversationTurn,
  type ExtractionMode,
  type GraphPatch,
  type GraphState,
  type ProviderOptions,
} from "./types";

export interface ExtractArgs {
  text: string;
  state: GraphState;
  conversation: ConversationTurn[];
  model: LanguageModel;
  mode: ExtractionMode;
  prompts: Record<ExtractionMode, string>;
  maxContextEntities: number;
  temperature: number;
  providerOptions?: ProviderOptions;
  noiseNames?: Iterable<string>;
  signal?: AbortSignal;
}

const buildUserMessage = (args: ExtractArgs): string => {
  const existing = Object.values(args.state.entities).slice(0, args.maxContextEntities);
  const existingList = existing.length
    ? existing.map((e) => `- ${e.name} (${e.type})${e.description ? ` - ${e.description}` : ""}`).join("\n")
    : "(none yet)";
  const recent = args.conversation.slice(-4);
  const recentList = recent.length
    ? recent.map((t) => `- ${t.role}: ${t.text}`).join("\n")
    : "(none)";
  return `EXISTING ENTITIES (reuse these spellings for the same thing):
${existingList}

RECENT CONVERSATION (for pronoun resolution only — do NOT extract from these):
${recentList}

NEW UTTERANCE:
"""${args.text}"""`;
};

export async function extract(args: ExtractArgs): Promise<GraphPatch> {
  const text = args.text?.trim();
  if (!text || text.length < 2) return emptyPatch();

  try {
    const { object } = await generateObject({
      model: args.model,
      schema: graphPatchSchema,
      system: args.prompts[args.mode],
      prompt: buildUserMessage(args),
      temperature: args.temperature,
      abortSignal: args.signal,
      providerOptions: args.providerOptions,
    });
    return filterNoise(object as GraphPatch, args.noiseNames);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    return emptyPatch();
  }
}
