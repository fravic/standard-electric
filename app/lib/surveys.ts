import { CommodityType } from "./market/CommodityMarket";
import {
  HexCoordinates,
  coordinatesToString,
} from "./coordinates/HexCoordinates";
import { HexGrid, getCells } from "./HexGrid";
import { TerrainType } from "./HexCell";

// Define how many ticks a survey takes to complete
export const SURVEY_DURATION_TICKS = 4;

// Server-only player ID for storing ground truth about resources
export const SERVER_ONLY_ID = "__SERVER_ONLY__";

// Resource configuration by terrain type
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
    resourceProbability: 0.4, // 40% chance for resources
    resources: {
      [CommodityType.COAL]: {
        weight: 1.0,
        amount: {
          min: 30,
          max: 100,
        },
      },
    },
  },
  [TerrainType.Plains]: {
    resourceProbability: 0.3, // 30% chance for resources
    resources: {
      [CommodityType.OIL]: {
        weight: 0.6,
        amount: {
          min: 25,
          max: 90,
        },
      },
      [CommodityType.GAS]: {
        weight: 0.4,
        amount: {
          min: 35,
          max: 120,
        },
      },
    },
  },
  [TerrainType.Desert]: {
    resourceProbability: 0.2, // 20% chance for resources
    resources: {
      [CommodityType.OIL]: {
        weight: 0.7,
        amount: {
          min: 20,
          max: 80,
        },
      },
      [CommodityType.URANIUM]: {
        weight: 0.3,
        amount: {
          min: 5,
          max: 30,
        },
      },
    },
  },
  [TerrainType.Water]: {
    resourceProbability: 0.1, // 10% chance for resources
    resources: {
      [CommodityType.GAS]: {
        weight: 0.8,
        amount: {
          min: 50,
          max: 180,
        },
      },
      [CommodityType.OIL]: {
        weight: 0.2,
        amount: {
          min: 30,
          max: 100,
        },
      },
    },
  },
};

export interface HexCellResource {
  resourceType: CommodityType;
  resourceAmount: number;
}

export interface SurveyResult {
  surveyStartTick: number;
  isComplete?: boolean; // Calculated based on surveyStartTick and current tick
  resource?: HexCellResource; // Resource found (if any)
}

/**
 * Determines if a survey is complete based on the current tick and when it started
 */
export function isSurveyComplete(
  surveyStartTick: number,
  currentTick: number
): boolean {
  return currentTick - surveyStartTick >= SURVEY_DURATION_TICKS;
}

/**
 * Precomputes resources for all hex cells in the grid
 * @param hexGrid The hex grid to precompute resources for
 * @param randomSeed Seed for random number generation
 * @returns Map of hex cell coordinates to resources
 */
export function precomputeHexCellResources(
  hexGrid: HexGrid,
  randomSeed: number
): Record<string, HexCellResource | null> {
  const resources: Record<string, HexCellResource | null> = {};
  const cells = getCells(hexGrid);

  // Use a seeded random number generator
  const random = (min: number, max: number) => {
    // Simple seeded random function
    const x = Math.sin(randomSeed++) * 10000;
    const rand = x - Math.floor(x);
    return Math.floor(rand * (max - min + 1)) + min;
  };

  // Helper function to select a weighted random resource type from the resources configuration
  const selectWeightedResource = (
    resources: ResourceConfig["resources"]
  ): CommodityType | null => {
    // Create a map of resource types to their weights
    const weights: Record<string, number> = {};

    // Extract weights from resources
    Object.entries(resources).forEach(([resourceType, config]) => {
      if (config) {
        weights[resourceType] = config.weight;
      }
    });

    // If no resources are configured, return null
    if (Object.keys(weights).length === 0) {
      return null;
    }

    // Select a resource type based on weights
    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((sum, [_, weight]) => sum + weight, 0);
    let randomValue = (random(0, 1000) / 1000) * totalWeight;

    for (const [resourceType, weight] of entries) {
      randomValue -= weight;
      if (randomValue <= 0) {
        return resourceType as CommodityType;
      }
    }

    // Fallback to the last item if something goes wrong
    return entries[entries.length - 1][0] as CommodityType;
  };

  cells.forEach((cell) => {
    const coordString = coordinatesToString(cell.coordinates);
    const config = RESOURCE_CONFIG[cell.terrainType];

    // Determine if this cell has resources based on the terrain's resource probability
    if (random(0, 1000) / 1000 < config.resourceProbability) {
      // Select a resource type based on the weighted probabilities
      const resourceType = selectWeightedResource(config.resources);

      // If no resource type was selected (no resources configured for this terrain), skip
      if (!resourceType) {
        resources[coordString] = null;
        return;
      }

      // Get the resource configuration
      const resourceConfig = config.resources[resourceType];

      // If no configuration exists for this resource type, skip
      if (!resourceConfig) {
        resources[coordString] = null;
        return;
      }

      // Determine the resource amount within the configured range
      const resourceAmount = random(
        resourceConfig.amount.min,
        resourceConfig.amount.max
      );

      resources[coordString] = {
        resourceType,
        resourceAmount,
      };
    } else {
      resources[coordString] = null; // No resources on this cell
    }
  });

  return resources;
}

/**
 * Gets the resource for a hex cell from the precomputed resources
 */
export function getHexCellResource(
  hexCoordinates: HexCoordinates,
  precomputedResources: Record<string, HexCellResource | null>
): HexCellResource | null {
  const coordString = coordinatesToString(hexCoordinates);
  return precomputedResources[coordString] || null;
}

/**
 * Checks if a player has an active survey
 */
export function hasActiveSurvey(
  surveyResultByHexCell: Record<string, SurveyResult>,
  currentTick: number
): boolean {
  return Object.values(surveyResultByHexCell).some(
    (survey) => !isSurveyComplete(survey.surveyStartTick, currentTick)
  );
}

/**
 * Updates surveys based on the current tick
 * @param surveyResultByHexCell The survey results to update
 * @param currentTick The current game tick
 * @param precomputedResources The precomputed resources for all hex cells
 * @returns Updated survey results
 */
export function updateSurveys(
  surveyResultByHexCell: Record<string, SurveyResult>,
  currentTick: number,
  precomputedResources: Record<string, HexCellResource | null>
): Record<string, SurveyResult> {
  const updatedSurveys = { ...surveyResultByHexCell };

  // Process all surveys
  Object.entries(updatedSurveys).forEach(([coordString, survey]) => {
    // Check if survey is complete
    if (
      isSurveyComplete(survey.surveyStartTick, currentTick) &&
      !survey.isComplete
    ) {
      // Survey is complete, get the resource from precomputed resources
      const resource = precomputedResources[coordString];

      updatedSurveys[coordString] = {
        ...survey,
        isComplete: true,
        resource: resource || undefined,
      };
    }
  });

  return updatedSurveys;
}

/**
 * Starts a new survey if the player doesn't already have an active survey
 * @param surveyResultByHexCell The player's current survey results
 * @param coordinates The coordinates to survey
 * @param currentTick The current game tick
 * @returns Updated survey results, or null if a new survey couldn't be started
 */
export function startSurvey(
  surveyResultByHexCell: Record<string, SurveyResult>,
  coordinates: HexCoordinates,
  currentTick: number
): Record<string, SurveyResult> {
  // Check if player already has a survey in progress
  if (hasActiveSurvey(surveyResultByHexCell, currentTick)) {
    // Player already has an active survey, don't start a new one
    return surveyResultByHexCell;
  }

  // Add the new survey
  const coordString = coordinatesToString(coordinates);
  return {
    ...surveyResultByHexCell,
    [coordString]: {
      surveyStartTick: currentTick,
      // Resource will be determined when survey completes
    },
  };
}
