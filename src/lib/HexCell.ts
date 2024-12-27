import { immerable } from "immer";
import { Color, HSL } from "three";
import { z } from "zod";

import { HexCoordinates, HexCoordinatesSchema, Vertex } from "./HexCoordinates";
import { StateInfo } from "./MapData";

export enum TerrainType {
  Forest = "Forest",
  Plains = "Plains",
  Mountains = "Mountains",
  Desert = "Desert",
  Water = "Water",
}

export enum Population {
  Unpopulated = 0,
  Village = 1,
  Town = 2,
  City = 3,
  Metropolis = 4,
  Megalopolis = 5,
}

export const HexCellSchema = z.object({
  coordinates: HexCoordinatesSchema,
  stateInfo: z
    .object({
      name: z.string(),
      id: z.string(),
    })
    .nullable(),
  terrainType: z.nativeEnum(TerrainType).optional().nullable(),
  population: z.nativeEnum(Population).optional().nullable(),
});

export type HexCellData = z.infer<typeof HexCellSchema>;

export class HexCell {
  [immerable] = true;

  coordinates: HexCoordinates;
  stateInfo: StateInfo | null = null;
  terrainType: TerrainType = TerrainType.Plains;
  population: Population = Population.Unpopulated;

  constructor(x: number, z: number, stateInfo: StateInfo | null = null) {
    this.coordinates = new HexCoordinates(x, z);
    this.stateInfo = stateInfo;

    // Randomly assign terrain type
    const terrainTypes = Object.values(TerrainType);
    this.terrainType =
      terrainTypes[Math.floor(Math.random() * terrainTypes.length)];
  }

  get isUnderwater(): boolean {
    return this.terrainType === TerrainType.Water;
  }

  stateHash(): number {
    return Array.from(this.stateInfo?.name ?? "").reduce(
      (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc),
      0
    );
  }

  color(): Color {
    let baseColor: Color;

    // Set base color based on terrain type
    switch (this.terrainType) {
      case TerrainType.Forest:
        baseColor = new Color(0x2d5a27); // Dark green
        break;
      case TerrainType.Plains:
        baseColor = new Color(0x90a955); // Light green
        break;
      case TerrainType.Mountains:
        baseColor = new Color(0x6b705c); // Gray
        break;
      case TerrainType.Desert:
        baseColor = new Color(0xe6c229); // Sand yellow
        break;
      case TerrainType.Water:
        baseColor = new Color(0x1e88e5); // Blue
        break;
      default:
        baseColor = new Color(0xc9eba1); // Default light green
    }

    if (this.stateInfo?.name) {
      const hsl: HSL = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      // Vary lightness slightly based on state hash
      hsl.l = Math.max(
        0.4,
        Math.min(0.9, hsl.l + ((this.stateHash() % 40) - 20) / 100)
      );
      baseColor.setHSL(hsl.h, hsl.s, hsl.l);
    }

    return baseColor;
  }

  centerPoint(): Vertex {
    const vertex = this.coordinates.toWorldPoint();
    return [vertex[0], 0, vertex[2]];
  }
}
