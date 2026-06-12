import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "react/index": "src/react/index.ts",
    "react/graph-view": "src/react/graph-view.tsx",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  external: ["react", "react-dom", "react-force-graph-2d", "d3-force-3d", "ai", "zod"],
});
