import {
  SurveySystem,
  SURVEY_DURATION_TICKS,
  SERVER_ONLY_ID,
  SurveyResult,
  HexCellResource,
  ResourceConfig,
  RESOURCE_CONFIG,
} from "../SurveySystem";
import { CommodityType } from "@/lib/market/CommodityMarket";
import { TerrainType } from "@/lib/HexCell";
import { HexGrid, createHexGrid } from "@/lib/HexGrid";
import { createHexCell } from "@/lib/HexCell";
import { coordinatesToString } from "@/lib/coordinates/HexCoordinates";
import { World } from "miniplex";
import { Entity } from "@/ecs/entity";
import { createWorldWithEntities } from "@/ecs/factories";

// Create a simple hex grid for testing
const createTestGrid = (): HexGrid => {
  const grid = createHexGrid(3, 3);

  // Add cells with different terrain types
  const cells = [
    createHexCell(0, 0, null),
    createHexCell(0, 1, null),
    createHexCell(1, 0, null),
    createHexCell(1, 1, null),
    createHexCell(2, 0, null),
  ];

  // Assign terrain types
  cells[0].terrainType = TerrainType.Mountains;
  cells[1].terrainType = TerrainType.Forest;
  cells[2].terrainType = TerrainType.Plains;
  cells[3].terrainType = TerrainType.Desert;
  cells[4].terrainType = TerrainType.Water;

  cells.forEach((cell) => {
    grid.cellsByHexCoordinates[coordinatesToString(cell.coordinates)] = cell;
  });

  return grid;
};

describe("SurveySystem", () => {
  let surveySystem: SurveySystem;
  let world: World<Entity>;
  
  beforeEach(() => {
    surveySystem = new SurveySystem();
    world = createWorldWithEntities({});
  });
  
  describe("isSurveyComplete", () => {
    test("should return false for surveys that have not reached the duration", () => {
      const startTick = 10;
      const currentTick = startTick + SURVEY_DURATION_TICKS - 1;
      expect(surveySystem.isSurveyComplete(startTick, currentTick)).toBe(false);
    });

    test("should return true for surveys that have reached the duration", () => {
      const startTick = 10;
      const currentTick = startTick + SURVEY_DURATION_TICKS;
      expect(surveySystem.isSurveyComplete(startTick, currentTick)).toBe(true);
    });

    test("should return true for surveys that have exceeded the duration", () => {
      const startTick = 10;
      const currentTick = startTick + SURVEY_DURATION_TICKS + 5;
      expect(surveySystem.isSurveyComplete(startTick, currentTick)).toBe(true);
    });
  });

  describe("hasActiveSurvey", () => {
    test("should return false when no surveys exist", () => {
      const surveys: Record<string, SurveyResult> = {};
      expect(surveySystem.hasActiveSurvey(surveys, 10)).toBe(false);
    });

    test("should return false when all surveys are complete", () => {
      const surveys: Record<string, SurveyResult> = {
        "x:0,z:0": {
          surveyStartTick: 0,
          isComplete: true,
          success: true,
        },
        "x:1,z:1": {
          surveyStartTick: 5,
          isComplete: true,
          success: true,
        },
      };
      expect(surveySystem.hasActiveSurvey(surveys, 20)).toBe(false);
    });

    test("should return true when an active survey exists", () => {
      const currentTick = 15;
      const surveys: Record<string, SurveyResult> = {
        "x:0,z:0": {
          surveyStartTick: 0,
          isComplete: true,
          success: true,
        },
        "x:1,z:1": {
          surveyStartTick: currentTick - 2, // Recent survey
          isComplete: false,
          success: true,
        },
      };
      expect(surveySystem.hasActiveSurvey(surveys, currentTick)).toBe(true);
    });
  });

  describe("startSurvey", () => {
    test("should add a new survey when no active surveys exist", () => {
      const surveys: Record<string, SurveyResult> = {};
      const coordinates = { x: 1, z: 2 };
      const currentTick = 10;

      const result = surveySystem.startSurvey(surveys, coordinates, currentTick);

      expect(result).not.toBeNull();
      const coordString = coordinatesToString(coordinates);
      expect(result[coordString]).toBeDefined();
      expect(result[coordString].surveyStartTick).toBe(currentTick);
      expect(result[coordString].isComplete).toBeUndefined();
    });

    test("should not make any changes when an active survey exists", () => {
      const currentTick = 15;
      const surveys: Record<string, SurveyResult> = {
        "x:0,z:0": {
          surveyStartTick: currentTick - 2, // Recent survey
          isComplete: false,
          success: true,
        },
      };

      const result = surveySystem.startSurvey(surveys, { x: 1, z: 2 }, currentTick);
      expect(result).toEqual(surveys);
    });
  });

  describe("updateSurveys", () => {
    test("should mark surveys as complete when they reach the duration", () => {
      const precomputedResources: Record<string, HexCellResource | undefined> = {
        "x:1,z:1": {
          resourceType: CommodityType.COAL,
          resourceAmount: 50,
        },
      };

      const surveys: Record<string, SurveyResult> = {
        "x:1,z:1": {
          surveyStartTick: 5,
          isComplete: false,
          success: true,
        },
      };

      const currentTick = 5 + SURVEY_DURATION_TICKS;
      const result = surveySystem.updateSurveys(surveys, currentTick, precomputedResources);

      expect(result["x:1,z:1"].isComplete).toBe(true);
      expect(result["x:1,z:1"].resource).toEqual(
        precomputedResources["x:1,z:1"]
      );
    });

    test("should not modify surveys that are not complete", () => {
      const precomputedResources: Record<string, HexCellResource | undefined> = {};

      const surveys: Record<string, SurveyResult> = {
        "x:1,z:1": {
          surveyStartTick: 5,
          isComplete: false,
          success: true,
        },
      };

      const currentTick = 5 + SURVEY_DURATION_TICKS - 1; // Not quite complete
      const result = surveySystem.updateSurveys(surveys, currentTick, precomputedResources);

      expect(result["x:1,z:1"].isComplete).toBe(false);
      expect(result["x:1,z:1"].resource).toBeUndefined();
    });

    test("should not modify surveys that are already complete", () => {
      const precomputedResources: Record<string, HexCellResource | undefined> = {
        "x:1,z:1": {
          resourceType: CommodityType.COAL,
          resourceAmount: 50,
        },
      };

      const resource: HexCellResource = {
        resourceType: CommodityType.OIL,
        resourceAmount: 30,
      };

      const surveys: Record<string, SurveyResult> = {
        "x:1,z:1": {
          surveyStartTick: 5,
          isComplete: true,
          resource,
          success: true,
        },
      };

      const currentTick = 20;
      const result = surveySystem.updateSurveys(surveys, currentTick, precomputedResources);

      expect(result["x:1,z:1"].isComplete).toBe(true);
      expect(result["x:1,z:1"].resource).toEqual(resource); // Should not change
    });
  });

  describe("initialize", () => {
    test("should precompute resources if they don't exist", () => {
      const hexGrid = createTestGrid();
      const context: any = {
        currentTick: 10,
        gameTime: 1000, // Add gameTime
        hexGrid,
        randomSeed: 12345,
        surveyResultsByPlayerId: {},
      };
      
      // Spy on precomputeHexCellResources
      const precomputeSpy = jest.spyOn(surveySystem, 'precomputeHexCellResources');
      
      surveySystem.initialize(world, context);
      
      expect(precomputeSpy).toHaveBeenCalledWith(hexGrid, 12345);
      expect(context.precomputedResources).toBeDefined();
      
      precomputeSpy.mockRestore();
    });
    
    test("should not precompute resources if they already exist", () => {
      const hexGrid = createTestGrid();
      const existingResources = { "x:0,z:0": undefined };
      const context = {
        currentTick: 10,
        gameTime: 1000, // Add gameTime
        hexGrid,
        randomSeed: 12345,
        surveyResultsByPlayerId: {},
        precomputedResources: existingResources
      };
      
      // Spy on precomputeHexCellResources
      const precomputeSpy = jest.spyOn(surveySystem, 'precomputeHexCellResources');
      
      surveySystem.initialize(world, context);
      
      expect(precomputeSpy).not.toHaveBeenCalled();
      expect(context.precomputedResources).toBe(existingResources);
      
      precomputeSpy.mockRestore();
    });
  });
  
  describe("update", () => {
    test("should update surveys for all players", () => {
      const precomputedResources: Record<string, HexCellResource | undefined> = {
        "x:1,z:1": {
          resourceType: CommodityType.COAL,
          resourceAmount: 50,
        },
      };
      
      const player1Surveys: Record<string, SurveyResult> = {
        "x:1,z:1": {
          surveyStartTick: 5,
          isComplete: false,
          success: true,
        },
      };
      
      const player2Surveys: Record<string, SurveyResult> = {
        "x:0,z:0": {
          surveyStartTick: 7,
          isComplete: false,
          success: true,
        },
      };
      
      const context = {
        currentTick: 5 + SURVEY_DURATION_TICKS, // Enough ticks to complete player1's survey
        gameTime: 1000, // Add gameTime
        hexGrid: createTestGrid(),
        randomSeed: 12345,
        surveyResultsByPlayerId: {
          player1: player1Surveys,
          player2: player2Surveys
        },
        precomputedResources
      };
      
      // Spy on updateSurveys
      const updateSpy = jest.spyOn(surveySystem, 'updateSurveys');
      
      const result = surveySystem.update(world, context);
      
      expect(updateSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).toHaveBeenCalledWith(player1Surveys, context.currentTick, precomputedResources);
      expect(updateSpy).toHaveBeenCalledWith(player2Surveys, context.currentTick, precomputedResources);
      
      // Check that player1's survey was completed
      expect(result.player1["x:1,z:1"].isComplete).toBe(true);
      // Player2's survey should still be incomplete
      expect(result.player2["x:0,z:0"].isComplete).toBe(false);
      
      updateSpy.mockRestore();
    });
  });

  describe("precomputeHexCellResources", () => {
    test("should generate resources based on terrain configuration", () => {
      const grid = createTestGrid();
      const seed = 12345; // Fixed seed for deterministic results

      const resources = surveySystem.precomputeHexCellResources(grid, seed);

      // Check that resources were generated
      expect(Object.keys(resources).length).toBeGreaterThan(0);

      // Check that at least some cells have resources
      const resourceCells = Object.values(resources).filter((r) => r !== undefined);
      expect(resourceCells.length).toBeGreaterThan(0);

      // Check that resources match the expected types for their terrain
      Object.entries(resources).forEach(([coordString, resource]) => {
        if (resource) {
          const cell = grid.cellsByHexCoordinates[coordString];
          const config = RESOURCE_CONFIG[cell.terrainType];

          // The resource type should be one of the configured types for this terrain
          expect(config.resources[resource.resourceType]).toBeDefined();

          // The resource amount should be within the configured range
          const range = config.resources[resource.resourceType]!.amount;
          expect(resource.resourceAmount).toBeGreaterThanOrEqual(range.min);
          expect(resource.resourceAmount).toBeLessThanOrEqual(range.max);
        }
      });
    });

    test("should produce deterministic results with the same seed", () => {
      const grid = createTestGrid();
      const seed = 54321;

      const resources1 = surveySystem.precomputeHexCellResources(grid, seed);
      const resources2 = surveySystem.precomputeHexCellResources(grid, seed);

      // Both runs should produce the same results
      expect(resources1).toEqual(resources2);
    });
  });
});
