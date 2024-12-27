import { Buildable } from "./Buildable";
import { HexCoordinates } from "./HexCoordinates";

export class CoalPlant extends Buildable {
  coordinates: HexCoordinates;

  constructor(id: string, coordinates: HexCoordinates, isGhost?: boolean) {
    super(id, "coal_plant", isGhost);
    this.coordinates = coordinates;
  }

  getWorldPoint(): [number, number, number] {
    const point = this.coordinates.toWorldPoint();
    return [point[0], 0.5, point[2]];
  }
}
