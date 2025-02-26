import { toWorldPoint } from "../coordinates/HexCoordinates";
import { getCornerWorldPoint } from "../coordinates/CornerCoordinates";
import {
  createPowerPole,
  findPossibleConnectionsForCoordinates,
  isPowerPole,
} from "./PowerPole";
import { createPowerPlant, isPowerPlant } from "./PowerPlant";
import { BuildableSchema, Buildable, BuiltBuildable } from "./schemas";
import { GameContext } from "@/actor/game.types";
import { HexGrid } from "../HexGrid";

export { BuildableSchema };
export type { Buildable };

// validateBuildableLocation has been moved to its own file
export { validateBuildableLocation } from "./validateBuildableLocation";

export function createBuildable({
  buildable,
  playerId,
  isGhost,
  context,
}: {
  buildable: Pick<
    Buildable,
    "type" | "coordinates" | "cornerCoordinates" | "id"
  >;
  playerId: string;
  isGhost?: boolean;
  context: GameContext;
}): Buildable {
  if (buildable.type === "power_pole" && buildable.cornerCoordinates) {
    return createPowerPole({
      id: buildable.id,
      cornerCoordinates: buildable.cornerCoordinates,
      playerId,
      connectedToIds: findPossibleConnectionsForCoordinates(
        buildable.cornerCoordinates,
        context.public.buildables.filter(isPowerPole)
      ),
      isGhost,
    });
  }

  if (isPowerPlant(buildable) && buildable.coordinates) {
    const player = context.public.players[playerId];
    const blueprint = player.blueprintsById[buildable.id];
    if (!blueprint) {
      throw new Error(`Blueprint not found for id: ${buildable.id}`);
    }
    return createPowerPlant({
      id: buildable.id,
      coordinates: buildable.coordinates,
      playerId,
      blueprint,
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
  } else if (isPowerPlant(buildable) && buildable.coordinates) {
    const point = toWorldPoint(buildable.coordinates);
    return [point[0], 0.5, point[2]];
  }
  throw new Error(
    `Invalid buildable type or missing coordinates: ${buildable.type}`
  );
}

export function isBuilt(buildable: Buildable): buildable is BuiltBuildable {
  return "playerId" in buildable;
}
