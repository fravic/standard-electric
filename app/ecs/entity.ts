import { z } from "zod";
import { ComponentSchema } from "./components";

/**
 * Base Entity Schema
 * In ECS architecture, entities are primarily identifiers that components attach to.
 * This schema ensures that entities are serializable for game state persistence.
 */
export const EntitySchema = z.object({
  id: z.string(),
  componentsByType: z.record(z.string(), ComponentSchema),
});

export type Entity = z.infer<typeof EntitySchema>;

/**
 * Create a new empty entity with a unique ID
 */
export function createEntity(id: string): Entity {
  return {
    id,
    componentsByType: {},
  };
}
