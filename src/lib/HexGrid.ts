import { immerable } from "immer";
import { z } from "zod";

import { HexCell, HexCellSchema } from "./HexCell";
import { HexCoordinates } from "./HexCoordinates";
import { HexGridChunk } from "./HexGridChunk";
import { HexMetrics } from "./HexMetrics";

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
  cellsByHexCoordinates: Record<string, HexCell>;

  private _chunkCountX: number;
  private _chunkCountZ: number;

  get chunkCountX(): number {
    return this._chunkCountX;
  }

  get chunkCountZ(): number {
    return this._chunkCountZ;
  }

  get cells(): HexCell[] {
    return Object.values(this.cellsByHexCoordinates);
  }

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    // Calculate chunk counts
    this._chunkCountX = Math.ceil(width / HexMetrics.chunkSizeX);
    this._chunkCountZ = Math.ceil(height / HexMetrics.chunkSizeZ);

    this.chunks = [];
    this.cellsByHexCoordinates = {};

    for (let z = 0; z < this._chunkCountZ; z++) {
      for (let x = 0; x < this._chunkCountX; x++) {
        this.chunks.push(new HexGridChunk());
      }
    }
  }

  addCell(cell: HexCell, x: number, z: number) {
    this.cellsByHexCoordinates[cell.coordinates.toString()] = cell;

    // Add to appropriate chunk
    const chunkX = Math.floor(x / HexMetrics.chunkSizeX);
    const chunkZ = Math.floor(z / HexMetrics.chunkSizeZ);
    const chunk = this.chunks[chunkX + chunkZ * this._chunkCountX];
    if (!chunk) {
      throw new Error(`Chunk not found for cell ${x}, ${z}`);
    }

    const localX = x - chunkX * HexMetrics.chunkSizeX;
    const localZ = z - chunkZ * HexMetrics.chunkSizeZ;
    chunk.addCoordinates(
      localX + localZ * HexMetrics.chunkSizeX,
      cell.coordinates
    );
  }

  getCell(coordinates: HexCoordinates): HexCell | null {
    return this.cellsByHexCoordinates[coordinates.toString()] || null;
  }

  getCellFromChunkIndex(chunk: HexGridChunk, index: number): HexCell | null {
    const coordinates = chunk.getCoordinates(index);
    if (!coordinates) return null;
    return this.getCell(coordinates);
  }

  getChunk(x: number, z: number): HexGridChunk | null {
    if (x < 0 || x >= this._chunkCountX || z < 0 || z >= this._chunkCountZ) {
      return null;
    }
    return this.chunks[x + z * this._chunkCountX];
  }
}
