import { immerable } from "immer";
import { Color, HSL } from "three";

import { HexCoordinates } from "./HexCoordinates";
import { HexMetrics } from "./HexMetrics";
import { StateInfo } from "./MapData";

const BASE_GREEN = new Color(0x90ee90); // Light green base color

export class HexCell {
  coordinates: HexCoordinates;
  elevation: number = 0;
  waterLevel: number = 0;
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

  stateHash(): number {
    return Array.from(this.stateInfo?.name ?? "").reduce(
      (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc),
      0
    );
  }

  color(): Color {
    const color = BASE_GREEN.clone();

    if (this.stateInfo?.name) {
      const hsl: HSL = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      // Vary lightness slightly based on state hash
      hsl.l = Math.max(
        0.6,
        Math.min(0.9, hsl.l + ((this.stateHash() % 50) - 25) / 100)
      );
      color.setHSL(hsl.h, hsl.s, hsl.l);
    }

    return color;
  }
}
