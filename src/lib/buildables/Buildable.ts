import { toWorldPoint } from "../coordinates/HexCoordinates";
import { getCornerWorldPoint } from "../coordinates/CornerCoordinates";
import {
  createPowerPole,
  findPossibleConnectionsForCoordinates,
  isPowerPole,
} from "./PowerPole";
import { createCoalPlant } from "./CoalPlant";
import { BuildableSchema, Buildable } from "./schemas";
import { GameContext } from "@/actor/game.types";

export { BuildableSchema };
export type { Buildable };

export function createBuildable({
  id,
  buildable,
  playerId,
  isGhost,
  context,
}: {
  id: string;
  buildable: Pick<Buildable, "type" | "coordinates" | "cornerCoordinates">;
  playerId: string;
  isGhost?: boolean;
  context: GameContext;
}): Buildable {
  if (buildable.type === "power_pole" && buildable.cornerCoordinates) {
    return createPowerPole({
      id,
      cornerCoordinates: buildable.cornerCoordinates,
      playerId,
      connectedToIds: findPossibleConnectionsForCoordinates(
        buildable.cornerCoordinates,
        context.public.buildables.filter(isPowerPole)
      ),
      isGhost,
    });
  } else if (buildable.type === "coal_plant" && buildable.coordinates) {
    return createCoalPlant({
      id,
      coordinates: buildable.coordinates,
      playerId,
      isGhost,
    });
  }
  throw new Error(
    `Invalid buildable type or missing coordinates: ${buildable.type}`
  );
}

export function getBuildableWorldPoint(
  buildable: Buildable
): [number, number, number] {
  if (buildable.type === "power_pole" && buildable.cornerCoordinates) {
    const point = getCornerWorldPoint(buildable.cornerCoordinates);
    return [point[0], 0, point[2]];
  } else if (buildable.type === "coal_plant" && buildable.coordinates) {
    const point = toWorldPoint(buildable.coordinates);
    return [point[0], 0.5, point[2]];
  }
  throw new Error(
    `Invalid buildable type or missing coordinates: ${buildable.type}`
  );
}
