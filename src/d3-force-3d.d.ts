declare module "d3-force-3d" {
  interface ForceWithStrength {
    strength(v: number): this;
    distance?(v: number): this;
    radius?(v: number): this;
  }
  export function forceX(x?: number): ForceWithStrength;
  export function forceY(y?: number): ForceWithStrength;
}
