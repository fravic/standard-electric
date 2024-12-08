import { HexDirection, HexMetrics } from "./HexMetrics";
import { z } from "zod";

export type Vertex = readonly [number, number, number];

export const HexCoordinatesSchema = z.object({
  x: z.number(),
  z: z.number(),
});

export type HexCoordinatesData = z.infer<typeof HexCoordinatesSchema>;

export class HexCoordinates {
  constructor(private x: number, private z: number) {}

  get X(): number {
    return this.x;
  }
  get Z(): number {
    return this.z;
  }
  get Y(): number {
    // X + Y + Z = 0, so we can just infer Y
    return -this.x - this.z;
  }

  static fromOffsetCoordinates(x: number, z: number): HexCoordinates {
    return new HexCoordinates(x - Math.floor(z / 2), z);
  }

  static fromPosition(position: [number, number, number]): HexCoordinates {
    let x = position[0] / (HexMetrics.innerRadius * 2);
    let z = position[2] / (HexMetrics.outerRadius * 1.5);

    let offset = Math.floor(z / 2);
    x -= offset;

    let iX = Math.round(x);
    let iZ = Math.round(z);
    let iY = Math.round(-x - z);

    if (iX + iY + iZ !== 0) {
      // Fix rounding errors
      let dX = Math.abs(x - iX);
      let dZ = Math.abs(z - iZ);
      let dY = Math.abs(-x - z - iY);

      if (dX > dZ && dX > dY) {
        iX = -iY - iZ;
      } else if (dZ > dY) {
        iZ = -iX - iY;
      }
    }

    return new HexCoordinates(iX, iZ);
  }

  static fromHexCoordinates(coordinates: HexCoordinates): HexCoordinates {
    return new HexCoordinates(coordinates.x, coordinates.z);
  }

  getNeighbor(direction: HexDirection): HexCoordinates {
    if (direction < 0) {
      direction = direction + 6;
    }
    direction = (direction % 6) as HexDirection;
    switch (direction) {
      case HexDirection.NE:
        return new HexCoordinates(this.x, this.z + 1);
      case HexDirection.E:
        return new HexCoordinates(this.x + 1, this.z);
      case HexDirection.SE:
        return new HexCoordinates(this.x + 1, this.z - 1);
      case HexDirection.SW:
        return new HexCoordinates(this.x, this.z - 1);
      case HexDirection.W:
        return new HexCoordinates(this.x - 1, this.z);
      case HexDirection.NW:
        return new HexCoordinates(this.x - 1, this.z + 1);
    }
    throw new Error(
      "Invalid HexDirection passed to HexCoordinates.getNeighbor: " + direction
    );
  }

  toString(): string {
    return `(${this.x}, ${this.Y}, ${this.z})`;
  }
}
