import { EntityWriteRegistry } from "../registry";

/**
 * Base System class
 *
 * Systems operate on entities with specific components to implement game logic.
 * They are responsible for updating the state of the game, and thus are only
 * implemented on the server.
 */
export abstract class System {
  protected registry: EntityWriteRegistry;

  constructor(registry: EntityWriteRegistry) {
    this.registry = registry;
  }

  /**
   * Perform the logic for a single game tick.
   */
  abstract tick(): void;
}
