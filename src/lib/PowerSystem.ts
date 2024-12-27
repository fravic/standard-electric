import { CornerCoordinates } from "./CornerCoordinates";
import { Buildable } from "./Buildable";

export class PowerPole extends Buildable {
  cornerCoordinates: CornerCoordinates;
  connectedToIds: string[] = [];

  constructor(
    id: string,
    cornerCoordinates: CornerCoordinates,
    isGhost?: boolean
  ) {
    super(id, "power_pole", isGhost);
    this.cornerCoordinates = cornerCoordinates;
  }

  getWorldPoint(): [number, number, number] {
    const point = this.cornerCoordinates.toWorldPoint();
    return [point[0], 0, point[2]];
  }

  createConnections(otherPoles: PowerPole[]) {
    this.connectedToIds = otherPoles
      .filter(
        (pole) =>
          pole !== this &&
          this.cornerCoordinates.adjacentTo(pole.cornerCoordinates)
      )
      .map((pole) => pole.id);
  }
}
