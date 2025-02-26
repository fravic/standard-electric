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
import { HexGrid, getCell } from "../HexGrid";

export { BuildableSchema };
export type { Buildable };

/**
 * Validates if a buildable can be placed at the specified location
 * based on region requirements and other constraints.
 */
export function validateBuildableLocation(
  buildable: Pick<
    Buildable,
    "type" | "coordinates" | "cornerCoordinates" | "id"
  >,
  grid: HexGrid,
  context: GameContext,
  playerId: string
): { valid: boolean; reason?: string } {
  // For power poles, check if the corner is in a valid region
  if (buildable.type === "power_pole" && buildable.cornerCoordinates) {
    const hexCell = getCell(grid, buildable.cornerCoordinates.hex);
    if (!hexCell?.regionName) {
      return { valid: false, reason: "Power poles must be placed in a region" };
    }
    return { valid: true };
  }

  // For power plants, check if the hex is in a valid region and matches the required state
  if (isPowerPlant(buildable) && buildable.coordinates) {
    const cell = getCell(grid, buildable.coordinates);

    // Check if cell exists and has a region
    if (!cell) {
      return { valid: false, reason: "Invalid hex coordinate" };
    }

    if (!cell.regionName) {
      return {
        valid: false,
        reason: "Power plants must be placed in a region",
      };
    }

    // Check if the region matches the required state (if specified)
    const player = context.public.players[playerId];
    const blueprint = player?.blueprintsById[buildable.id];

    if (
      blueprint?.requiredState &&
      cell.regionName !== blueprint.requiredState
    ) {
      return {
        valid: false,
        reason: `This power plant must be placed in ${blueprint.requiredState}`,
      };
    }

    return { valid: true };
  }

  return {
    valid: false,
    reason: "Invalid buildable type or missing coordinates",
  };
}

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
