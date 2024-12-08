import { HexDirection, HexMetrics } from "./HexMetrics";
import { z } from "zod";

export type Vertex = readonly [number, number, number];

export const HexCoordinatesSchema = z.object({
  x: z.number(),
  z: z.number(),
});

export type HexCoordinatesData = z.infer<typeof HexCoordinatesSchema>;

/**
 * There are many ways to represent a hex coordinate. This class takes in and
 * stores odd-r offset coordinates (x, z) and enables conversion to cube
 * coordinates (q, r, s).
 *
 * A good reference: https://www.redblobgames.com/grids/hexagons/
 */
export class HexCoordinates {
  x: number;
  z: number;

  constructor(x: number, z: number) {
    this.x = x;
    this.z = z;
  }

  get Q(): number {
    return this.x - (this.z - (this.z & 1)) / 2;
  }
  get R(): number {
    return this.z;
  }
  get S(): number {
    // Q + R + S = 0, so we can just infer S
    return -this.Q - this.R;
  }

  static fromCubeCoordinates(q: number, r: number, s: number): HexCoordinates {
    const x = q + (r - (r & 1)) / 2;
    const z = r;
    return new HexCoordinates(x, z);
  }

  static fromWorldPoint(position: [number, number, number]): HexCoordinates {
    // Convert from world point (ignoring y elevation) to hex cube coordinates
    let q = position[0] / (HexMetrics.innerRadius * 2);
    let r = position[2] / (HexMetrics.outerRadius * 1.5);

    // Account for the odd-r offset
    const offset = position[2] / (HexMetrics.outerRadius * 3);
    q -= offset;

    let iQ = Math.round(q);
    let iR = Math.round(r);
    let iS = Math.round(-q - r);

    if (iQ + iR + iS !== 0) {
      // Fix rounding errors
      let dQ = Math.abs(q - iQ);
      let dR = Math.abs(r - iR);
      let dS = Math.abs(-q - r - iS);

      if (dQ > dR && dQ > dS) {
        iQ = -iR - iS;
      } else if (dR > dS) {
        iR = -iQ - iS;
      }
    }

    return HexCoordinates.fromCubeCoordinates(iQ, iR, iS);
  }

  getNeighbor(direction: HexDirection): HexCoordinates {
    if (direction < 0) {
      direction = direction + 6;
    }
    direction = (direction % 6) as HexDirection;
    switch (direction) {
      case HexDirection.NE:
        return HexCoordinates.fromCubeCoordinates(
          this.Q + 1,
          this.R - 1,
          this.S
        );
      case HexDirection.E:
        return HexCoordinates.fromCubeCoordinates(
          this.Q + 1,
          this.R,
          this.S - 1
        );
      case HexDirection.SE:
        return HexCoordinates.fromCubeCoordinates(
          this.Q,
          this.R + 1,
          this.S - 1
        );
      case HexDirection.SW:
        return HexCoordinates.fromCubeCoordinates(
          this.Q - 1,
          this.R + 1,
          this.S
        );
      case HexDirection.W:
        return HexCoordinates.fromCubeCoordinates(
          this.Q - 1,
          this.R,
          this.S + 1
        );
      case HexDirection.NW:
        return HexCoordinates.fromCubeCoordinates(
          this.Q,
          this.R - 1,
          this.S + 1
        );
    }
  }

  toString(): string {
    return `${this.x},${this.z}`;
  }

  toStringCubic(): string {
    return `${this.Q},${this.R},${this.S}`;
  }
}
