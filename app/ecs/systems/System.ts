import { EntityRegistry } from "../registry";

/**
 * Base System class
 *
 * Systems operate on entities with specific components to implement game logic.
 */
export abstract class System {
  constructor(protected registry: EntityRegistry) {}

  /**
   * Update method to be implemented by each system
   * Called each game tick/frame
   */
  abstract update(): void;

  /**
   * Optional initialization method
   */
  init?(): void;

  /**
   * Optional cleanup method
   * Called when the system is removed from the game
   */
  cleanup?(): void;
}
