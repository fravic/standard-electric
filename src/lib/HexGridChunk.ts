import { immerable } from "immer";
import { HexCoordinates } from "./HexCoordinates";
import { HexMetrics } from "./HexMetrics";

export class HexGridChunk {
  [immerable] = true;

  coordinates: (HexCoordinates | null)[];

  constructor() {
    this.coordinates = new Array(
      HexMetrics.chunkSizeX * HexMetrics.chunkSizeZ
    ).fill(null);
  }

  addCoordinates(index: number, coordinates: HexCoordinates): void {
    this.coordinates[index] = coordinates;
  }

  getCoordinates(index: number): HexCoordinates | null {
    return this.coordinates[index];
  }
}
