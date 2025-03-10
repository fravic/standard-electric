import { World } from "miniplex";
import { Draft } from "immer";
import { Entity } from "../../entity";
import { 
  SurveySystem, 
  SurveyContext, 
  SurveySystemResult, 
  HexCellResource, 
  SURVEY_DURATION_TICKS,
  SERVER_ONLY_ID
} from "../SurveySystem";
import { GameContext } from "@/actor/game.types";
import { CommodityType } from "@/lib/market/CommodityMarket";
import { HexCoordinates, coordinatesToString } from "@/lib/coordinates/HexCoordinates";
import { HexGrid } from "@/lib/HexGrid";
import { HexCell, TerrainType, Population } from "@/lib/HexCell";

describe("SurveySystem", () => {
  let world: World<Entity>;
  let surveySystem: SurveySystem;
  let hexGrid: HexGrid;
  let testPlayerId: string;
  let testContext: SurveyContext;

  // Helper function to create a survey entity
  const createSurveyEntity = (
    id: string,
    coordinates: HexCoordinates,
    startTick: number,
    isComplete: boolean = false,
    resource?: HexCellResource
  ): Entity => ({
    id,
    name: `Survey at ${coordinates.x},${coordinates.z}`,
    hexPosition: {
      coordinates
    },
    surveyResult: {
      surveyStartTick: startTick,
      isComplete,
      resource
    },
    owner: {
      playerId: testPlayerId
    }
  });
  
  // Helper function to create a hex cell
  const createHexCell = (coordinates: HexCoordinates, terrainType: TerrainType): HexCell => ({
    coordinates,
    terrainType,
    regionName: null,
    population: Population.Unpopulated
  });

  beforeEach(() => {
    // Reset world and system for each test
    world = new World<Entity>();
    surveySystem = new SurveySystem();
    testPlayerId = "player1";

    // Create a basic hex grid for testing
    hexGrid = {
      width: 5,
      height: 5,
      cellsByHexCoordinates: {}
    };

    // Add some test cells with different terrain types
    const mountainCoord = { x: 0, z: 0 };
    const forestCoord = { x: 1, z: 0 };
    const plainsCoord = { x: 0, z: 1 };
    hexGrid.cellsByHexCoordinates[coordinatesToString(mountainCoord)] = createHexCell(mountainCoord, TerrainType.Mountains);
    hexGrid.cellsByHexCoordinates[coordinatesToString(forestCoord)] = createHexCell(forestCoord, TerrainType.Forest);
    hexGrid.cellsByHexCoordinates[coordinatesToString(plainsCoord)] = createHexCell(plainsCoord, TerrainType.Plains);

    // Create basic context
    testContext = {
      currentTick: 10,
      hexGrid,
      randomSeed: 42,
      playerId: testPlayerId
    };

    // Initialize the system
    surveySystem.initialize(world, testContext);
  });

  describe("initialize", () => {
    it("should initialize the system with the world and context", () => {
      expect(surveySystem["world"]).toBe(world);
      expect(surveySystem["context"]).toBe(testContext);
    });
  });

  describe("update", () => {
    it("should mark surveys as complete when enough ticks have passed", () => {
      // Add incomplete surveys at different stages
      const completedSurveyCoord = { x: 0, z: 0 };
      const inProgressSurveyCoord = { x: 1, z: 0 };
      
      // Survey that should be completed (started 5 ticks ago, duration is 4)
      world.add(createSurveyEntity("survey1", completedSurveyCoord, testContext.currentTick - 5));
      
      // Survey that should remain incomplete (started 3 ticks ago)
      world.add(createSurveyEntity("survey2", inProgressSurveyCoord, testContext.currentTick - 3));
      
      const result = surveySystem.update(world, testContext);
      
      expect(result.surveyIdsToComplete).toContain("survey1");
      expect(result.surveyIdsToComplete).not.toContain("survey2");
      expect(result.success).toBe(true);
    });

    it("should return empty array when no surveys are complete", () => {
      // Add only incomplete surveys
      const inProgressSurveyCoord = { x: 1, z: 0 };
      world.add(createSurveyEntity("survey1", inProgressSurveyCoord, testContext.currentTick - 2));
      
      const result = surveySystem.update(world, testContext);
      
      expect(result.surveyIdsToComplete).toEqual([]);
      expect(result.success).toBe(true);
    });
  });

  describe("isSurveyComplete", () => {
    it("should return true when survey duration has passed", () => {
      const startTick = 5;
      const currentTick = startTick + SURVEY_DURATION_TICKS;
      
      const result = SurveySystem.isSurveyComplete(startTick, currentTick);
      
      expect(result).toBe(true);
    });

    it("should return false when survey duration has not passed", () => {
      const startTick = 5;
      const currentTick = startTick + SURVEY_DURATION_TICKS - 1;
      
      const result = SurveySystem.isSurveyComplete(startTick, currentTick);
      
      expect(result).toBe(false);
    });
  });

  describe("hasActiveSurvey", () => {
    it("should return true when an incomplete survey exists", () => {
      const surveyCoord = { x: 0, z: 0 };
      world.add(createSurveyEntity("survey1", surveyCoord, testContext.currentTick - 2));
      
      const result = SurveySystem.hasActiveSurvey(world);
      
      expect(result).toBe(true);
    });

    it("should return false when no incomplete surveys exist", () => {
      const surveyCoord = { x: 0, z: 0 };
      world.add(createSurveyEntity("survey1", surveyCoord, testContext.currentTick - 5, true));
      
      const result = SurveySystem.hasActiveSurvey(world);
      
      expect(result).toBe(false);
    });

    it("should return false when no surveys exist", () => {
      const result = SurveySystem.hasActiveSurvey(world);
      
      expect(result).toBe(false);
    });
  });

  describe("startSurvey", () => {
    it("should create a new survey at the specified coordinates", () => {
      const surveyCoord = { x: 0, z: 0 };
      
      const result = surveySystem.startSurvey(surveyCoord, testContext.currentTick);
      
      expect(result.success).toBe(true);
      expect(result.surveyToCreate).toBeDefined();
      expect(result.surveyToCreate?.hexPosition?.coordinates).toEqual(surveyCoord);
      expect(result.surveyToCreate?.surveyResult?.surveyStartTick).toBe(testContext.currentTick);
      expect(result.surveyToCreate?.surveyResult?.isComplete).toBe(false);
      expect(result.surveyToCreate?.owner?.playerId).toBe(testPlayerId);
    });

    it("should fail to create a survey if an incomplete survey already exists", () => {
      const surveyCoord1 = { x: 0, z: 0 };
      const surveyCoord2 = { x: 1, z: 0 };
      
      // Add an incomplete survey
      world.add(createSurveyEntity("survey1", surveyCoord1, testContext.currentTick - 2));
      
      const result = surveySystem.startSurvey(surveyCoord2, testContext.currentTick);
      
      expect(result.success).toBe(false);
      expect(result.surveyToCreate).toBeUndefined();
    });
  });

  describe("precomputeHexCellResources", () => {
    it("should generate resources based on terrain types and random seed", () => {
      const result = surveySystem.precomputeHexCellResources();
      
      expect(result.success).toBe(true);
      expect(result.hexCellResources).toBeDefined();
      expect(typeof result.hexCellResources).toBe("object");
    });

    it("should generate consistent resources with the same seed", () => {
      const result1 = surveySystem.precomputeHexCellResources();
      
      // Reset and reinitialize with the same seed
      world = new World<Entity>();
      surveySystem = new SurveySystem();
      surveySystem.initialize(world, testContext);
      
      const result2 = surveySystem.precomputeHexCellResources();
      
      expect(result1.hexCellResources).toEqual(result2.hexCellResources);
    });

    it("should generate different resources with different seeds", () => {
      const result1 = surveySystem.precomputeHexCellResources();
      
      // Reset and reinitialize with a different seed
      world = new World<Entity>();
      surveySystem = new SurveySystem();
      surveySystem.initialize(world, {
        ...testContext,
        randomSeed: 43 // Different seed
      });
      
      const result2 = surveySystem.precomputeHexCellResources();
      
      // This test could occasionally fail if by chance the random resources are identical
      // But with sufficiently complex terrain, it's very unlikely
      expect(result1.hexCellResources).not.toEqual(result2.hexCellResources);
    });
  });

  describe("getHexCellResource", () => {
    it("should return the resource at specified coordinates", () => {
      const coordinates = { x: 0, z: 0 };
      const testResource: HexCellResource = {
        resourceType: CommodityType.COAL,
        resourceAmount: 100
      };
      
      const precomputedResources: Record<string, HexCellResource | undefined> = {
        [coordinatesToString(coordinates)]: testResource
      };
      
      const result = surveySystem.getHexCellResource(coordinates, precomputedResources);
      
      expect(result).toEqual(testResource);
    });

    it("should return undefined when no resource exists at coordinates", () => {
      const coordinates = { x: 0, z: 0 };
      const precomputedResources: Record<string, HexCellResource | undefined> = {};
      
      const result = surveySystem.getHexCellResource(coordinates, precomputedResources);
      
      expect(result).toBeUndefined();
    });
  });

  describe("mutate", () => {
    it("should mark surveys as complete with their resources", () => {
      // Create a minimal game context with a private section for the player
      const gameContext: GameContext = {
        public: {
          id: "test-game",
          time: {
            totalTicks: 0,
            isPaused: false
          },
          players: {},
          hexGrid,
          commodityMarket: { 
            commodities: {
              [CommodityType.COAL]: {
                currentExchangeRate: 10,
                config: {
                  baseExchangeRate: 10,
                  unitSize: 10,
                  tradingFee: 0.3,
                  priceIncrement: 0.2,
                  minExchangeRate: 5,
                  maxExchangeRate: 30
                }
              },
              [CommodityType.OIL]: {
                currentExchangeRate: 20,
                config: {
                  baseExchangeRate: 20,
                  unitSize: 5,
                  tradingFee: 0.3,
                  priceIncrement: 0.3,
                  minExchangeRate: 10,
                  maxExchangeRate: 50
                }
              },
              [CommodityType.GAS]: {
                currentExchangeRate: 15,
                config: {
                  baseExchangeRate: 15,
                  unitSize: 8,
                  tradingFee: 0.3,
                  priceIncrement: 0.25,
                  minExchangeRate: 8,
                  maxExchangeRate: 40
                }
              },
              [CommodityType.URANIUM]: {
                currentExchangeRate: 50,
                config: {
                  baseExchangeRate: 50,
                  unitSize: 2,
                  tradingFee: 0.4,
                  priceIncrement: 0.5,
                  minExchangeRate: 30,
                  maxExchangeRate: 100
                }
              }
            }
          },
          entitiesById: {},
          auction: null,
          randomSeed: 42
        },
        private: {
          [testPlayerId]: {
            entitiesById: {},
            hexCellResources: {}
          }
        }
      };
      
      // Add a survey entity to the player's private context
      const surveyCoord = { x: 0, z: 0 };
      const testSurvey = createSurveyEntity("survey1", surveyCoord, 5);
      gameContext.private[testPlayerId].entitiesById[testSurvey.id] = testSurvey;
      
      // Create test resources
      const testResource: HexCellResource = {
        resourceType: CommodityType.COAL,
        resourceAmount: 100
      };
      
      // Add the resource to the context
      testContext.precomputedResources = {
        [coordinatesToString(surveyCoord)]: testResource
      } as Record<string, HexCellResource>;
      
      // Create result for mutation
      const result: SurveySystemResult = {
        surveyIdsToComplete: [testSurvey.id],
        success: true
      };
      
      // Execute the mutation
      surveySystem.mutate(result, gameContext as Draft<GameContext>);
      
      // Check that the survey was updated correctly
      const updatedSurvey = gameContext.private[testPlayerId].entitiesById[testSurvey.id];
      expect(updatedSurvey.surveyResult!.isComplete).toBe(true);
      expect(updatedSurvey.surveyResult!.resource).toEqual(testResource);
    });

    it("should add a new survey when surveyToCreate is provided", () => {
      // Create a minimal game context with a private section for the player
      const gameContext: GameContext = {
        public: {
          id: "test-game",
          time: {
            totalTicks: 0,
            isPaused: false
          },
          players: {},
          hexGrid,
          commodityMarket: { 
            commodities: {
              [CommodityType.COAL]: {
                currentExchangeRate: 10,
                config: {
                  baseExchangeRate: 10,
                  unitSize: 10,
                  tradingFee: 0.3,
                  priceIncrement: 0.2,
                  minExchangeRate: 5,
                  maxExchangeRate: 30
                }
              },
              [CommodityType.OIL]: {
                currentExchangeRate: 20,
                config: {
                  baseExchangeRate: 20,
                  unitSize: 5,
                  tradingFee: 0.3,
                  priceIncrement: 0.3,
                  minExchangeRate: 10,
                  maxExchangeRate: 50
                }
              },
              [CommodityType.GAS]: {
                currentExchangeRate: 15,
                config: {
                  baseExchangeRate: 15,
                  unitSize: 8,
                  tradingFee: 0.3,
                  priceIncrement: 0.25,
                  minExchangeRate: 8,
                  maxExchangeRate: 40
                }
              },
              [CommodityType.URANIUM]: {
                currentExchangeRate: 50,
                config: {
                  baseExchangeRate: 50,
                  unitSize: 2,
                  tradingFee: 0.4,
                  priceIncrement: 0.5,
                  minExchangeRate: 30,
                  maxExchangeRate: 100
                }
              }
            }
          },
          entitiesById: {},
          auction: null,
          randomSeed: 42
        },
        private: {
          [testPlayerId]: {
            entitiesById: {},
            hexCellResources: {}
          }
        }
      };
      
      // Create a new survey entity
      const surveyCoord = { x: 0, z: 0 };
      const newSurvey = createSurveyEntity("newSurvey", surveyCoord, 10);
      
      // Create result with surveyToCreate
      const result: SurveySystemResult = {
        surveyToCreate: newSurvey,
        success: true
      };
      
      // Execute the mutation
      surveySystem.mutate(result, gameContext as Draft<GameContext>);
      
      // Check that the survey was added correctly
      expect(gameContext.private[testPlayerId].entitiesById[newSurvey.id]).toEqual(newSurvey);
    });

    it("should add hexCellResources to SERVER_ONLY_ID private context when provided", () => {
      // Create a minimal game context with no server private section
      const gameContext: GameContext = {
        public: {
          id: "test-game",
          time: {
            totalTicks: 0,
            isPaused: false
          },
          players: {},
          hexGrid,
          commodityMarket: { 
            commodities: {
              [CommodityType.COAL]: {
                currentExchangeRate: 10,
                config: {
                  baseExchangeRate: 10,
                  unitSize: 10,
                  tradingFee: 0.3,
                  priceIncrement: 0.2,
                  minExchangeRate: 5,
                  maxExchangeRate: 30
                }
              },
              [CommodityType.OIL]: {
                currentExchangeRate: 20,
                config: {
                  baseExchangeRate: 20,
                  unitSize: 5,
                  tradingFee: 0.3,
                  priceIncrement: 0.3,
                  minExchangeRate: 10,
                  maxExchangeRate: 50
                }
              },
              [CommodityType.GAS]: {
                currentExchangeRate: 15,
                config: {
                  baseExchangeRate: 15,
                  unitSize: 8,
                  tradingFee: 0.3,
                  priceIncrement: 0.25,
                  minExchangeRate: 8,
                  maxExchangeRate: 40
                }
              },
              [CommodityType.URANIUM]: {
                currentExchangeRate: 50,
                config: {
                  baseExchangeRate: 50,
                  unitSize: 2,
                  tradingFee: 0.4,
                  priceIncrement: 0.5,
                  minExchangeRate: 30,
                  maxExchangeRate: 100
                }
              }
            }
          },
          entitiesById: {},
          auction: null,
          randomSeed: 42
        },
        private: {
          [testPlayerId]: {
            entitiesById: {},
            hexCellResources: {}
          }
        }
      };
      
      // Create test resources
      const testResources: Record<string, HexCellResource> = {
        "0,0": { resourceType: CommodityType.COAL, resourceAmount: 100 },
        "1,0": { resourceType: CommodityType.OIL, resourceAmount: 50 }
      };
      
      // Create result with hexCellResources
      const result: SurveySystemResult = {
        hexCellResources: testResources,
        success: true
      };
      
      // Execute the mutation
      surveySystem.mutate(result, gameContext as Draft<GameContext>);
      
      // Check that the resources were added to the SERVER_ONLY_ID context
      expect(gameContext.private[SERVER_ONLY_ID]).toBeDefined();
      expect(gameContext.private[SERVER_ONLY_ID].hexCellResources).toEqual(testResources);
    });
  });
});
