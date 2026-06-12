import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveGraphEngine } from "../engine";
import { buildAgenda } from "../agenda";
import { emptyState, type Agenda, type EngineConfig, type GraphState, type IngestRole } from "../types";

export interface UseLiveGraph {
  state: GraphState;
  agenda: Agenda;
  ingest: (text: string, opts?: { role?: IngestRole }) => Promise<void>;
  status: "idle" | "extracting";
  error: unknown;
  reset: () => void;
}

export function useLiveGraph(config: EngineConfig): UseLiveGraph {
  const configRef = useRef(config);
  configRef.current = config;

  const [error, setError] = useState<unknown>(null);

  const engine = useMemo(
    () => new LiveGraphEngine({ ...configRef.current, onError: (e) => setError(e) }),
    // Engine is created once; stable ref pattern prevents re-creation on prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [state, setState] = useState<GraphState>(emptyState());
  const [status, setStatus] = useState<"idle" | "extracting">("idle");

  useEffect(() => engine.onChange(setState), [engine]);

  const ingest = useCallback(
    async (text: string, opts?: { role?: IngestRole }) => {
      setStatus("extracting");
      try { await engine.ingest(text, opts); } finally { setStatus("idle"); }
    },
    [engine],
  );

  const reset = useCallback(() => engine.reset(), [engine]);
  const agenda = useMemo(() => buildAgenda(state, []), [state]);

  return { state, agenda, ingest, status, error, reset };
}
