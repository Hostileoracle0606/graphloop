import { describe, expect, test } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MockLanguageModelV3 } from "ai/test";
import { useLiveGraph } from "../src/react/use-live-graph";

const model = new MockLanguageModelV3({
  doGenerate: async () => ({
    content: [{ type: "text", text: JSON.stringify({ entities: [{ name: "Maya", type: "person" }], relations: [] }) }],
    finishReason: { unified: "stop", raw: undefined },
    usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
    warnings: [],
  }),
});

function Probe() {
  const { state, ingest } = useLiveGraph({ model });
  return (
    <div>
      <button onClick={() => void ingest("I met Maya", { role: "user" })}>go</button>
      <span data-testid="count">{Object.keys(state.entities).length}</span>
    </div>
  );
}

describe("useLiveGraph", () => {
  test("ingest updates mirrored state", async () => {
    render(<Probe />);
    expect(screen.getByTestId("count").textContent).toBe("0");
    await act(async () => { screen.getByText("go").click(); });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });
});
