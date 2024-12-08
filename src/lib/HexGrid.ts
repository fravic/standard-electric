import { immerable } from "immer";
import { z } from "zod";

import { HexCell, HexCellSchema } from "./HexCell";
import { HexCoordinates } from "./HexCoordinates";
import { HexGridChunk } from "./HexGridChunk";
import { HexMetrics } from "./HexMetrics";
import { getStateInfoAtCoordinates, type MapData } from "./MapData";

export const HexGridSchema = z.object({
  width: z.number(),
  height: z.number(),
  cells: z.array(HexCellSchema),
});

export type HexGridData = z.infer<typeof HexGridSchema>;

export class HexGrid {
  [immerable] = true;

  width: number;
  height: number;
  chunks: HexGridChunk[];
  cells: HexCell[];
  cellsByHexCoordinates: Record<string, HexCell>;

  private _chunkCountX: number;
  private _chunkCountZ: number;

  get chunkCountX(): number {
    return this._chunkCountX;
  }

  get chunkCountZ(): number {
    return this._chunkCountZ;
  }

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    // Calculate chunk counts
    this._chunkCountX = Math.ceil(width / HexMetrics.chunkSizeX);
    this._chunkCountZ = Math.ceil(height / HexMetrics.chunkSizeZ);

    this.chunks = [];
    this.cells = [];
    this.cellsByHexCoordinates = {};
  }

  constructFromMapData(mapData: MapData) {
    // First create the chunks
    for (let z = 0; z < this._chunkCountZ; z++) {
      for (let x = 0; x < this._chunkCountX; x++) {
        this.chunks.push(new HexGridChunk());
      }
    }

    // Then create cells and assign them to chunks
    for (let x = 0; x < this.width; x++) {
      for (let z = 0; z < this.height; z++) {
        const stateInfo = getStateInfoAtCoordinates(
          mapData,
          (x / this.width) * 100,
          (z / this.height) * 100
        );
        const cell = new HexCell(x, z, stateInfo);

        // Add to main cell arrays
        this.cells.push(cell);
        this.cellsByHexCoordinates[cell.coordinates.toString()] = cell;

        // Add to appropriate chunk
        const chunkX = Math.floor(x / HexMetrics.chunkSizeX);
        const chunkZ = Math.floor(z / HexMetrics.chunkSizeZ);
        const chunk = this.chunks[chunkX + chunkZ * this._chunkCountX];

        const localX = x - chunkX * HexMetrics.chunkSizeX;
        const localZ = z - chunkZ * HexMetrics.chunkSizeZ;
        chunk.addCell(localX + localZ * HexMetrics.chunkSizeX, cell);
      }
    }
  }

  getCell(coordinates: HexCoordinates): HexCell | null {
    return this.cellsByHexCoordinates[coordinates.toString()] || null;
  }

  getChunk(x: number, z: number): HexGridChunk | null {
    if (x < 0 || x >= this._chunkCountX || z < 0 || z >= this._chunkCountZ) {
      return null;
    }
    return this.chunks[x + z * this._chunkCountX];
  }
}
