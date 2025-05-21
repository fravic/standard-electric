import { World } from "miniplex";
import { Draft } from "immer";
import { nanoid } from "nanoid";
import seedrandom from "seedrandom";

import { Entity } from "../entity";
import { System, SystemContext, SystemResult } from "./System";
import { GameContext } from "@/actor/game.types";
import { CommodityType } from "@/lib/types";
import { HexCoordinates, coordinatesToString } from "@/lib/coordinates/HexCoordinates";
import { HexGrid, getCells } from "@/lib/HexGrid";
import { TerrainType } from "@/lib/HexCell";
import { createSurvey } from "../factories";

/**
 * Context for the SurveySystem
 */
export interface SurveyContext extends SystemContext {
  currentTick: number;
  hexGrid: HexGrid;
  randomSeed: number;
  precomputedResources?: Record<string, HexCellResource>;
  playerId: string;
}

export interface SurveySystemResult extends SystemResult {
  hexCellResources?: Record<string, HexCellResource>;
  surveyIdsToComplete?: string[];
  surveyToCreate?: Entity;
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
export const SURVEY_DURATION_TICKS = 2;

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
export class SurveySystem implements System<SurveyContext, SurveySystemResult> {
  private world: World<Entity> | null = null;
  private context: SurveyContext | null = null;

  /**
   * Initializes the system with the world and context. Since surveys are private, this operates on a private world.
   * @param world The current Miniplex world
   * @param context SurveyContext needed for initialization
   */
  public initialize(world: World<Entity>, context: SurveyContext): void {
    this.world = world;
    this.context = context;
  }

  /**
   * Updates the survey state in the context of *one* player
   * @param world The current Miniplex world
   * @param context SurveyContext needed for the update
   * @returns Updated survey results
   */
  public update(world: World<Entity>, context: SurveyContext): SurveySystemResult {
    const incompleteSurveys = world
      .with("surveyResult")
      .where((entity) => entity.surveyResult?.isComplete !== true);
    const surveyIdsToComplete: string[] = [];
    for (const survey of incompleteSurveys) {
      if (
        !survey.surveyResult.isComplete &&
        context.currentTick - survey.surveyResult.surveyStartTick >= SURVEY_DURATION_TICKS
      ) {
        surveyIdsToComplete.push(survey.id);
      }
    }
    return {
      surveyIdsToComplete,
      success: true,
    };
  }

  /**
   * Performs mutations on the game context based on the survey results
   * @param result The result from the update method
   * @param contextDraft An Immer draft of the entire game context
   */
  public mutate(result: SurveySystemResult, contextDraft: Draft<GameContext>): void {
    for (const surveyId of result.surveyIdsToComplete ?? []) {
      const surveyEnt = contextDraft.private[this.context!.playerId].entitiesById[surveyId];
      const hexCoord = surveyEnt.hexPosition?.coordinates;
      surveyEnt.surveyResult = {
        surveyStartTick: surveyEnt.surveyResult!.surveyStartTick,
        isComplete: true,
        resource: this.context!.precomputedResources![coordinatesToString(hexCoord!)],
      };
    }

    const surveyToCreate = result.surveyToCreate;
    if (surveyToCreate) {
      contextDraft.private[this.context!.playerId].entitiesById[surveyToCreate.id] = surveyToCreate;
    }

    const hexCellResources = result.hexCellResources;
    if (hexCellResources) {
      if (!contextDraft.private[SERVER_ONLY_ID]) {
        contextDraft.private[SERVER_ONLY_ID] = {
          entitiesById: {},
          hexCellResources: {},
        };
      }
      contextDraft.private[SERVER_ONLY_ID].hexCellResources = hexCellResources;
    }
  }

  /**
   * Determines if a survey is complete based on the current tick and when it started
   * @param surveyStartTick The tick when the survey started
   * @param currentTick The current game tick
   * @returns True if the survey is complete
   */
  public static isSurveyComplete(surveyStartTick: number, currentTick: number): boolean {
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
   * @returns True if the player has an active survey
   */
  public static hasActiveSurvey(world: World<Entity>): boolean {
    const incompleteSurvey = world
      .with("surveyResult")
      .where((entity) => entity.surveyResult?.isComplete !== true).first;
    return Boolean(incompleteSurvey);
  }

  /**
   * Starts a new survey if the player doesn't already have an active survey
   * @param coordinates The coordinates to survey
   * @param currentTick The current game tick
   * @returns Updated survey results, or null if a new survey couldn't be started
   */
  public startSurvey(coordinates: HexCoordinates, currentTick: number): SurveySystemResult {
    // Check if player already has an active survey
    if (SurveySystem.hasActiveSurvey(this.world!)) {
      return { success: false };
    }

    // Create a new survey
    return {
      surveyToCreate: createSurvey({
        id: nanoid(),
        hexCoordinates: coordinates,
        surveyStartTick: currentTick,
        isComplete: false,
        playerId: this.context!.playerId,
      }),
      success: true,
    };
  }

  /**
   * Precomputes resources for all hex cells in the grid
   * @returns Map of hex cell coordinates to resources
   */
  public precomputeHexCellResources(): SurveySystemResult {
    // Initialize random number generator with seed
    const rng = seedrandom(String(this.context!.randomSeed));

    // Get all cells from the grid
    const cells = getCells(this.context!.hexGrid);

    // Initialize result map
    const result: Record<string, HexCellResource> = {};

    // Process each cell
    for (const cell of cells) {
      const coordString = coordinatesToString(cell.coordinates);
      const terrainType = cell.terrainType;

      // Skip if terrain type is not defined
      if (terrainType === undefined) {
        continue;
      }

      // Get resource config for this terrain type
      const resourceConfig = RESOURCE_CONFIG[terrainType];

      // Check if we should generate a resource (based on probability)
      if (rng() > resourceConfig.resourceProbability) {
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
        continue;
      }

      // Get resource amount config
      const resourceAmountConfig = resourceConfig.resources[selectedResourceType]?.amount;

      if (!resourceAmountConfig) {
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

    return { hexCellResources: result, surveyIdsToComplete: [], success: true };
  }
}
