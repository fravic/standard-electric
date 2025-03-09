import { With, World } from "miniplex";
import { nanoid } from "nanoid";
import { z } from "zod";

import { Entity, CornerPositionComponentSchema, HexPositionComponentSchema } from "./entity";

export function createWorldWithEntities(entitiesById: Record<string, Entity>) {
  const world = new World<Entity>();
  Object.values(entitiesById).forEach(entity => world.add(entity));
  return world;
}

/**
 * Given an entity with a blueprint, create another entity with the blueprint components.
 */
export const AdditionalBlueprintOptionsSchema = z.object({
  cornerPosition: CornerPositionComponentSchema.optional(),
  hexPosition: HexPositionComponentSchema.optional(),
});

export type AdditionalBlueprintOptions = z.infer<typeof AdditionalBlueprintOptionsSchema>;

export function createEntityFromBlueprint(
  blueprintEntity: With<Entity, 'blueprint'>,
  options: AdditionalBlueprintOptions
): Entity {
  return {
    ...blueprintEntity.blueprint,
    ...options,
    id: nanoid(),
  };
}

export function createPowerPoleBlueprint(playerId: string): With<Entity, 'blueprint'> {
  return {
    id: nanoid(),
    name: "Power pole blueprint",
    blueprint: {
      name: "Power pole",
      allowedPosition: "corner",
      components: {
        connections: {
          connectedToIds: [],
        },
        renderable: {
          renderableComponentName: "PowerPole",
        },
      },
    },
    owner: {
      playerId,
    }
  };
}

export function createDefaultBlueprintsForPlayer(playerId: string): With<Entity, 'blueprint'>[] {
  return [
    createPowerPoleBlueprint(playerId)
  ]
}