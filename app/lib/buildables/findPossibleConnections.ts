import { Entity } from "@/ecs/entity";
import { World } from "miniplex";
import { cornersAdjacent } from "../coordinates/CornerCoordinates";
import { CornerCoordinates } from "../coordinates/types";

/**
 * Helper function to find possible connections for a corner coordinate with entities in the world
 * @param cornerCoordinates The corner coordinates to check for possible connections
 * @param playerId Optional player ID to filter connections by owner
 * @returns Array of entity IDs that can connect to the given corner coordinates
 */
export function findPossibleConnectionsWithWorld(
  world: World<Entity>,
  cornerCoordinates: CornerCoordinates,
  playerId?: string
): string[] {
  const powerPolesQuery = world.with("connections", "cornerPosition");

  const eligiblePoles = playerId
    ? powerPolesQuery.entities.filter((pole) => pole.owner?.playerId === playerId)
    : powerPolesQuery.entities;

  return eligiblePoles
    .filter((pole) => cornersAdjacent(cornerCoordinates, pole.cornerPosition!.cornerCoordinates))
    .map((pole) => pole.id);
}
