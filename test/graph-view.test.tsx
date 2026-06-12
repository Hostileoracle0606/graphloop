import { describe, expect, test, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { GraphView } from "../src/react/graph-view";

vi.mock("react-force-graph-2d", () => ({ default: () => null }));
vi.mock("d3-force-3d", () => ({
  forceX: () => ({ strength: () => ({}) }),
  forceY: () => ({ strength: () => ({}) }),
}));

beforeAll(() => {
  // jsdom doesn't implement ResizeObserver
  (globalThis as unknown as Record<string, unknown>)["ResizeObserver"] = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("GraphView", () => {
  test("renders without crashing given entities + relations", () => {
    const entities = [{ id: "maya", name: "Maya", type: "person" as const, metadata: {}, mentions: 1, firstSeen: "t", lastSeen: "t" }];
    const relations: never[] = [];
    const { container } = render(<GraphView entities={entities} relations={relations} />);
    expect(container).toBeTruthy();
  });
});
