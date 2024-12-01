import { HexCell } from "./HexCell";
import { HexMetrics } from "./HexMetrics";

export class HexGridChunk {
  cells: HexCell[];

  constructor() {
    this.cells = new Array(HexMetrics.chunkSizeX * HexMetrics.chunkSizeZ);
  }

  addCell(index: number, cell: HexCell): void {
    this.cells[index] = cell;
    // In the tutorial this sets parent transforms, but we don't need that for our implementation
  }
}
