import { immerable } from "immer";

import { HexCell } from "./HexCell";
import { getStateInfoAtCoordinates, type MapData } from "./MapData";

export class HexGrid {
  width: number;
  height: number;
  cells: HexCell[];

  constructor(width: number, height: number) {
    this[immerable] = true;

    this.width = width;
    this.height = height;
    this.cells = [];
  }

  constructFromMapData(mapData: MapData) {
    for (let x = 0; x < this.width; x++) {
      for (let z = 0; z < this.height; z++) {
        const stateInfo = getStateInfoAtCoordinates(
          mapData,
          (x / this.width) * 100,
          (z / this.height) * 100
        );
        const cell = new HexCell(x, z, stateInfo);
        this.cells.push(cell);
      }
    }
  }
}
