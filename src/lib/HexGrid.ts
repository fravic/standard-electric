import { z } from "zod";

import { HexCell, HexCellSchema } from "./HexCell";
import {
  coordinatesToString,
  HexCoordinates,
} from "./coordinates/HexCoordinates";
import { HexMetrics } from "./HexMetrics";

export const HexGridSchema = z.object({
  width: z.number(),
  height: z.number(),
  cellsByHexCoordinates: z.record(z.string(), HexCellSchema),
});

export type HexGrid = z.infer<typeof HexGridSchema>;

export function createHexGrid(width: number, height: number): HexGrid {
  return {
    width,
    height,
    cellsByHexCoordinates: {},
  };
}

export function getCells(grid: HexGrid): HexCell[] {
  return Object.values(grid.cellsByHexCoordinates);
}

export function addCell(
  grid: HexGrid,
  cell: HexCell,
  x: number,
  z: number
): void {
  grid.cellsByHexCoordinates[cell.coordinates.toString()] = cell;

  const chunkX = Math.floor(x / HexMetrics.chunkSizeX);
  const chunkZ = Math.floor(z / HexMetrics.chunkSizeZ);
  const localX = x - chunkX * HexMetrics.chunkSizeX;
  const localZ = z - chunkZ * HexMetrics.chunkSizeZ;
}

export function getCell(
  grid: HexGrid,
  coordinates: HexCoordinates
): HexCell | null {
  return grid.cellsByHexCoordinates[coordinatesToString(coordinates)] || null;
}
