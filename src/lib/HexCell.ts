import { immerable } from "immer";
import { Color, HSL } from "three";

import { HexCoordinates, Vertex } from "./HexCoordinates";
import { HexMetrics } from "./HexMetrics";
import { StateInfo } from "./MapData";

const BASE_GREEN = new Color(0xc9eba1); // Light green base color

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

    if (!stateInfo) {
      this.elevation = -0.2;
      this.waterLevel = 0;
    }
  }

  get isUnderwater(): boolean {
    return this.waterLevel > this.elevation;
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
      hsl.s = 0.8;
      // Vary lightness slightly based on state hash
      hsl.l = Math.max(
        0.4,
        Math.min(0.9, hsl.l + ((this.stateHash() % 40) - 20) / 100)
      );
      color.setHSL(hsl.h, hsl.s, hsl.l);
    }

    return color;
  }

  centerPoint(): Vertex {
    const x =
      (this.coordinates.X + this.coordinates.Z * 0.5) *
      (HexMetrics.innerRadius * 2);
    const y = this.elevation;
    const z = this.coordinates.Z * (HexMetrics.outerRadius * 1.5);
    return [x, y, z];
  }

  waterCenterPoint(): Vertex {
    return [this.centerPoint()[0], this.waterLevel, this.centerPoint()[2]];
  }
}
