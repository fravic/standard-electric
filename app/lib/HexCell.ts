import { Color, HSL } from "three";
import { z } from "zod";
import { Vertex } from "./types";
import {
  HexCoordinatesSchema,
  toWorldPoint,
} from "./coordinates/HexCoordinates";
import { StateInfo } from "./MapData";
import { TERRAIN_COLORS } from "@/lib/palette";

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
  cityName: z.string().nullable().optional(),
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
      baseColor = new Color(TERRAIN_COLORS.FOREST);
      break;
    case TerrainType.Plains:
      baseColor = new Color(TERRAIN_COLORS.PLAINS);
      break;
    case TerrainType.Mountains:
      baseColor = new Color(TERRAIN_COLORS.MOUNTAINS);
      break;
    case TerrainType.Desert:
      baseColor = new Color(TERRAIN_COLORS.DESERT);
      break;
    case TerrainType.Water:
      baseColor = new Color(TERRAIN_COLORS.WATER);
      break;
    default:
      baseColor = new Color(0xc9eba1); // Default light green
  }

  return baseColor;
}

export function getCenterPoint(cell: HexCell): Vertex {
  const vertex = toWorldPoint(cell.coordinates);
  return [vertex[0], 0, vertex[2]];
}
