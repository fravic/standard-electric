import { immerable } from "immer";

import { HexCoordinates } from "./HexCoordinates";
import { HexMetrics } from "./HexMetrics";
import { StateInfo } from "./MapData";

export class HexCell {
  coordinates: HexCoordinates;
  elevation: number = 0;
  waterLevel: number = 0;
  color: string = "#aaffbb";
  roads: boolean[] = [false, false, false, false, false, false];
  stateInfo: StateInfo | null = null;

  constructor(x: number, z: number, stateInfo: StateInfo | null = null) {
    this[immerable] = true;

    this.coordinates = HexCoordinates.fromOffsetCoordinates(x, z);
    this.stateInfo = stateInfo;
  }

  get isUnderwater(): boolean {
    return this.waterLevel > this.elevation;
  }

  get waterSurfaceY(): number {
    return (
      (this.waterLevel + HexMetrics.waterElevationOffset) *
      HexMetrics.elevationStep
    );
  }

  hasRoadThroughEdge(direction: number): boolean {
    return this.roads[direction];
  }

  addRoad(direction: number): void {
    if (!this.roads[direction]) {
      this.roads[direction] = true;
    }
  }
}
