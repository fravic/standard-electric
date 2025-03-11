import { World, With } from "miniplex";
import { equals, HexCoordinates } from "@/lib/coordinates/HexCoordinates";
import { Entity } from "./entity";

export function entityAtHexCoordinate(world: World<Entity>, hexCoordinates: HexCoordinates) {
  return world
    .with("hexPosition")
    .where((entity) => equals(entity.hexPosition.coordinates, hexCoordinates)).first;
}

/**
 * Query for power pole blueprints for a specific player
 * Power poles are defined as entities with a connections component
 */
export function powerPoleBlueprintsForPlayer(world: World<Entity>, playerId: string) {
  return world
    .with("blueprint", "owner")
    .where(
      (entity) =>
        entity.owner.playerId === playerId && entity.blueprint.components.connections !== undefined
    );
}

/**
 * Query for power plant blueprints for a specific player
 * Power plants are defined as entities with a powerGeneration component
 */
export function powerPlantBlueprintsForPlayer(world: World<Entity>, playerId: string) {
  return world
    .with("blueprint", "owner")
    .where(
      (entity) =>
        entity.owner.playerId === playerId &&
        entity.blueprint.components.powerGeneration !== undefined
    );
}

/**
 * Query for all power poles (built, not blueprints)
 * Power poles are defined as entities with a connections component
 */
export function powerPoles(world: World<Entity>) {
  return world.with("cornerPosition", "connections");
}

/**
 * Query for power poles for a specific player
 */
export function powerPolesForPlayer(world: World<Entity>, playerId: string) {
  return powerPoles(world)
    .with("owner")
    .where((entity) => entity.owner.playerId === playerId);
}

/**
 * Query for all power plants (built, not blueprints)
 * Power plants are defined as entities with a powerGeneration component
 */
export function powerPlants(world: World<Entity>) {
  return world.with("hexPosition", "powerGeneration");
}

/**
 * Query for power plants for a specific player
 */
export function powerPlantsForPlayer(world: World<Entity>, playerId: string) {
  return powerPlants(world)
    .with("owner")
    .where((entity) => entity.owner.playerId === playerId);
}
