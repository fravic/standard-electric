/// <reference types="jest" />

import { HexGrid } from "../../HexGrid";
import { PowerSystem } from "../PowerSystem";
import { createBuildable } from "../../buildables/Buildable";
import { HexCoordinates } from "../../coordinates/HexCoordinates";
import { CornerCoordinates, CornerPosition } from "../../coordinates/types";
import { GameContext } from "@/actor/game.types";
import { Population } from "../../HexCell";
import { createPowerPole } from "../../buildables/PowerPole";

// Mock HexGrid implementation for testing
class TestHexGrid implements HexGrid {
  cellsByHexCoordinates = {};
  width = 20; // Increased grid size
  height = 20; // Increased grid size
}

describe("PowerSystem", () => {
  describe("findConnectedPowerPlants", () => {
    // Create a 20x20 hex grid for testing
    const hexGrid = new TestHexGrid();

    // Helper function to create a power pole at a corner
    const createPowerPoleAtCorner = (
      hex: HexCoordinates,
      position: CornerPosition,
      playerId: string = "player1"
    ) => {
      return createPowerPole({
        id: `pole-${hex.x}-${hex.z}-${position}`,
        cornerCoordinates: { hex, position },
        playerId,
        connectedToIds: [],
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

    it("should find a power plant in the same hex with empty path", () => {
      const hex: HexCoordinates = { x: 0, z: 0 };
      const plant = createPowerPlantAtHex(hex);
      const powerSystem = new PowerSystem(hexGrid, [plant]);

      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex);
      expect(connectedPlants).toEqual([{ plantId: plant.id, path: [] }]);
    });

    it("should find a power plant connected through a single power pole with correct path", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 0, z: -1 }; // NE neighbor
      const plant = createPowerPlantAtHex(hex2);
      const pole = createPowerPoleAtCorner(hex1, CornerPosition.North);

      const powerSystem = new PowerSystem(hexGrid, [plant, pole]);
      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants).toEqual([{ plantId: plant.id, path: [pole.id] }]);
    });

    it("should find multiple power plants connected through a simple network of poles", () => {
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
      const pole1 = createPowerPoleAtCorner(hex1, CornerPosition.North);
      const pole2 = createPowerPoleAtCorner(hex2, CornerPosition.North);

      const powerSystem = new PowerSystem(hexGrid, [plant, pole1, pole2]);
      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants).toEqual([
        { plantId: plant.id, path: [pole1.id, pole2.id] },
      ]);
    });

    it("should not find power plants that are not connected through poles", () => {
      const hex1: HexCoordinates = { x: 0, z: 0 };
      const hex2: HexCoordinates = { x: 2, z: 2 }; // Not adjacent
      const plant = createPowerPlantAtHex(hex2);

      const powerSystem = new PowerSystem(hexGrid, [plant]);
      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex1);
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
      const connectedPlants = powerSystem["findConnectedPowerPlants"](northHex);
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
      const connectedPlants = powerSystem["findConnectedPowerPlants"](hex1);
      expect(connectedPlants).toEqual([]);
    });

    it("should find a power plant connected through a long sequence of power poles", () => {
      // Create a long zigzag path from (0,0) to (3,-6)
      const startHex: HexCoordinates = { x: 0, z: 0 };
      const hex1: HexCoordinates = { x: 0, z: -1 }; // North
      const hex2: HexCoordinates = { x: 1, z: -2 }; // NE
      const hex3: HexCoordinates = { x: 1, z: -3 }; // North
      const hex4: HexCoordinates = { x: 2, z: -4 }; // NE
      const hex5: HexCoordinates = { x: 2, z: -5 }; // North
      const hex6: HexCoordinates = { x: 3, z: -6 }; // NE - Plant location

      // Place the plant at the end
      const plant = createPowerPlantAtHex(hex6);

      // Create a chain of poles connecting to the plant
      const pole1 = createPowerPoleAtCorner(startHex, CornerPosition.North);
      const pole2 = createPowerPoleAtCorner(hex1, CornerPosition.North);
      const pole3 = createPowerPoleAtCorner(hex2, CornerPosition.North);
      const pole4 = createPowerPoleAtCorner(hex3, CornerPosition.North);
      const pole5 = createPowerPoleAtCorner(hex4, CornerPosition.North);
      const pole6 = createPowerPoleAtCorner(hex5, CornerPosition.North);

      const powerSystem = new PowerSystem(hexGrid, [
        plant,
        pole1,
        pole2,
        pole3,
        pole4,
        pole5,
        pole6,
      ]);

      const connectedPlants = powerSystem["findConnectedPowerPlants"](startHex);
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
      const northHex: HexCoordinates = { x: 0, z: -1 };

      // Left branch - goes Northwest
      const leftHex1: HexCoordinates = { x: -1, z: -2 };
      const leftHex2: HexCoordinates = { x: -2, z: -3 };
      const leftPlant = createPowerPlantAtHex(leftHex2);

      // Right branch - goes Northeast
      const rightHex1: HexCoordinates = { x: 1, z: -2 };
      const rightHex2: HexCoordinates = { x: 2, z: -3 };
      const rightPlant = createPowerPlantAtHex(rightHex2);

      // Create the shared starting pole
      const startPole = createPowerPole({
        id: `pole-0-0-0`,
        cornerCoordinates: { hex: startHex, position: CornerPosition.North },
        playerId: "player1",
        connectedToIds: [],
      });
      const northPole = createPowerPole({
        id: `pole-0--1-0`,
        cornerCoordinates: { hex: northHex, position: CornerPosition.North },
        playerId: "player1",
        connectedToIds: [],
      });

      // Left branch poles
      const leftPole1 = createPowerPole({
        id: `pole--1--2-0`,
        cornerCoordinates: { hex: leftHex1, position: CornerPosition.North },
        playerId: "player1",
        connectedToIds: [],
      });
      const leftPole2 = createPowerPole({
        id: `pole--2--3-1`,
        cornerCoordinates: { hex: leftHex2, position: CornerPosition.South },
        playerId: "player1",
        connectedToIds: [],
      });

      // Right branch poles
      const rightPole1 = createPowerPole({
        id: `pole-1--2-0`,
        cornerCoordinates: { hex: rightHex1, position: CornerPosition.North },
        playerId: "player1",
        connectedToIds: [],
      });
      const rightPole2 = createPowerPole({
        id: `pole-2--3-1`,
        cornerCoordinates: { hex: rightHex2, position: CornerPosition.South },
        playerId: "player1",
        connectedToIds: [],
      });

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

      // Connect the poles to form the Y-shaped network
      startPole.connectedToIds = [northPole.id];
      northPole.connectedToIds = [startPole.id, leftPole1.id, rightPole1.id];
      leftPole1.connectedToIds = [northPole.id, leftPole2.id];
      leftPole2.connectedToIds = [leftPole1.id];
      rightPole1.connectedToIds = [northPole.id, rightPole2.id];
      rightPole2.connectedToIds = [rightPole1.id];

      const connectedPlants = powerSystem["findConnectedPowerPlants"](startHex);

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
  });
});
