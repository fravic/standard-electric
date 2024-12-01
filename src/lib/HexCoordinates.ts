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

  toString(): string {
    return `(${this.x}, ${this.Y}, ${this.z})`;
  }
}
