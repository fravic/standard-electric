import { z } from "zod";

/**
 * Base Entity Schema
 * In ECS architecture, entities are primarily identifiers that components attach to.
 * This schema ensures that entities are serializable for game state persistence.
 */
export const EntitySchema = z.object({
  id: z.string(),
  // Flag for entities that are in a "ghost" state (preview before placement)
  isGhost: z.boolean().optional(),
});

export type Entity = z.infer<typeof EntitySchema>;

/**
 * Create a new entity with a unique ID
 */
export function createEntity(id: string): Entity {
  return {
    id,
  };
}
