import { World, With } from "miniplex";
import { Draft } from "immer";

import { Entity } from "../entity";
import { System, SystemContext, SystemResult } from "./System";
import { GameContext } from "@/actor/game.types";
import { HexGrid, getCell } from "@/lib/HexGrid";
import { AdditionalBlueprintOptions, createEntityFromBlueprint } from "@/ecs/factories";
import { findPossibleConnectionsWithWorld } from "@/lib/buildables/findPossibleConnections";
import { CornerCoordinates } from "@/lib/coordinates/CornerCoordinates";
import { PowerSystem } from "./PowerSystem";
import { getAdjacentHexes } from "@/lib/coordinates/CornerCoordinates";
import { coordinatesToString } from "@/lib/coordinates/HexCoordinates";

/**
 * Context required for BuildableSystem operations
 */
export interface BuildableContext extends SystemContext {
  playerId: string;
  hexGrid: HexGrid;
  playerMoney: number;
  surveyedHexCells?: Set<string>;
}

/**
 * Result of BuildableSystem validation operations
 */
export interface BuildableValidationResult {
  valid: boolean;
  reason?: string;
  cost?: number;
}

/**
 * Result of BuildableSystem operations
 */
export interface BuildableResult extends SystemResult {
  entity?: Entity;
  cost?: number;
  moneyRemaining?: number;
  usedBlueprintId?: string;
  reason?: string;
}

/**
 * BuildableSystem handles the validation and creation of buildable entities
 */
export class BuildableSystem implements System<BuildableContext, BuildableResult> {
  private world: World<Entity> | null = null;
  private context: BuildableContext | null = null;

  /**
   * Initialize the system with the world and context
   */
  initialize(world: World<Entity>, context: BuildableContext): void {
    this.world = world;
    this.context = context;
  }

  /**
   * Validates if a buildable can be placed at the specified location
   */
  validateBuildableLocation(
    blueprintId: string,
    options: AdditionalBlueprintOptions
  ): BuildableValidationResult {
    if (!this.world || !this.context) {
      return { valid: false, reason: "System not initialized" };
    }

    const playerId = this.context.playerId;
    const blueprintEntity = this.world.entities.find((e) => e.id === blueprintId);

    if (!blueprintEntity || !("blueprint" in blueprintEntity)) {
      return {
        valid: false,
        reason: "Blueprint not found or invalid",
      };
    }

    // Verify ownership
    if (blueprintEntity.owner?.playerId !== playerId) {
      return {
        valid: false,
        reason: `Player ${playerId} is not the owner of blueprint ${blueprintId}`,
      };
    }

    // Check if player has enough money
    const cost = blueprintEntity.cost?.amount ?? 0;
    if (this.context.playerMoney < cost) {
      return {
        valid: false,
        reason: "Not enough money to build",
        cost,
      };
    }

    // Create a temporary entity to validate placement
    const buildable = createEntityFromBlueprint(
      blueprintEntity as With<Entity, "blueprint">,
      options
    );

    // For connections-type buildables (like power poles), find possible connections
    if (
      blueprintEntity.blueprint?.components?.connections &&
      options.cornerPosition?.cornerCoordinates
    ) {
      const connections = findPossibleConnectionsWithWorld(
        this.world,
        options.cornerPosition.cornerCoordinates,
        playerId
      );
      buildable.connections = { connectedToIds: connections };
    }

    // Check if the location is valid using our internal validation
    const validation = this.validateBuildableLocationInternal(buildable);

    if (!validation.valid) {
      return {
        valid: false,
        reason: validation.reason,
      };
    }

    return {
      valid: true,
      cost,
    };
  }

  /**
   * Internal method that validates if a buildable can be placed at its specified location
   */
  // Made public for testing purposes
  validateBuildableLocationInternal(buildable: Entity): { valid: boolean; reason?: string } {
    if (!this.world || !this.context) {
      return { valid: false, reason: "System not initialized" };
    }

    const grid = this.context.hexGrid;
    const playerId = this.context.playerId;
    const surveyedHexCells = this.context.surveyedHexCells;

    // First, check if the location is surveyed (if surveyedHexCells is provided)
    if (surveyedHexCells) {
      if (buildable.hexPosition?.coordinates) {
        // For buildables placed on hex cells (like power plants)
        const coordString = coordinatesToString(buildable.hexPosition.coordinates);
        if (!surveyedHexCells.has(coordString)) {
          return { valid: false, reason: "This location has not been surveyed" };
        }
      } else if (buildable.cornerPosition?.cornerCoordinates) {
        // For buildables placed on corners (like power poles)
        // Check if any of the adjacent hexes are surveyed
        const adjacentHexes = getAdjacentHexes(buildable.cornerPosition.cornerCoordinates);
        const anySurveyed = adjacentHexes.some((hex) =>
          surveyedHexCells.has(coordinatesToString(hex))
        );

        if (!anySurveyed) {
          return { valid: false, reason: "This location has not been surveyed" };
        }
      }
    }

    // Next, check region requirements

    // For power poles, check if the corner is in a valid region
    if (buildable.cornerPosition?.cornerCoordinates) {
      const hexCell = getCell(grid, buildable.cornerPosition.cornerCoordinates.hex);
      if (!hexCell?.regionName) {
        return { valid: false, reason: "Power poles must be placed in a region" };
      }

      // Now check grid connectivity
      const powerSystem = new PowerSystem();
      // Just initialize without running power production
      powerSystem.initialize(this.world, { hexGrid: grid });
      const connectivityValidation = powerSystem.validateBuildablePlacement(
        "powerPole",
        playerId,
        undefined,
        buildable.cornerPosition.cornerCoordinates
      );

      if (!connectivityValidation.valid) {
        return connectivityValidation;
      }

      return { valid: true };
    }

    // For power plants, check if the hex is in a valid region and matches the required state
    if (buildable.hexPosition?.coordinates && buildable.powerGeneration) {
      const cell = getCell(grid, buildable.hexPosition.coordinates);

      // Check if cell exists and has a region
      if (!cell) {
        return { valid: false, reason: "Invalid hex coordinate" };
      }

      if (!cell.regionName) {
        return {
          valid: false,
          reason: "Power plants must be placed in a region",
        };
      }

      // Check if the region matches the required state (if specified)
      const requiredRegion = buildable.requiredRegion;

      if (requiredRegion && cell.regionName !== requiredRegion.requiredRegionName) {
        return {
          valid: false,
          reason: `This power plant must be placed in ${requiredRegion.requiredRegionName}`,
        };
      }

      // Now check grid connectivity
      const powerSystem = new PowerSystem();
      // Just initialize without running power production
      powerSystem.initialize(this.world, { hexGrid: grid });
      const connectivityValidation = powerSystem.validateBuildablePlacement(
        "powerPlant",
        playerId,
        buildable.hexPosition.coordinates,
        undefined
      );

      if (!connectivityValidation.valid) {
        return connectivityValidation;
      }

      return { valid: true };
    }

    return {
      valid: false,
      reason: "Invalid buildable type or missing coordinates",
    };
  }

  /**
   * Creates a buildable entity at the specified location
   */
  createBuildable(blueprintId: string, options: AdditionalBlueprintOptions): BuildableResult {
    if (!this.world || !this.context) {
      return { success: false, reason: "System not initialized" };
    }

    // First validate the buildable location
    const validationResult = this.validateBuildableLocation(blueprintId, options);
    if (!validationResult.valid) {
      console.error(`Invalid buildable location: ${validationResult.reason}`);
      return {
        success: false,
        reason: validationResult.reason,
        cost: validationResult.cost,
      };
    }

    const playerId = this.context.playerId;
    const blueprintEntity = this.world.entities.find((e) => e.id === blueprintId) as With<
      Entity,
      "blueprint"
    >;
    const cost = blueprintEntity.cost?.amount ?? 0;
    if (blueprintEntity.blueprint.buildsRemaining === 0) {
      return {
        success: false,
        reason: "No more builds remaining for this blueprint",
      };
    }
    if (this.context.playerMoney < cost) {
      return {
        success: false,
        reason: "Not enough money to build",
      };
    }

    // For connections-type buildables (like power poles), find possible connections
    const connectionsOptions = blueprintEntity.blueprint.components.connections
      ? {
          ...options.connections,
          connectedToIds: findPossibleConnectionsWithWorld(
            this.world,
            options.cornerPosition!.cornerCoordinates,
            playerId
          ),
        }
      : undefined;

    // Create the entity from the blueprint
    const entity = createEntityFromBlueprint(blueprintEntity, {
      ...options,
      connections: connectionsOptions,
    });

    return {
      success: true,
      entity,
      cost,
      moneyRemaining: this.context.playerMoney - cost,
      usedBlueprintId: blueprintId,
    };
  }

  /**
   * Updates the system state based on the current world state
   * This doesn't perform any operations on its own, just delegates to specific methods
   */
  update(world: World<Entity>, context: BuildableContext): BuildableResult {
    this.initialize(world, context);
    // This method doesn't do anything on its own - specific operations
    // like validateBuildableLocation and createBuildable should be called directly
    return { success: false, reason: "No operation specified" };
  }

  /**
   * Applies the mutations based on the operation result
   */
  mutate(result: BuildableResult, contextDraft: Draft<GameContext>): void {
    if (!result.success || !this.context) {
      return;
    }

    const playerId = this.context.playerId;
    const { cost, entity, usedBlueprintId } = result;

    // Only make changes if we have an entity to add (this happens in createBuildable)
    if (entity) {
      // Deduct the cost from the player's money
      contextDraft.public.players[playerId].money -= cost ?? 0;

      // Add the new entity to the game context
      contextDraft.public.entitiesById[entity.id] = entity;

      // Update the blueprint's remaining builds if necessary
      if (usedBlueprintId) {
        const blueprint = contextDraft.public.entitiesById[usedBlueprintId] as With<
          Entity,
          "blueprint"
        >;
        if (blueprint.blueprint.buildsRemaining !== undefined) {
          const buildsRemaining = blueprint.blueprint.buildsRemaining - 1;
          if (buildsRemaining <= 0) {
            delete contextDraft.public.entitiesById[usedBlueprintId];
          } else {
            const currentBlueprint = blueprint.blueprint;
            const updatedBlueprint = {
              ...contextDraft.public.entitiesById[usedBlueprintId],
              blueprint: {
                ...currentBlueprint,
                buildsRemaining,
              },
            };
            contextDraft.public.entitiesById[usedBlueprintId] = updatedBlueprint;
          }
        }
      }
    }
  }

  /**
   * Static helper method to check if a buildable location is valid
   */
  static isValidBuildableLocation(
    world: World<Entity>,
    context: BuildableContext,
    blueprintId: string,
    options: AdditionalBlueprintOptions
  ): boolean {
    const system = new BuildableSystem();
    system.initialize(world, context);
    const result = system.validateBuildableLocation(blueprintId, options);
    return result.valid;
  }
}
