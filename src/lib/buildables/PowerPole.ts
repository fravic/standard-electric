import { cornersAdjacent } from "../coordinates/CornerCoordinates";
import {
  CornerCoordinates,
  CornerCoordinatesSchema,
} from "../coordinates/types";
import { BuildableSchema } from "./Buildable";
import { z } from "zod";

export const PowerPoleSchema = BuildableSchema.extend({
  type: z.literal("power_pole"),
  cornerCoordinates: CornerCoordinatesSchema,
  connectedToIds: z.array(z.string()),
});

export type PowerPole = z.infer<typeof PowerPoleSchema>;

export function createPowerPole(
  id: string,
  cornerCoordinates: CornerCoordinates,
  playerId: string,
  isGhost?: boolean
): PowerPole {
  return {
    id,
    type: "power_pole",
    playerId,
    isGhost,
    cornerCoordinates,
    connectedToIds: [],
  };
}

export function createPowerPoleConnections(
  pole: PowerPole,
  otherPoles: PowerPole[]
): void {
  pole.connectedToIds = otherPoles
    .filter(
      (otherPole) =>
        otherPole.id !== pole.id &&
        pole.cornerCoordinates &&
        otherPole.cornerCoordinates &&
        cornersAdjacent(pole.cornerCoordinates, otherPole.cornerCoordinates)
    )
    .map((pole) => pole.id);
}
