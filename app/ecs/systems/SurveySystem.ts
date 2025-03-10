import { World } from "miniplex";
import { Draft } from "immer";
import { Entity } from "../entity";
import { System, SystemContext, SystemResult } from "./System";
import { GameContext } from "@/actor/game.types";
import { CommodityType } from "@/lib/market/CommodityMarket";
import { HexCoordinates, coordinatesToString } from "@/lib/coordinates/HexCoordinates";
import { HexGrid, getCells } from "@/lib/HexGrid";
import { TerrainType } from "@/lib/HexCell";
import seedrandom from "seedrandom";

/**
 * Context for the SurveySystem
 */
export interface SurveyContext extends SystemContext {
  currentTick: number;
  hexGrid: HexGrid;
  randomSeed: number;
  surveyResultsByPlayerId: Record<string, Record<string, SurveyResult>>;
  precomputedResources?: Record<string, HexCellResource | undefined>;
}

/**
 * Result of the SurveySystem operations
 */
export interface SurveyResult extends SystemResult {
  surveyStartTick: number;
  isComplete?: boolean;
  resource?: HexCellResource;
}

/**
 * Represents a resource in a hex cell
 */
export interface HexCellResource {
  resourceType: CommodityType;
  resourceAmount: number;
}

/**
 * Resource configuration by terrain type
 */
export interface ResourceConfig {
  // Probability of finding any resource (0-1)
  resourceProbability: number;
  // Resource types with their configuration
  resources: {
    [key in CommodityType]?: {
      // Relative weight/probability of this resource type (0-1)
      weight: number;
      // Resource amount configuration
      amount: {
        min: number;
        max: number;
      };
    };
  };
}

// Define how many ticks a survey takes to complete
export const SURVEY_DURATION_TICKS = 4;

// Server-only player ID for storing ground truth about resources
export const SERVER_ONLY_ID = "__SERVER_ONLY__";

// Configuration for resources by terrain type
export const RESOURCE_CONFIG: Record<TerrainType, ResourceConfig> = {
  [TerrainType.Mountains]: {
    resourceProbability: 0.6, // 60% chance for resources
    resources: {
      [CommodityType.COAL]: {
        weight: 0.7,
        amount: {
          min: 40,
          max: 150,
        },
      },
      [CommodityType.URANIUM]: {
        weight: 0.3,
        amount: {
          min: 10,
          max: 50,
        },
      },
    },
  },
  [TerrainType.Forest]: {
    resourceProbability: 0.5, // 50% chance for resources
    resources: {
      [CommodityType.COAL]: {
        weight: 0.8,
        amount: {
          min: 80,
          max: 200,
        },
      },
      [CommodityType.OIL]: {
        weight: 0.2,
        amount: {
          min: 20,
          max: 80,
        },
      },
    },
  },
  [TerrainType.Plains]: {
    resourceProbability: 0.3, // 30% chance for resources
    resources: {
      [CommodityType.OIL]: {
        weight: 0.5,
        amount: {
          min: 30,
          max: 100,
        },
      },
      [CommodityType.GAS]: {
        weight: 0.5,
        amount: {
          min: 40,
          max: 120,
        },
      },
    },
  },
  [TerrainType.Desert]: {
    resourceProbability: 0.4, // 40% chance for resources
    resources: {
      [CommodityType.OIL]: {
        weight: 0.4,
        amount: {
          min: 50,
          max: 150,
        },
      },
      [CommodityType.URANIUM]: {
        weight: 0.3,
        amount: {
          min: 15,
          max: 60,
        },
      },
      [CommodityType.GAS]: {
        weight: 0.3,
        amount: {
          min: 30,
          max: 100,
        },
      },
    },
  },
  [TerrainType.Water]: {
    resourceProbability: 0.3, // 30% chance for resources
    resources: {
      [CommodityType.GAS]: {
        weight: 0.7,
        amount: {
          min: 50,
          max: 150,
        },
      },
      [CommodityType.OIL]: {
        weight: 0.3,
        amount: {
          min: 40,
          max: 120,
        },
      },
    },
  },
};

/**
 * Handles survey logic for resources
 * Implements the System interface for standardized system integration
 */
export class SurveySystem implements System<SurveyContext, Record<string, Record<string, SurveyResult>> & SystemResult> {
  /**
   * Initializes the system with the world and context
   * @param world The current Miniplex world
   * @param context SurveyContext needed for initialization
   */
  public initialize(world: World<Entity>, context: SurveyContext): void {
    // Precompute resources if they don't exist
    if (!context.precomputedResources) {
      context.precomputedResources = this.precomputeHexCellResources(
        context.hexGrid,
        context.randomSeed
      );
    }
  }

  /**
   * Updates the survey state based on the current context
   * @param world The current Miniplex world
   * @param context SurveyContext needed for the update
   * @returns Updated survey results
   */
  public update(
    world: World<Entity>,
    context: SurveyContext
  ): Record<string, Record<string, SurveyResult>> & SystemResult & { precomputedResources?: Record<string, HexCellResource | undefined> } {
    const updatedSurveyResults = {} as Record<string, Record<string, SurveyResult>> & SystemResult & { precomputedResources?: Record<string, HexCellResource | undefined> };
    
    // Include precomputed resources in the result
    updatedSurveyResults.precomputedResources = context.precomputedResources;
    
    // Update surveys for each player
    for (const [playerId, surveyResults] of Object.entries(context.surveyResultsByPlayerId)) {
      updatedSurveyResults[playerId] = this.updateSurveys(
        surveyResults,
        context.currentTick,
        context.precomputedResources || {}
      );
    }
    
    return updatedSurveyResults;
  }

  /**
   * Performs mutations on the game context based on the survey results
   * @param result The result from the update method
   * @param contextDraft An Immer draft of the entire game context
   */
  public mutate(
    result: Record<string, Record<string, SurveyResult>>,
    contextDraft: Draft<GameContext>
  ): void {
    if (!result) return;
    
    // Update each player's survey results in the public context
    Object.entries(result).forEach(([playerId, surveyResults]) => {
      // Skip the success property and precomputedResources
      if (playerId === 'success' || playerId === 'precomputedResources') return;
      
      // Skip the SERVER_ONLY_ID player
      if (playerId === SERVER_ONLY_ID) return;
      
      // Update the player's survey results in private context
      if (contextDraft.private[playerId]) {
        contextDraft.private[playerId].surveyResultByHexCell = surveyResults;
      }
    });
    
    // If we have precomputed resources in the result, update the private context
    if ('precomputedResources' in result && result.precomputedResources) {
      // Ensure the server-only context exists
      if (!contextDraft.private[SERVER_ONLY_ID]) {
        contextDraft.private[SERVER_ONLY_ID] = { surveyResultByHexCell: {}, hexCellResources: {} };
      }
      
      // Convert any undefined values to null for type compatibility
      const hexCellResources: Record<string, HexCellResource> = {};
      
      // Ensure we're working with the correct HexCellResource type
      Object.entries(result.precomputedResources).forEach(([key, value]) => {
        if (value === undefined) {
          return;
        } else if ('resourceType' in value && 'resourceAmount' in value) {
          // This is a valid HexCellResource
          hexCellResources[key] = value as HexCellResource;
        } else if (value.resource) {
          // Handle case where value is a SurveyResult with a resource field
          hexCellResources[key] = value.resource;
        }
      });
      
      // Update the private context with the hex cell resources
      contextDraft.private[SERVER_ONLY_ID].hexCellResources = hexCellResources;
    }
  }

  /**
   * Determines if a survey is complete based on the current tick and when it started
   * @param surveyStartTick The tick when the survey started
   * @param currentTick The current game tick
   * @returns True if the survey is complete
   */
  public isSurveyComplete(
    surveyStartTick: number,
    currentTick: number
  ): boolean {
    return currentTick >= surveyStartTick + SURVEY_DURATION_TICKS;
  }

  /**
   * Gets the resource for a hex cell from the precomputed resources
   * @param hexCoordinates The coordinates of the hex cell
   * @param precomputedResources The precomputed resources for all hex cells
   * @returns The resource at the specified coordinates, or null if none exists
   */
  public getHexCellResource(
    hexCoordinates: HexCoordinates,
    precomputedResources: Record<string, HexCellResource | undefined>
  ): HexCellResource | undefined {
    const coordString = coordinatesToString(hexCoordinates);
    return precomputedResources[coordString];
  }

  /**
   * Checks if a player has an active survey
   * @param surveyResultByHexCell The player's survey results
   * @param currentTick The current game tick
   * @returns True if the player has an active survey
   */
  public hasActiveSurvey(
    surveyResultByHexCell: Record<string, SurveyResult>,
    currentTick: number
  ): boolean {
    return Object.values(surveyResultByHexCell).some(
      (result) => !result.isComplete && !this.isSurveyComplete(result.surveyStartTick, currentTick)
    );
  }

  /**
   * Updates surveys based on the current tick
   * @param surveyResultByHexCell The survey results to update
   * @param currentTick The current game tick
   * @param precomputedResources The precomputed resources for all hex cells
   * @returns Updated survey results
   */
  public updateSurveys(
    surveyResultByHexCell: Record<string, SurveyResult>,
    currentTick: number,
    precomputedResources: Record<string, HexCellResource | undefined>
  ): Record<string, SurveyResult> {
    const result = { ...surveyResultByHexCell };

    // Update each survey
    for (const [coordString, surveyResult] of Object.entries(result)) {
      // Skip already completed surveys
      if (surveyResult.isComplete) continue;

      // Check if the survey is now complete
      if (this.isSurveyComplete(surveyResult.surveyStartTick, currentTick)) {
        // Mark as complete and add the resource information
        result[coordString] = {
          ...surveyResult,
          isComplete: true,
          resource: precomputedResources[coordString],
        };
      }
    }

    return result;
  }

  /**
   * Starts a new survey if the player doesn't already have an active survey
   * @param surveyResultByHexCell The player's current survey results
   * @param coordinates The coordinates to survey
   * @param currentTick The current game tick
   * @returns Updated survey results, or null if a new survey couldn't be started
   */
  public startSurvey(
    surveyResultByHexCell: Record<string, SurveyResult>,
    coordinates: HexCoordinates,
    currentTick: number
  ): Record<string, SurveyResult> {
    // Check if player already has an active survey
    if (this.hasActiveSurvey(surveyResultByHexCell, currentTick)) {
      return surveyResultByHexCell;
    }

    // Create a new survey
    const coordString = coordinatesToString(coordinates);
    
    return {
      ...surveyResultByHexCell,
      [coordString]: {
        surveyStartTick: currentTick,
        success: true,
      },
    };
  }

  /**
   * Precomputes resources for all hex cells in the grid
   * @param hexGrid The hex grid to precompute resources for
   * @param randomSeed Seed for random number generation
   * @returns Map of hex cell coordinates to resources
   */
  public precomputeHexCellResources(
    hexGrid: HexGrid,
    randomSeed: number
  ): Record<string, HexCellResource | undefined> {
    // Initialize random number generator with seed
    const rng = seedrandom(String(randomSeed));
    
    // Get all cells from the grid
    const cells = getCells(hexGrid);
    
    // Initialize result map
    const result: Record<string, HexCellResource | undefined> = {};
    
    // Process each cell
    for (const cell of cells) {
      const coordString = coordinatesToString(cell.coordinates);
      const terrainType = cell.terrainType;
      
      // Skip if terrain type is not defined
      if (terrainType === undefined) {
        result[coordString] = undefined;
        continue;
      }
      
      // Get resource config for this terrain type
      const resourceConfig = RESOURCE_CONFIG[terrainType];
      
      // Check if we should generate a resource (based on probability)
      if (rng() > resourceConfig.resourceProbability) {
        result[coordString] = undefined;
        continue;
      }
      
      // Calculate total weight of all resource types
      const resourceEntries = Object.entries(resourceConfig.resources);
      const totalWeight = resourceEntries.reduce(
        (sum, [, config]) => sum + (config?.weight || 0),
        0
      );
      
      // If there are no resource types with weight, skip
      if (totalWeight <= 0) {
        result[coordString] = undefined;
        continue;
      }
      
      // Pick a random resource type based on weights
      let randomValue = rng() * totalWeight;
      let selectedResourceType: CommodityType | undefined = undefined;
      
      for (const [type, config] of resourceEntries) {
        if (!config) continue;
        
        randomValue -= config.weight;
        
        if (randomValue <= 0) {
          selectedResourceType = type as CommodityType;
          break;
        }
      }
      
      // If no resource type was selected, skip
      if (selectedResourceType === undefined) {
        result[coordString] = undefined;
        continue;
      }
      
      // Get resource amount config
      const resourceAmountConfig = resourceConfig.resources[selectedResourceType]?.amount;
      
      if (!resourceAmountConfig) {
        result[coordString] = undefined;
        continue;
      }
      
      // Generate random amount within range
      const min = resourceAmountConfig.min;
      const max = resourceAmountConfig.max;
      const amount = Math.floor(rng() * (max - min + 1)) + min;
      
      // Create resource
      result[coordString] = {
        resourceType: selectedResourceType,
        resourceAmount: amount,
      };
    }
    
    return result;
  }
}
