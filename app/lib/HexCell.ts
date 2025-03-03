import { Color, HSL } from "three";
import { z } from "zod";
import { Vertex } from "./types";
import {
  HexCoordinatesSchema,
  toWorldPoint,
  coordinatesToString,
} from "./coordinates/HexCoordinates";
import { TERRAIN_COLORS } from "@/lib/palette";
import { SurveyResult } from "./surveys";

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
  regionName: z.string().nullable(),
  terrainType: z.nativeEnum(TerrainType),
  population: z.nativeEnum(Population),
  cityName: z.string().nullable().optional(),
});

export type HexCell = z.infer<typeof HexCellSchema>;

export function createHexCell(
  x: number,
  z: number,
  regionName: string | null = null
): HexCell {
  // Randomly assign terrain type
  const terrainTypes = Object.values(TerrainType);
  const terrainType =
    terrainTypes[Math.floor(Math.random() * terrainTypes.length)];

  return {
    coordinates: { x, z },
    regionName,
    terrainType,
    population: Population.Unpopulated,
  };
}

export function isUnderwater(cell: HexCell): boolean {
  return cell.terrainType === TerrainType.Water;
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

  // Darken color if cell has no region name
  if (!cell.regionName) {
    const hsl: HSL = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    baseColor.setHSL(hsl.h, hsl.s, hsl.l * 0.7); // Reduce lightness by 30%
  }

  return baseColor;
}

/**
 * Get the color of a hex cell, darkening it if it hasn't been surveyed by the player
 */
export function getColorWithExplorationStatus(
  cell: HexCell,
  surveyResultByHexCell: Record<string, SurveyResult> | undefined
): Color {
  const baseColor = getColor(cell);

  // Check if this cell has been surveyed
  const coordString = coordinatesToString(cell.coordinates);
  const hasBeenSurveyed =
    surveyResultByHexCell?.[coordString]?.isComplete === true;

  // If not surveyed, darken the color
  if (!hasBeenSurveyed) {
    const hsl: HSL = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    baseColor.setHSL(hsl.h, hsl.s * 0.7, hsl.l * 0.5); // Reduce saturation and lightness
  }

  return baseColor;
}

export function getCenterPoint(cell: HexCell): Vertex {
  const vertex = toWorldPoint(cell.coordinates);
  return [vertex[0], 0, vertex[2]];
}
