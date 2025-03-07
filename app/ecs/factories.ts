import { With, World } from "miniplex";
import { nanoid } from "nanoid";

import { Entity } from "./entity";

export function createWorldWithEntities(entitiesById: Record<string, Entity>) {
  const world = new World<Entity>();
  Object.values(entitiesById).forEach(entity => world.add(entity));
  return world;
}

/**
 * Given an entity with a blueprint, create another entity with the blueprint components.
 */
export function createEntityFromBlueprint(blueprintEntity: With<Entity, 'blueprint'>): Entity {
  return {
    ...blueprintEntity.blueprint,
    id: nanoid(),
  };
}