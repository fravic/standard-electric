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

export type HexGridData = z.infer<typeof HexGridSchema>;

export class HexGrid {
  width: number;
  height: number;
  cellsByHexCoordinates: Record<string, HexCell>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cellsByHexCoordinates = {};
  }

  static fromData(data: HexGridData): HexGrid {
    const grid = new HexGrid(data.width, data.height);
    grid.cellsByHexCoordinates = data.cellsByHexCoordinates;
    return grid;
  }

  addCell(cell: HexCell, x: number, z: number): void {
    this.cellsByHexCoordinates[cell.coordinates.toString()] = cell;

    const chunkX = Math.floor(x / HexMetrics.chunkSizeX);
    const chunkZ = Math.floor(z / HexMetrics.chunkSizeZ);
    const localX = x - chunkX * HexMetrics.chunkSizeX;
    const localZ = z - chunkZ * HexMetrics.chunkSizeZ;
  }

  getCell(coordinates: HexCoordinates): HexCell | null {
    return this.cellsByHexCoordinates[coordinates.toString()] || null;
  }

  get cells(): HexCell[] {
    return Object.values(this.cellsByHexCoordinates);
  }
}

export function createHexGrid(width: number, height: number): HexGrid {
  return new HexGrid(width, height);
}

export function getCells(grid: HexGrid): HexCell[] {
  return grid.cells;
}

export function getCell(grid: HexGrid, coordinates: HexCoordinates): HexCell | null {
  return grid.getCell(coordinates);
}
