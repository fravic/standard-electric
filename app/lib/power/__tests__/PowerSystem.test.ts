import { HexGrid } from "../../HexGrid";
import { PowerSystem } from "../PowerSystem";
import {
  HexCoordinates,
  coordinatesToString,
} from "../../coordinates/HexCoordinates";
import { CornerPosition } from "../../coordinates/types";
import { Population, TerrainType, HexCell } from "../../HexCell";
import { createPowerPole } from "../../buildables/PowerPole";
import { createCoalPlant } from "../../buildables/CoalPlant";
import { BuildableType } from "../../buildables/schemas";
import { createBuildable } from "../../buildables/Buildable";

// Helper function to create a power pole at a corner
const createPowerPoleAtCorner = (
  hex: HexCoordinates,
  position: CornerPosition,
  connectedToIds: string[] = []
) => {
  return createPowerPole({
    id: `pole-${hex.x}-${hex.z}-${position}`,
    cornerCoordinates: { hex, position },
    playerId: "player1",
    connectedToIds,
  });
};

// Helper function to create a power plant at coordinates
const createPowerPlantAtHex = (
  coordinates: HexCoordinates,
  playerId: string = "player1",
  powerGenerationKW: number = 100,
  pricePerKwh: number = 0.1
) => {
  return createCoalPlant({
    id: `plant-${coordinates.x}-${coordinates.z}`,
    coordinates,
    playerId,
    isGhost: false,
    powerGenerationKW,
    pricePerKwh,
  });
};

describe("PowerSystem", () => {
  let hexGrid: HexGrid;

  beforeEach(() => {
    hexGrid = {
      width: 10,
      height: 10,
      cellsByHexCoordinates: {} as Record<string, HexCell>,
    };
  });

  describe("findConnectedPowerPlants", () => {
    it("should find a power plant connected through a single power pole with correct path", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 0, z: -1 }; // NE neighbor
      const plant = createPowerPlantAtHex(hex2);
      const pole = createPowerPoleAtCorner(hex1, CornerPosition.North, []);

      const powerSystem = new PowerSystem(hexGrid, [plant, pole]);
      const { connectedPlants } = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants).toEqual([{ plantId: plant.id, path: [pole.id] }]);
    });

    it("should find multiple power plants connected through a simple network of poles", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 0, z: -1 }; // NE neighbor
      const hex3: HexCoordinates = { x: 0, z: 1 }; // SE neighbor

      const plant1 = createPowerPlantAtHex(hex2);
      const plant2 = createPowerPlantAtHex(hex3);
      const pole1 = createPowerPoleAtCorner(hex1, CornerPosition.North, []);
      const pole2 = createPowerPoleAtCorner(hex1, CornerPosition.South, [
        pole1.id,
      ]);

      const powerSystem = new PowerSystem(hexGrid, [
        plant1,
        plant2,
        pole1,
        pole2,
      ]);
      const { connectedPlants } = powerSystem["findConnectedPowerPlants"](hex1);
      expect(
        connectedPlants.sort((a, b) => a.plantId.localeCompare(b.plantId))
      ).toEqual(
        [
          { plantId: plant1.id, path: [pole1.id] },
          { plantId: plant2.id, path: [pole2.id] },
        ].sort((a, b) => a.plantId.localeCompare(b.plantId))
      );
    });

    it("should find a power plant connected through two power poles in sequence", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 0, z: -1 }; // NE neighbor
      const hex3: HexCoordinates = { x: 0, z: -2 }; // NE neighbor of hex2

      const plant = createPowerPlantAtHex(hex3);
      const pole1 = createPowerPoleAtCorner(hex1, CornerPosition.North, []);
      const pole2 = createPowerPoleAtCorner(hex2, CornerPosition.North, [
        pole1.id,
      ]);

      const powerSystem = new PowerSystem(hexGrid, [plant, pole1, pole2]);
      const { connectedPlants } = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants).toEqual([
        { plantId: plant.id, path: [pole1.id, pole2.id] },
      ]);
    });

    it("should not find power plants that are not connected through poles", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 2, z: 2 }; // Not adjacent
      const plant = createPowerPlantAtHex(hex2);

      const powerSystem = new PowerSystem(hexGrid, [plant]);
      const { connectedPlants } = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants).toEqual([]);
    });

    it("should handle circular connections by finding shortest path", () => {
      // Create a diamond shape of hexes with the plant at the center
      const centerHex: HexCoordinates = { x: 0, z: 0 };
      const northHex: HexCoordinates = { x: 0, z: -1 };
      const eastHex: HexCoordinates = { x: 1, z: 0 };
      const southHex: HexCoordinates = { x: 0, z: 1 };
      const westHex: HexCoordinates = { x: -1, z: 0 };

      // Place the plant in the center
      const plant = createPowerPlantAtHex(centerHex);

      // Create a ring of poles around the center
      const northPole = createPowerPoleAtCorner(northHex, CornerPosition.South);
      const eastPole = createPowerPoleAtCorner(eastHex, CornerPosition.South);
      const southPole = createPowerPoleAtCorner(southHex, CornerPosition.North);
      const westPole = createPowerPoleAtCorner(westHex, CornerPosition.South);

      const powerSystem = new PowerSystem(hexGrid, [
        plant,
        northPole,
        eastPole,
        southPole,
        westPole,
      ]);

      // Starting from the north hex, the shortest path should be through the north pole
      const { connectedPlants } =
        powerSystem["findConnectedPowerPlants"](northHex);
      expect(connectedPlants).toEqual([
        { plantId: plant.id, path: [northPole.id] },
      ]);
    });

    it("should not connect to power plants through unconnected poles", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 0, z: -1 }; // NE neighbor
      const hex3: HexCoordinates = { x: 0, z: -2 }; // NE neighbor of hex2

      const plant = createPowerPlantAtHex(hex3);
      const pole1 = createPowerPoleAtCorner(hex1, CornerPosition.North);
      // Missing pole at hex2, breaking the connection

      const powerSystem = new PowerSystem(hexGrid, [plant, pole1]);
      const { connectedPlants } = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants).toEqual([]);
    });

    it("should find a power plant connected through a long sequence of power poles", () => {
      // Create a long zigzag path from (0,0) to (3,-6)
      const startHex: HexCoordinates = { x: 0, z: 0 };
      const hex1: HexCoordinates = { x: 0, z: -1 };
      const hex2: HexCoordinates = { x: 1, z: -2 };
      const hex3: HexCoordinates = { x: 1, z: -3 };
      const hex4: HexCoordinates = { x: 2, z: -4 };
      const hex5: HexCoordinates = { x: 2, z: -5 };
      const hex6: HexCoordinates = { x: 3, z: -6 }; // Plant location

      // Place the plant at the end
      const plant = createPowerPlantAtHex(hex6);

      // Create a chain of poles connecting to the plant
      const pole1 = createPowerPoleAtCorner(startHex, CornerPosition.North, []);
      const pole2 = createPowerPoleAtCorner(hex1, CornerPosition.North, [
        pole1.id,
      ]);
      const pole3 = createPowerPoleAtCorner(hex2, CornerPosition.North, [
        pole2.id,
      ]);
      const pole4 = createPowerPoleAtCorner(hex3, CornerPosition.North, [
        pole3.id,
      ]);
      const pole5 = createPowerPoleAtCorner(hex4, CornerPosition.North, [
        pole4.id,
      ]);
      const pole6 = createPowerPoleAtCorner(hex5, CornerPosition.North, [
        pole5.id,
      ]);

      const powerSystem = new PowerSystem(hexGrid, [
        plant,
        pole1,
        pole2,
        pole3,
        pole4,
        pole5,
        pole6,
      ]);

      const { connectedPlants } =
        powerSystem["findConnectedPowerPlants"](startHex);
      expect(connectedPlants).toEqual([
        {
          plantId: plant.id,
          path: [pole1.id, pole2.id, pole3.id, pole4.id, pole5.id, pole6.id],
        },
      ]);
    });

    it("should find multiple power plants through long branching paths", () => {
      // Create a Y-shaped network with two plants at the ends
      const startHex: HexCoordinates = { x: 0, z: 0 };

      // First go North (shared path)
      const northHex: HexCoordinates = { x: 0, z: -2 };

      // Left branch - goes Northwest
      const leftHex1: HexCoordinates = { x: -1, z: -1 };
      const leftHex2: HexCoordinates = { x: -1, z: -7 };
      const leftPlant = createPowerPlantAtHex(leftHex2);

      // Right branch - goes Northeast
      const rightHex1: HexCoordinates = { x: 1, z: -2 };
      const rightHex2: HexCoordinates = { x: 2, z: -3 };
      const rightPlant = createPowerPlantAtHex(rightHex2);

      // Create the shared starting poles
      const startPole = createPowerPoleAtCorner(
        startHex,
        CornerPosition.North,
        []
      );
      const northPole = createPowerPoleAtCorner(
        northHex,
        CornerPosition.South,
        [startPole.id]
      );

      // Left branch poles
      const leftPole1 = createPowerPoleAtCorner(
        leftHex1,
        CornerPosition.North,
        [northPole.id]
      );
      const leftPole2 = createPowerPoleAtCorner(
        leftHex2,
        CornerPosition.South,
        [leftPole1.id]
      );

      // Right branch poles
      const rightPole1 = createPowerPoleAtCorner(
        rightHex1,
        CornerPosition.North,
        [northPole.id]
      );
      const rightPole2 = createPowerPoleAtCorner(
        rightHex2,
        CornerPosition.South,
        [rightPole1.id]
      );

      const powerSystem = new PowerSystem(hexGrid, [
        leftPlant,
        rightPlant,
        startPole,
        northPole,
        leftPole1,
        leftPole2,
        rightPole1,
        rightPole2,
      ]);

      const { connectedPlants } =
        powerSystem["findConnectedPowerPlants"](startHex);

      // Sort the results for consistent comparison
      expect(
        connectedPlants.sort((a, b) => a.plantId.localeCompare(b.plantId))
      ).toEqual(
        [
          {
            plantId: leftPlant.id,
            path: [startPole.id, northPole.id, leftPole1.id, leftPole2.id],
          },
          {
            plantId: rightPlant.id,
            path: [startPole.id, northPole.id, rightPole1.id, rightPole2.id],
          },
        ].sort((a, b) => a.plantId.localeCompare(b.plantId))
      );
    });

    it("should find all connected poles in a circular network", () => {
      // Create a diamond shape with a plant at the center
      const centerHex: HexCoordinates = { x: 0, z: 0 };
      const northHex: HexCoordinates = { x: 0, z: -1 };
      const eastHex: HexCoordinates = { x: 1, z: 0 };
      const southHex: HexCoordinates = { x: 0, z: 1 };
      const westHex: HexCoordinates = { x: -1, z: 0 };

      const plant = createPowerPlantAtHex(centerHex);

      // Create a ring of poles around the center, each connected to its neighbors
      const northPole = createPowerPoleAtCorner(
        northHex,
        CornerPosition.South,
        []
      );
      const eastPole = createPowerPoleAtCorner(eastHex, CornerPosition.South, [
        northPole.id,
      ]);
      const southPole = createPowerPoleAtCorner(
        southHex,
        CornerPosition.North,
        [eastPole.id]
      );
      const westPole = createPowerPoleAtCorner(westHex, CornerPosition.South, [
        southPole.id,
      ]);
      northPole.connectedToIds.push(westPole.id); // Complete the circle

      const powerSystem = new PowerSystem(hexGrid, [
        plant,
        northPole,
        eastPole,
        southPole,
        westPole,
      ]);

      // Starting from the north hex, should find all poles in the network
      const { connectedPoleIds } =
        powerSystem["findConnectedPowerPlants"](northHex);
      expect(new Set(connectedPoleIds)).toEqual(
        new Set([northPole.id, eastPole.id, southPole.id, westPole.id])
      );
    });

    it("should find all connected poles in a branching network", () => {
      const startHex: HexCoordinates = { x: 0, z: 0 };
      const northHex: HexCoordinates = { x: 0, z: -1 };
      const leftHex: HexCoordinates = { x: -1, z: -1 };
      const rightHex: HexCoordinates = { x: 1, z: -1 };

      const plant = createPowerPlantAtHex(northHex);

      // Create a Y-shaped network of poles
      const startPole = createPowerPoleAtCorner(
        startHex,
        CornerPosition.North,
        []
      );
      const leftPole = createPowerPoleAtCorner(leftHex, CornerPosition.South, [
        startPole.id,
      ]);
      const rightPole = createPowerPoleAtCorner(
        rightHex,
        CornerPosition.South,
        [startPole.id]
      );

      const powerSystem = new PowerSystem(hexGrid, [
        plant,
        startPole,
        leftPole,
        rightPole,
      ]);

      const { connectedPoleIds } =
        powerSystem["findConnectedPowerPlants"](startHex);
      expect(new Set(connectedPoleIds)).toEqual(
        new Set([startPole.id, leftPole.id, rightPole.id])
      );
    });

    it("should find poles connected through backward references", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 0, z: -1 };
      const hex3: HexCoordinates = { x: 0, z: -2 };

      const plant = createPowerPlantAtHex(hex3);

      // Create poles where each points to the previous one (backward references)
      const pole1 = createPowerPoleAtCorner(hex1, CornerPosition.North, []);
      const pole2 = createPowerPoleAtCorner(hex2, CornerPosition.North, [
        pole1.id,
      ]);
      const pole3 = createPowerPoleAtCorner(hex3, CornerPosition.North, [
        pole2.id,
      ]);

      const powerSystem = new PowerSystem(hexGrid, [
        plant,
        pole1,
        pole2,
        pole3,
      ]);

      const { connectedPoleIds } =
        powerSystem["findConnectedPowerPlants"](hex1);
      expect(new Set(connectedPoleIds)).toEqual(
        new Set([pole1.id, pole2.id, pole3.id])
      );
    });
  });

  describe("compileGrids", () => {
    it("should create a single grid for an isolated power plant", () => {
      const plant = createPowerPlantAtHex({ x: 0, z: 0 });
      const powerSystem = new PowerSystem(hexGrid, [plant]);
      const grids = powerSystem["compileGrids"]();

      expect(grids).toHaveLength(1);
      expect(grids[0]).toEqual({
        id: plant.id,
        powerPlantIds: [plant.id],
        powerPoleIds: [],
        totalCapacity: 100,
        usedCapacity: 0,
        blackout: false,
      });
    });

    it("should create separate grids for unconnected power plants", () => {
      const plant1 = createPowerPlantAtHex({ x: 0, z: 0 });
      const plant2 = createPowerPlantAtHex({ x: 5, z: 5 });
      const powerSystem = new PowerSystem(hexGrid, [plant1, plant2]);
      const grids = powerSystem["compileGrids"]();

      expect(grids).toHaveLength(2);
      expect(grids.map((g) => g.powerPlantIds.length)).toEqual([1, 1]);
      expect(grids.map((g) => g.powerPoleIds.length)).toEqual([0, 0]);
      expect(grids.map((g) => g.totalCapacity)).toEqual([100, 100]);
    });

    it("should create a single grid for two power plants connected by power poles", () => {
      const plant1 = createPowerPlantAtHex({ x: 0, z: 0 });
      const plant2 = createPowerPlantAtHex({ x: 0, z: -2 }, "player1", 200);
      const pole1 = createPowerPoleAtCorner(
        { x: 0, z: 0 },
        CornerPosition.North
      );
      const pole2 = createPowerPoleAtCorner(
        { x: 0, z: -1 },
        CornerPosition.North,
        [pole1.id]
      );

      const powerSystem = new PowerSystem(hexGrid, [
        plant1,
        plant2,
        pole1,
        pole2,
      ]);
      const grids = powerSystem["compileGrids"]();

      expect(grids).toHaveLength(1);
      expect(grids[0].powerPlantIds).toHaveLength(2);
      expect(grids[0].powerPlantIds).toContain(plant1.id);
      expect(grids[0].powerPlantIds).toContain(plant2.id);
      expect(grids[0].powerPoleIds).toEqual([pole1.id, pole2.id]);
      expect(grids[0].totalCapacity).toBe(300); // 100 + 200
    });

    it("should handle circular connections in a grid", () => {
      // Create a diamond shape with plants at opposite corners
      const plant1 = createPowerPlantAtHex({ x: 0, z: 0 });
      const plant2 = createPowerPlantAtHex({ x: 2, z: 0 });

      // Create a ring of poles connecting the plants
      const pole1 = createPowerPoleAtCorner(
        { x: 0, z: 0 },
        CornerPosition.North,
        []
      );
      const pole2 = createPowerPoleAtCorner(
        { x: 1, z: -1 },
        CornerPosition.South,
        [pole1.id]
      );
      const pole3 = createPowerPoleAtCorner(
        { x: 2, z: 0 },
        CornerPosition.North,
        [pole2.id]
      );
      const pole4 = createPowerPoleAtCorner(
        { x: 1, z: 1 },
        CornerPosition.North,
        [pole3.id, pole1.id]
      );

      // Add bi-directional connections
      pole1.connectedToIds.push(pole2.id, pole4.id);
      pole2.connectedToIds.push(pole3.id);
      pole3.connectedToIds.push(pole4.id);

      const powerSystem = new PowerSystem(hexGrid, [
        plant1,
        plant2,
        pole1,
        pole2,
        pole3,
        pole4,
      ]);
      const grids = powerSystem["compileGrids"]();

      expect(grids).toHaveLength(1);
      expect(grids[0].powerPlantIds).toHaveLength(2);
      expect(grids[0].powerPoleIds).toHaveLength(4);
      expect(grids[0].totalCapacity).toBe(200);
    });

    it("should handle bi-directional pole connections", () => {
      const plant1 = createPowerPlantAtHex({ x: 0, z: 0 });
      const plant2 = createPowerPlantAtHex({ x: 0, z: -2 });

      // Create poles with bi-directional connections
      const pole1 = createPowerPoleAtCorner(
        { x: 0, z: 0 },
        CornerPosition.North
      );
      const pole2 = createPowerPoleAtCorner(
        { x: 0, z: -1 },
        CornerPosition.North,
        [pole1.id]
      );
      // Modify pole1 to also connect to pole2
      pole1.connectedToIds.push(pole2.id);

      const powerSystem = new PowerSystem(hexGrid, [
        plant1,
        plant2,
        pole1,
        pole2,
      ]);
      const grids = powerSystem["compileGrids"]();

      expect(grids).toHaveLength(1);
      expect(grids[0].powerPlantIds).toHaveLength(2);
      expect(grids[0].powerPoleIds).toHaveLength(2);
    });
  });

  describe("resolveOneHourOfPowerProduction", () => {
    // Helper to create a populated hex cell
    const createPopulatedHex = (
      coordinates: HexCoordinates,
      population: Population
    ): HexCell => ({
      coordinates,
      population,
      terrainType: TerrainType.Plains,
      stateInfo: null,
    });

    beforeEach(() => {
      // Reset the mock grid for each test
      hexGrid.cellsByHexCoordinates = {};
    });

    it("should allocate power from the cheapest plant first", () => {
      const consumerHex = { x: 0, z: 0 };
      hexGrid.cellsByHexCoordinates[coordinatesToString(consumerHex)] =
        createPopulatedHex(
          consumerHex,
          Population.Village // 10kW demand
        );

      // Create plants with different prices
      const cheapPlant = createPowerPlantAtHex(
        { x: 1, z: 0 },
        "player1",
        100,
        0.1
      );
      const expensivePlant = createPowerPlantAtHex(
        { x: -1, z: 0 },
        "player2",
        100,
        0.2
      );

      // Create poles and connect them to the plants
      const pole1 = createPowerPoleAtCorner(consumerHex, CornerPosition.North);
      const pole2 = createPowerPoleAtCorner(
        { x: 1, z: 0 },
        CornerPosition.South,
        [pole1.id]
      );
      const pole3 = createPowerPoleAtCorner(consumerHex, CornerPosition.South);
      const pole4 = createPowerPoleAtCorner(
        { x: -1, z: 0 },
        CornerPosition.North,
        [pole3.id]
      );

      const powerSystem = new PowerSystem(hexGrid, [
        cheapPlant,
        expensivePlant,
        pole1,
        pole2,
        pole3,
        pole4,
      ]);

      const result = powerSystem.resolveOneHourOfPowerProduction();

      // Should only use the cheap plant
      expect(result.incomePerPlayer).toEqual({
        player1: 10 * 0.1, // 10kW at 0.1/kW
      });
      expect(result.powerSoldPerPlayerKWh).toEqual({
        player1: 10, // 10kW sold
      });
      expect(
        result.grids.find((g) => g.powerPlantIds.includes(cheapPlant.id))
          ?.usedCapacity
      ).toBe(10);
      expect(
        result.grids.find((g) => g.powerPlantIds.includes(expensivePlant.id))
          ?.usedCapacity
      ).toBe(0);
    });

    it("should cause blackouts when demand exceeds supply", () => {
      const consumerHex = { x: 0, z: 0 };
      hexGrid.cellsByHexCoordinates[coordinatesToString(consumerHex)] =
        createPopulatedHex(
          consumerHex,
          Population.Metropolis // 100kW demand
        );

      const plant1 = createPowerPlantAtHex({ x: 1, z: 0 }, "player1", 40);
      const plant2 = createPowerPlantAtHex({ x: -1, z: 0 }, "player2", 40);
      // Total capacity 80kW < 100kW demand

      // Create poles and connect them to the plants
      const pole1 = createPowerPoleAtCorner(consumerHex, CornerPosition.North);
      const pole2 = createPowerPoleAtCorner(
        { x: 1, z: 0 },
        CornerPosition.South,
        [pole1.id]
      );
      const pole3 = createPowerPoleAtCorner(consumerHex, CornerPosition.South);
      const pole4 = createPowerPoleAtCorner(
        { x: -1, z: 0 },
        CornerPosition.North,
        [pole3.id]
      );

      const powerSystem = new PowerSystem(hexGrid, [
        plant1,
        plant2,
        pole1,
        pole2,
        pole3,
        pole4,
      ]);
      const result = powerSystem.resolveOneHourOfPowerProduction();

      // Both grids should be in blackout
      expect(result.grids.every((g) => g.blackout)).toBe(true);
      // No income or power sold during blackout
      expect(result.incomePerPlayer).toEqual({});
      expect(result.powerSoldPerPlayerKWh).toEqual({});
    });

    it("should blackout all connected grids when any consumer's demand can't be met", () => {
      // Two consumers connected to the same grid
      const consumer1Hex = { x: 0, z: 0 };
      const consumer2Hex = { x: 2, z: 0 };
      hexGrid.cellsByHexCoordinates[coordinatesToString(consumer1Hex)] =
        createPopulatedHex(
          consumer1Hex,
          Population.Village // 10kW demand
        );
      hexGrid.cellsByHexCoordinates[coordinatesToString(consumer2Hex)] =
        createPopulatedHex(
          consumer2Hex,
          Population.Metropolis // 100kW demand
        );

      const plant = createPowerPlantAtHex({ x: 1, z: 0 }, "player1", 50);
      // 50kW capacity < 110kW total demand

      // Create poles and connect them to the plant
      const pole1 = createPowerPoleAtCorner(consumer1Hex, CornerPosition.North);
      const pole2 = createPowerPoleAtCorner(
        { x: 1, z: 0 },
        CornerPosition.South,
        [pole1.id]
      );
      const pole3 = createPowerPoleAtCorner(consumer2Hex, CornerPosition.North);
      const pole4 = createPowerPoleAtCorner(
        { x: 1, z: 0 },
        CornerPosition.North,
        [pole3.id]
      );

      const powerSystem = new PowerSystem(hexGrid, [
        plant,
        pole1,
        pole2,
        pole3,
        pole4,
      ]);
      const result = powerSystem.resolveOneHourOfPowerProduction();

      // Grid should be in blackout
      expect(result.grids[0].blackout).toBe(true);
      // No income or power sold during blackout
      expect(result.incomePerPlayer).toEqual({});
      expect(result.powerSoldPerPlayerKWh).toEqual({});
    });

    it("should handle multiple independent grids with some in blackout", () => {
      // Two consumers on separate grids
      const consumer1Hex = { x: 0, z: 0 };
      const consumer2Hex = { x: 5, z: 0 };
      hexGrid.cellsByHexCoordinates[coordinatesToString(consumer1Hex)] =
        createPopulatedHex(
          consumer1Hex,
          Population.Village // 10kW demand
        );
      hexGrid.cellsByHexCoordinates[coordinatesToString(consumer2Hex)] =
        createPopulatedHex(
          consumer2Hex,
          Population.Metropolis // 100kW demand
        );

      // Grid 1: Sufficient capacity
      const plant1 = createPowerPlantAtHex({ x: 1, z: 0 }, "player1", 20, 0.1);
      const pole1 = createPowerPoleAtCorner(consumer1Hex, CornerPosition.North);
      const pole2 = createPowerPoleAtCorner(
        { x: 1, z: 0 },
        CornerPosition.South,
        [pole1.id]
      );

      // Grid 2: Insufficient capacity
      const plant2 = createPowerPlantAtHex({ x: 4, z: 0 }, "player2", 50, 0.1);
      const pole3 = createPowerPoleAtCorner(consumer2Hex, CornerPosition.North);
      const pole4 = createPowerPoleAtCorner(
        { x: 4, z: 0 },
        CornerPosition.South,
        [pole3.id]
      );

      const powerSystem = new PowerSystem(hexGrid, [
        plant1,
        plant2,
        pole1,
        pole2,
        pole3,
        pole4,
      ]);
      const result = powerSystem.resolveOneHourOfPowerProduction();

      // Grid 1 should work, Grid 2 should be in blackout
      const grid1 = result.grids.find((g) =>
        g.powerPlantIds.includes(plant1.id)
      )!;
      const grid2 = result.grids.find((g) =>
        g.powerPlantIds.includes(plant2.id)
      )!;
      expect(grid1.blackout).toBe(false);
      expect(grid1.usedCapacity).toBe(10);
      expect(grid2.blackout).toBe(true);
      expect(grid2.usedCapacity).toBe(0);

      // Only income and power sold from Grid 1
      expect(result.incomePerPlayer).toEqual({
        player1: 10 * 0.1,
      });
      expect(result.powerSoldPerPlayerKWh).toEqual({
        player1: 10,
      });
    });

    it("should handle a consumer connected to multiple grids", () => {
      const consumerHex = { x: 0, z: 0 };
      hexGrid.cellsByHexCoordinates[coordinatesToString(consumerHex)] =
        createPopulatedHex(
          consumerHex,
          Population.City // 50kW demand
        );

      // Two separate plants/grids, both connected to the consumer
      const plant1 = createPowerPlantAtHex({ x: 1, z: 0 }, "player1", 30, 0.1);
      const plant2 = createPowerPlantAtHex({ x: -1, z: 0 }, "player2", 30, 0.2);

      // Create poles and connect them to the plants
      const pole1 = createPowerPoleAtCorner(consumerHex, CornerPosition.North);
      const pole2 = createPowerPoleAtCorner(
        { x: 1, z: 0 },
        CornerPosition.South,
        [pole1.id]
      );
      const pole3 = createPowerPoleAtCorner(consumerHex, CornerPosition.South);
      const pole4 = createPowerPoleAtCorner(
        { x: -1, z: 0 },
        CornerPosition.North,
        [pole3.id]
      );

      const powerSystem = new PowerSystem(hexGrid, [
        plant1,
        plant2,
        pole1,
        pole2,
        pole3,
        pole4,
      ]);

      const result = powerSystem.resolveOneHourOfPowerProduction();

      // Should use cheaper plant first, then the more expensive one
      const grid1 = result.grids.find((g) =>
        g.powerPlantIds.includes(plant1.id)
      )!;
      const grid2 = result.grids.find((g) =>
        g.powerPlantIds.includes(plant2.id)
      )!;
      expect(grid1.usedCapacity).toBe(30); // Used all capacity from cheaper plant
      expect(grid2.usedCapacity).toBe(20); // Used remaining demand from expensive plant
      expect(result.incomePerPlayer).toEqual({
        player1: 30 * 0.1, // 30kW at 0.1/kW
        player2: 20 * 0.2, // 20kW at 0.2/kW
      });
      expect(result.powerSoldPerPlayerKWh).toEqual({
        player1: 30, // 30kW sold from cheaper plant
        player2: 20, // 20kW sold from expensive plant
      });
    });
  });
});
