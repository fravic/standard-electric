import { cornersAdjacent } from "../coordinates/CornerCoordinates";
import { CornerCoordinates } from "../coordinates/types";
import { z } from "zod";
import { Buildable, PowerPoleSchema } from "./schemas";

export type PowerPole = z.infer<typeof PowerPoleSchema>;

export function isPowerPole(buildable: Buildable): buildable is PowerPole {
  return buildable.type === "power_pole";
}

export function createPowerPole({
  id,
  cornerCoordinates,
  playerId,
  connectedToIds,
  isGhost,
}: {
  id: string;
  cornerCoordinates: CornerCoordinates;
  playerId: string;
  connectedToIds: string[];
  isGhost?: boolean;
}): PowerPole {
  return {
    id,
    type: "power_pole",
    playerId,
    isGhost,
    cornerCoordinates,
    connectedToIds,
  };
}

export function findPossibleConnectionsForCoordinates(
  cornerCoordinates: CornerCoordinates,
  otherPoles: PowerPole[]
): string[] {
  return otherPoles
    .filter(
      (otherPole) =>
        otherPole.cornerCoordinates &&
        cornersAdjacent(cornerCoordinates, otherPole.cornerCoordinates)
    )
    .map((pole) => pole.id);
}
