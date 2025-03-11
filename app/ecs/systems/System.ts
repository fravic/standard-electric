import { World } from "miniplex";
import { Draft } from "immer";
import { Entity } from "../entity";
import { GameContext } from "@/actor/game.types";

/**
 * Base type for system-specific context
 */
export interface SystemContext {
  // Common base properties all contexts should have
}

/**
 * Base type for system-specific results
 */
export interface SystemResult {
  // Common base properties all results should have
  success: boolean;
}

/**
 * Generic System interface to be implemented by all systems
 * TContext extends the base SystemContext with system-specific properties
 * TResult extends the base SystemResult with system-specific properties
 */
export interface System<TContext extends SystemContext, TResult extends SystemResult> {
  /**
   * Initializes the system with the world and context.
   * This prepares the system for subsequent operations without performing actual processing.
   * @param world The current Miniplex world
   * @param context System-specific context needed for initialization
   */
  initialize(world: World<Entity>, context: TContext): void;

  /**
   * Updates the system state based on the current world state
   * This performs the main processing of the system and returns results.
   * @param world The current Miniplex world
   * @param context System-specific context needed for the update
   * @returns System-specific result object
   */
  update(world: World<Entity>, context: TContext): TResult;

  /**
   * Performs mutations on the game context within the system's scope
   * @param result The result from the update method
   * @param contextDraft An Immer draft of the entire game context
   */
  mutate(result: TResult, contextDraft: Draft<GameContext>): void;
}
