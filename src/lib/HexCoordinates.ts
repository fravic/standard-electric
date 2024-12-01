import { HexMetrics } from "./HexMetrics";

export class HexCoordinates {
  constructor(private x: number, private z: number) {}

  get X(): number {
    return this.x;
  }
  get Z(): number {
    return this.z;
  }
  get Y(): number {
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

  toString(): string {
    return `(${this.x}, ${this.Y}, ${this.z})`;
  }
}
