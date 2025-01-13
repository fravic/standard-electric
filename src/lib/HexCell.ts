import { Color, HSL } from "three";
import { z } from "zod";
import { Vertex } from "./types";
import {
  HexCoordinatesSchema,
  toWorldPoint,
} from "./coordinates/HexCoordinates";
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
  terrainType: z.nativeEnum(TerrainType),
  population: z.nativeEnum(Population),
});

export type HexCell = z.infer<typeof HexCellSchema>;

export function createHexCell(
  x: number,
  z: number,
  stateInfo: StateInfo | null = null
): HexCell {
  // Randomly assign terrain type
  const terrainTypes = Object.values(TerrainType);
  const terrainType =
    terrainTypes[Math.floor(Math.random() * terrainTypes.length)];

  return {
    coordinates: { x, z },
    stateInfo,
    terrainType,
    population: Population.Unpopulated,
  };
}

export function isUnderwater(cell: HexCell): boolean {
  return cell.terrainType === TerrainType.Water;
}

export function stateHash(cell: HexCell): number {
  return Array.from(cell.stateInfo?.name ?? "").reduce(
    (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc),
    0
  );
}

export function getColor(cell: HexCell): Color {
  let baseColor: Color;

  // Set base color based on terrain type
  switch (cell.terrainType) {
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

  if (cell.stateInfo?.name) {
    const hsl: HSL = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    // Vary lightness slightly based on state hash
    hsl.l = Math.max(
      0.4,
      Math.min(0.9, hsl.l + ((stateHash(cell) % 40) - 20) / 100)
    );
    baseColor.setHSL(hsl.h, hsl.s, hsl.l);
  }

  return baseColor;
}

export function getCenterPoint(cell: HexCell): Vertex {
  const vertex = toWorldPoint(cell.coordinates);
  return [vertex[0], 0, vertex[2]];
}
