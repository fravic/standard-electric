import { World } from "miniplex";
import { Entity } from "./entity";

export function queryPowerPlantByIdAndOwnerId({
  world,
  powerPlantId,
  ownerId,
}: {
  world: World<Entity>;
  powerPlantId: string;
  ownerId: string;
}) {
  return world.with('powerGeneration', 'owner').where(
    (b) =>
      b.id === powerPlantId &&
      b.owner.playerId === ownerId
  ).first;
}

export function queryBlueprintsByIdAndOwnerId({
    world,
    blueprintId,
    ownerId,
}: {
    world: World<Entity>;
    blueprintId: string;
    ownerId: string;
}) {
    return world.with('blueprint', 'owner').where(
        (b) =>
            b.id === blueprintId &&
            b.owner.playerId === ownerId
    ).first;
}
