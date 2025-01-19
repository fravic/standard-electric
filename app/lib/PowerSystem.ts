import { CornerCoordinates } from "./coordinates/types";
import { getCornerWorldPoint } from "./coordinates/CornerCoordinates";
import { PowerPole, createPowerPole } from "./buildables/PowerPole";
import { cornersAdjacent } from "./coordinates/CornerCoordinates";

export type { PowerPole };
export { createPowerPole };

export function createConnections(pole: PowerPole, otherPoles: PowerPole[]): string[] {
  return otherPoles
    .filter(
      (otherPole) =>
        otherPole.id !== pole.id &&
        otherPole.cornerCoordinates &&
        pole.cornerCoordinates &&
        cornersAdjacent(pole.cornerCoordinates, otherPole.cornerCoordinates)
    )
    .map((pole) => pole.id);
}

export function getPowerPoleWorldPoint(pole: PowerPole): [number, number, number] {
  if (!pole.cornerCoordinates) {
    throw new Error("Power pole missing corner coordinates");
  }
  const point = getCornerWorldPoint(pole.cornerCoordinates);
  return [point[0], 0, point[2]];
}
