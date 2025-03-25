import { World } from "miniplex";
import { produce } from "immer";

import { Entity } from "../../entity";
import { CommoditySystem, CommodityContext, CommoditySystemResult } from "../CommoditySystem";
import { GameContext } from "@/actor/game.types";
import { CommodityMarketState, initializeCommodityMarket } from "../CommoditySystem";
import { CommodityType } from "@/lib/types";
import { createPowerPlant } from "@/ecs/factories";
import { createDefaultContext } from "@/actor/createDefaultContext";

describe("CommoditySystem", () => {
  let world: World<Entity>;
  let commoditySystem: CommoditySystem;
  let testPlayerId: string;
  let market: CommodityMarketState;
  let powerPlantId: string;

  beforeEach(() => {
    // Reset world and system for each test
    world = new World<Entity>();
    commoditySystem = new CommoditySystem();
    testPlayerId = "test-player";
    market = initializeCommodityMarket();
    powerPlantId = "power-plant-1";

    // Add a power plant to the world
    const powerPlant = createPowerPlant({
      id: powerPlantId,
      name: "Test Power Plant",
      hexCoordinates: { x: 0, z: 0 },
      playerId: testPlayerId,
      powerGenerationKW: 10,
      pricePerKWh: 0.05,
      fuelType: CommodityType.COAL,
      fuelConsumptionPerKWh: 0.1,
      maxFuelStorage: 100,
      currentFuelStorage: 0,
    });
    world.add(powerPlant);

    // Initialize the system with the world and a context
    const context: CommodityContext = {
      playerId: testPlayerId,
      market: market,
    };
    commoditySystem.initialize(world, context);
  });

  describe("buyCommodity", () => {
    it("should buy fuel for a power plant successfully", () => {
      // Arrange
      const playerMoney = 1000;
      const units = 5;

      // Reinitialize with the updated world
      const context: CommodityContext = {
        playerId: testPlayerId,
        market: market,
      };
      commoditySystem.initialize(world, context);

      // Act
      const result = commoditySystem.buyCommodity(
        market,
        powerPlantId,
        CommodityType.COAL,
        units,
        playerMoney
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.updatedMarket).toBeDefined();
      expect(result.fuelDelta).toBeGreaterThan(0);
      expect(result.moneyDelta).toBeLessThan(0); // Money spent should be negative

      // Ensure the updated market's price is higher than the original
      expect(
        result.updatedMarket?.commodities[CommodityType.COAL].currentExchangeRate
      ).toBeGreaterThan(market.commodities[CommodityType.COAL].currentExchangeRate);
    });

    it("should fail when player doesn't have enough money", () => {
      // Arrange
      const playerMoney = 0; // Not enough money
      const units = 5;
      const fuelType = CommodityType.COAL;

      // Act
      const result = commoditySystem.buyCommodity(
        market,
        powerPlantId,
        fuelType,
        units,
        playerMoney
      );

      // Assert
      expect(result.success).toBe(false);
    });

    it("should fail when power plant doesn't exist", () => {
      // Arrange
      const playerMoney = 1000;
      const units = 5;
      const fuelType = CommodityType.COAL;
      const nonExistentId = "non-existent-power-plant";

      // Act
      const result = commoditySystem.buyCommodity(
        market,
        nonExistentId,
        fuelType,
        units,
        playerMoney
      );

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("sellCommodity", () => {
    it("should sell fuel from a power plant successfully", () => {
      // Arrange
      const initialFuelStorage = 50;
      world.clear(); // Remove the default power palnt
      const powerPlant = createPowerPlant({
        id: powerPlantId,
        name: "Test Power Plant",
        hexCoordinates: { x: 0, z: 0 },
        playerId: testPlayerId,
        powerGenerationKW: 10,
        pricePerKWh: 0.05,
        fuelType: CommodityType.COAL,
        fuelConsumptionPerKWh: 0.1,
        maxFuelStorage: 100,
        currentFuelStorage: initialFuelStorage,
      });
      world.add(powerPlant);
      const units = 5;
      const fuelType = CommodityType.COAL;

      // Act
      const result = commoditySystem.sellCommodity(market, powerPlantId, fuelType, units);

      // Assert
      expect(result.success).toBe(true);
      expect(result.updatedMarket).toBeDefined();
      expect(result.fuelDelta).toBeLessThan(0); // Fuel removed should be negative
      expect(result.moneyDelta).toBeGreaterThan(0); // Money gained should be positive

      // Ensure the updated market's price is lower than the original
      expect(result.updatedMarket?.commodities[fuelType].currentExchangeRate).toBeLessThan(
        market.commodities[fuelType].currentExchangeRate
      );
    });

    it("should fail when power plant doesn't have enough fuel", () => {
      // Arrange
      const initialFuelStorage = 0; // No fuel
      world.clear(); // Remove the default power plant
      const powerPlant = createPowerPlant({
        id: powerPlantId,
        name: "Test Power Plant",
        hexCoordinates: { x: 0, z: 0 },
        playerId: testPlayerId,
        powerGenerationKW: 10,
        pricePerKWh: 0.05,
        fuelType: CommodityType.COAL,
        fuelConsumptionPerKWh: 0.1,
        maxFuelStorage: 100,
        currentFuelStorage: initialFuelStorage,
      });
      world.add(powerPlant);
      const units = 5;
      const fuelType = CommodityType.COAL;

      // Act
      const result = commoditySystem.sellCommodity(market, powerPlantId, fuelType, units);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("mutate", () => {
    it("should update player money and power plant fuel when buying", () => {
      // Arrange
      const units = 5;
      const fuelType = CommodityType.COAL;
      const initialMoney = 1000;
      const initialFuel = 0;

      // Replace the power plant with one with known values
      world.clear(); // Remove the default power plant
      const powerPlant = createPowerPlant({
        id: powerPlantId,
        name: "Test Power Plant",
        hexCoordinates: { x: 0, z: 0 },
        playerId: testPlayerId,
        powerGenerationKW: 10,
        pricePerKWh: 0.05,
        fuelType: CommodityType.COAL,
        fuelConsumptionPerKWh: 0.1,
        maxFuelStorage: 100,
        currentFuelStorage: initialFuel,
      });
      world.add(powerPlant);

      // Create game context draft
      const gameContext: GameContext = {
        public: {
          id: "test-game",
          time: { totalTicks: 10, isPaused: false },
          players: {
            [testPlayerId]: {
              name: "Test Player",
              number: 1,
              money: initialMoney,
              powerSoldKWh: 0,
              isHost: true,
              color: "#46C9CD", // Teal - first player color
            },
          },
          commodityMarket: market,
          entitiesById: {
            [powerPlantId]: powerPlant,
          },
          hexGrid: {
            width: 10,
            height: 10,
            cellsByHexCoordinates: {},
          },
          auction: null,
          randomSeed: 12345,
        },
        private: {},
      };

      // Initialize the context for this test
      const context: CommodityContext = {
        playerId: testPlayerId,
        market: market,
      };
      commoditySystem.initialize(world, context);

      // Prepare buy result
      const buyResult = commoditySystem.buyCommodity(
        market,
        powerPlantId,
        fuelType,
        units,
        initialMoney
      );

      // Force the result to be successful for testing mutations
      const successfulBuyResult: CommoditySystemResult = {
        success: true,
        updatedMarket: market,
        powerPlantId: powerPlantId,
        fuelDelta: 50, // Add 50 fuel units
        moneyDelta: -200, // Spend 200 money
      };

      // Act - Apply mutations
      const contextDraft = produce(gameContext, (draft) => {
        commoditySystem.mutate(successfulBuyResult, draft);
      });

      // Assert
      const updatedPlayer = contextDraft.public.players[testPlayerId];
      const updatedPowerPlant = contextDraft.public.entitiesById[powerPlantId];

      // Verify player money decreased
      expect(updatedPlayer.money).toBeLessThan(initialMoney);

      // Verify power plant fuel increased
      expect(updatedPowerPlant.fuelStorage!.currentFuelStorage).toBeGreaterThan(initialFuel);

      // Verify market was updated
      expect(contextDraft.public.commodityMarket).toEqual(market);
    });

    it("should update player money and power plant fuel when selling", () => {
      // Arrange
      const initialFuel = 50;
      const units = 5;
      const fuelType = CommodityType.COAL;
      const initialMoney = 1000;

      // Replace the power plant with one with known values
      world.clear(); // Remove the default power plant
      const powerPlant = createPowerPlant({
        id: powerPlantId,
        name: "Test Power Plant",
        hexCoordinates: { x: 0, z: 0 },
        playerId: testPlayerId,
        powerGenerationKW: 10,
        pricePerKWh: 0.05,
        fuelType: CommodityType.COAL,
        fuelConsumptionPerKWh: 0.1,
        maxFuelStorage: 100,
        currentFuelStorage: initialFuel,
      });
      world.add(powerPlant);

      // Create game context draft
      const gameContext: GameContext = {
        public: {
          id: "test-game",
          time: { totalTicks: 10, isPaused: false },
          players: {
            [testPlayerId]: {
              name: "Test Player",
              number: 1,
              money: initialMoney,
              powerSoldKWh: 0,
              isHost: true,
              color: "#46C9CD", // Teal - first player color
            },
          },
          commodityMarket: market,
          entitiesById: {
            [powerPlantId]: powerPlant,
          },
          hexGrid: {
            width: 10,
            height: 10,
            cellsByHexCoordinates: {},
          },
          auction: null,
          randomSeed: 12345,
        },
        private: {},
      };

      // Initialize the context for this test
      const context: CommodityContext = {
        playerId: testPlayerId,
        market: market,
      };
      commoditySystem.initialize(world, context);

      // Force the result to be successful for testing mutations
      const successfulSellResult: CommoditySystemResult = {
        success: true,
        updatedMarket: market,
        powerPlantId: powerPlantId,
        fuelDelta: -30, // Remove 30 fuel units
        moneyDelta: 100, // Gain 100 money
      };

      // Act - Apply mutations
      const contextDraft = produce(gameContext, (draft) => {
        commoditySystem.mutate(successfulSellResult, draft);
      });

      // Assert
      const updatedPlayer = contextDraft.public.players[testPlayerId];
      const updatedPowerPlant = contextDraft.public.entitiesById[powerPlantId];

      // Verify player money increased
      expect(updatedPlayer.money).toBeGreaterThan(initialMoney);

      // Verify power plant fuel decreased
      expect(updatedPowerPlant.fuelStorage!.currentFuelStorage).toBeLessThan(initialFuel);

      // Verify market was updated
      expect(contextDraft.public.commodityMarket).toEqual(market);
    });
  });
});
