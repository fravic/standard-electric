/// <reference types="jest" />

import { HexGrid } from "../../HexGrid";
import { PowerSystem } from "../PowerSystem";
import { createBuildable } from "../../buildables/Buildable";
import { HexCoordinates } from "../../coordinates/HexCoordinates";
import { CornerCoordinates, CornerPosition } from "../../coordinates/types";
import { GameContext } from "@/actor/game.types";
import { Population } from "../../HexCell";

// Mock HexGrid implementation for testing
class TestHexGrid implements HexGrid {
  cellsByHexCoordinates = {};
  width = 5;
  height = 5;
}

describe("PowerSystem", () => {
  describe("findConnectedPowerPlants", () => {
    // Create a 5x5 hex grid for testing
    const hexGrid = new TestHexGrid();

    // Helper function to create a power pole at a corner
    const createPowerPoleAtCorner = (
      hex: HexCoordinates,
      position: CornerPosition,
      playerId: string = "player1"
    ) => {
      const context: GameContext = {
        public: {
          id: "test-game",
          buildables: [],
          hexGrid,
          players: {
            player1: {
              name: "Player 1",
              money: 100,
            },
          },
          time: {
            totalTicks: 0,
            isPaused: false,
          },
        },
        private: {},
      };

      return createBuildable({
        id: `pole-${hex.x}-${hex.z}-${position}`,
        buildable: {
          type: "power_pole",
          cornerCoordinates: { hex, position },
        },
        playerId,
        context,
      });
    };

    // Helper function to create a power plant at coordinates
    const createPowerPlantAtHex = (
      coordinates: HexCoordinates,
      playerId: string = "player1"
    ) => {
      const context: GameContext = {
        public: {
          id: "test-game",
          buildables: [],
          hexGrid,
          players: {
            player1: {
              name: "Player 1",
              money: 100,
            },
          },
          time: {
            totalTicks: 0,
            isPaused: false,
          },
        },
        private: {},
      };

      return createBuildable({
        id: `plant-${coordinates.x}-${coordinates.z}`,
        buildable: {
          type: "coal_plant",
          coordinates,
        },
        playerId,
        context,
      });
    };

    it("should find a power plant in the same hex", () => {
      const hex: HexCoordinates = { x: 0, z: 0 };
      const plant = createPowerPlantAtHex(hex);
      const powerSystem = new PowerSystem(hexGrid, [plant]);

      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex);
      expect(connectedPlants).toEqual([plant.id]);
    });

    it("should find a power plant connected through a single power pole", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 0, z: -1 }; // NE neighbor
      const plant = createPowerPlantAtHex(hex2);
      const pole = createPowerPoleAtCorner(hex1, CornerPosition.North);

      const powerSystem = new PowerSystem(hexGrid, [plant, pole]);
      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants).toEqual([plant.id]);
    });

    it("should find multiple power plants connected through a network of poles", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 0, z: -1 }; // NE neighbor
      const hex3: HexCoordinates = { x: 0, z: 1 }; // SE neighbor

      const plant1 = createPowerPlantAtHex(hex2);
      const plant2 = createPowerPlantAtHex(hex3);
      const pole1 = createPowerPoleAtCorner(hex1, CornerPosition.North);
      const pole2 = createPowerPoleAtCorner(hex1, CornerPosition.South);

      const powerSystem = new PowerSystem(hexGrid, [
        plant1,
        plant2,
        pole1,
        pole2,
      ]);
      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants.sort()).toEqual([plant1.id, plant2.id].sort());
    });

    it("should not find power plants that are not connected through poles", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 2, z: 2 }; // Not adjacent
      const plant = createPowerPlantAtHex(hex2);

      const powerSystem = new PowerSystem(hexGrid, [plant]);
      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants).toEqual([]);
    });

    it("should handle circular connections without infinite loops", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 0, z: -1 }; // NE neighbor
      const hex3: HexCoordinates = { x: 1, z: 0 }; // E neighbor
      const hex4: HexCoordinates = { x: 0, z: 1 }; // SE neighbor

      const plant = createPowerPlantAtHex(hex1);
      const pole1 = createPowerPoleAtCorner(hex1, CornerPosition.North);
      const pole2 = createPowerPoleAtCorner(hex2, CornerPosition.South);
      const pole3 = createPowerPoleAtCorner(hex3, CornerPosition.South);
      const pole4 = createPowerPoleAtCorner(hex4, CornerPosition.North);

      const powerSystem = new PowerSystem(hexGrid, [
        plant,
        pole1,
        pole2,
        pole3,
        pole4,
      ]);
      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex2);
      expect(connectedPlants).toEqual([plant.id]);
    });

    it("should not connect to power plants through unconnected poles", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 0, z: -1 }; // NE neighbor
      const hex3: HexCoordinates = { x: 0, z: -2 }; // NE neighbor of hex2

      const plant = createPowerPlantAtHex(hex3);
      const pole1 = createPowerPoleAtCorner(hex1, CornerPosition.North);
      // Missing pole at hex2, breaking the connection

      const powerSystem = new PowerSystem(hexGrid, [plant, pole1]);
      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants).toEqual([]);
    });
  });
});
