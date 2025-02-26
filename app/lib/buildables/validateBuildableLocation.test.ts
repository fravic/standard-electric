import { validateBuildableLocation } from "./validateBuildableLocation";
import { HexGrid } from "../HexGrid";
import { CornerPosition } from "../coordinates/types";
import { Population, TerrainType } from "../HexCell";
import {
  Buildable,
  PowerPlant,
  PowerPlantBlueprint,
  PowerPole,
} from "./schemas";
import {
  fromCubeCoordinates,
  coordinatesToString,
} from "../coordinates/HexCoordinates";

describe("validateBuildableLocation", () => {
  // Create a grid with coordinates centered around q=0, r=0, s=0
  // Using cube coordinates to ensure proper adjacency
  const createGridCell = (
    q: number,
    r: number,
    s: number,
    regionName: string | null
  ) => {
    const coordinates = fromCubeCoordinates(q, r, s);
    return {
      coordinates,
      terrainType: TerrainType.Plains,
      regionName,
      population: Population.Town,
    };
  };

  // Create cells for our grid
  const cellsByHexCoordinates: Record<string, any> = {};

  // Center cell (q=0, r=0, s=0) - California region
  const centerCoords = fromCubeCoordinates(0, 0, 0);
  cellsByHexCoordinates[coordinatesToString(centerCoords)] = createGridCell(
    0,
    0,
    0,
    "California"
  );

  // Adjacent cells to center - California region
  const neCoords = fromCubeCoordinates(1, -1, 0);
  const eCoords = fromCubeCoordinates(1, 0, -1);
  const seCoords = fromCubeCoordinates(0, 1, -1);
  const swCoords = fromCubeCoordinates(-1, 1, 0);
  const wCoords = fromCubeCoordinates(-1, 0, 1);
  const nwCoords = fromCubeCoordinates(0, -1, 1);

  cellsByHexCoordinates[coordinatesToString(neCoords)] = createGridCell(
    1,
    -1,
    0,
    "California"
  );
  cellsByHexCoordinates[coordinatesToString(eCoords)] = createGridCell(
    1,
    0,
    -1,
    "California"
  );
  cellsByHexCoordinates[coordinatesToString(seCoords)] = createGridCell(
    0,
    1,
    -1,
    "California"
  );
  cellsByHexCoordinates[coordinatesToString(swCoords)] = createGridCell(
    -1,
    1,
    0,
    "California"
  );
  cellsByHexCoordinates[coordinatesToString(wCoords)] = createGridCell(
    -1,
    0,
    1,
    "California"
  );
  cellsByHexCoordinates[coordinatesToString(nwCoords)] = createGridCell(
    0,
    -1,
    1,
    "California"
  );

  // Texas region - a separate region not adjacent to California
  const texasCoords = fromCubeCoordinates(5, 0, -5);
  const texasNeCoords = fromCubeCoordinates(6, -1, -5);
  const texasECoords = fromCubeCoordinates(6, 0, -6);

  cellsByHexCoordinates[coordinatesToString(texasCoords)] = createGridCell(
    5,
    0,
    -5,
    "Texas"
  );
  cellsByHexCoordinates[coordinatesToString(texasNeCoords)] = createGridCell(
    6,
    -1,
    -5,
    "Texas"
  );
  cellsByHexCoordinates[coordinatesToString(texasECoords)] = createGridCell(
    6,
    0,
    -6,
    "Texas"
  );

  // Cell with no region
  const noRegionCoords = fromCubeCoordinates(10, 0, -10);
  cellsByHexCoordinates[coordinatesToString(noRegionCoords)] = createGridCell(
    10,
    0,
    -10,
    null
  );

  // Create the grid
  const grid: HexGrid = {
    width: 100,
    height: 100,
    cellsByHexCoordinates,
  };

  // Create player blueprints
  const player1Blueprints: Record<string, PowerPlantBlueprint> = {
    // Blueprint with California as required state
    california_plant: {
      id: "california_plant",
      type: "coal_plant",
      name: "California Power Plant",
      powerGenerationKW: 2000,
      startingPrice: 20,
      requiredState: "California",
    },
    // Blueprint with no required state
    generic_plant: {
      id: "generic_plant",
      type: "coal_plant",
      name: "Generic Power Plant",
      powerGenerationKW: 1000,
      startingPrice: 10,
    },
  };

  const player3Blueprints: Record<string, PowerPlantBlueprint> = {
    generic_plant: {
      id: "generic_plant",
      type: "coal_plant",
      name: "Generic Power Plant",
      powerGenerationKW: 1000,
      startingPrice: 10,
    },
  };

  // Create buildables
  const buildables: Buildable[] = [
    // Player 1's power plant at center (q=0, r=0, s=0)
    {
      id: "player1-plant",
      type: "coal_plant",
      coordinates: centerCoords,
      playerId: "player-1",
      name: "Player 1 Power Plant",
      powerGenerationKW: 1000,
      pricePerKwh: 0.1,
      startingPrice: 10,
    } as PowerPlant,

    // Player 1's power pole at the north corner of the center hex
    {
      id: "player1-pole-center",
      type: "power_pole",
      cornerCoordinates: {
        hex: centerCoords,
        position: CornerPosition.North,
      },
      playerId: "player-1",
      connectedToIds: [],
    } as PowerPole,

    // Player 1's power pole at the south corner of the northwest hex
    // This is adjacent to the north corner of the center hex
    {
      id: "player1-pole-nw",
      type: "power_pole",
      cornerCoordinates: {
        hex: nwCoords,
        position: CornerPosition.South,
      },
      playerId: "player-1",
      connectedToIds: ["player1-pole-center"],
    } as PowerPole,

    // Player 2's power plant in Texas
    {
      id: "player2-plant",
      type: "coal_plant",
      coordinates: texasCoords,
      playerId: "player-2",
      name: "Player 2 Power Plant",
      powerGenerationKW: 1000,
      pricePerKwh: 0.1,
      startingPrice: 10,
    } as PowerPlant,

    // Player 2's power pole at the north corner of the Texas hex
    {
      id: "player2-pole",
      type: "power_pole",
      cornerCoordinates: {
        hex: texasCoords,
        position: CornerPosition.North,
      },
      playerId: "player-2",
      connectedToIds: [],
    } as PowerPole,
  ];

  describe("Power Pole Validation", () => {
    test("should reject power poles in cells with no region", () => {
      const result = validateBuildableLocation(
        {
          id: "new-pole",
          type: "power_pole",
          cornerCoordinates: {
            hex: noRegionCoords,
            position: CornerPosition.North,
          },
        },
        grid,
        buildables,
        "player-1",
        player1Blueprints
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Power poles must be placed in a region");
    });

    test("should reject power poles not connected to player's grid", () => {
      const result = validateBuildableLocation(
        {
          id: "new-pole",
          type: "power_pole",
          cornerCoordinates: {
            hex: texasCoords,
            position: CornerPosition.South, // Different corner from existing pole
          },
        },
        grid,
        buildables,
        "player-1", // Player 1 trying to build at Player 2's location
        player1Blueprints
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe(
        "Power poles must be connected to your existing grid"
      );
    });

    test("should allow power poles connected to player's grid", () => {
      // For a North corner, the adjacent corners are:
      // 1. South corner of the NW neighbor
      // 2. South corner of the NE neighbor
      // 3. South corner of the N neighbor (NE then NW)

      // Our player1-pole-center is at the North corner of centerCoords
      // So we need to place a new pole at one of its adjacent corners
      // Let's use the South corner of the NE neighbor
      const neHex = fromCubeCoordinates(1, -1, 0); // NE neighbor of center

      const result = validateBuildableLocation(
        {
          id: "new-pole",
          type: "power_pole",
          cornerCoordinates: {
            hex: neHex,
            position: CornerPosition.South,
          },
        },
        grid,
        buildables,
        "player-1",
        player1Blueprints
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("Power Plant Validation", () => {
    test("should allow first power plant in a valid region", () => {
      // Empty buildables for player-3's first plant
      const emptyBuildables: Buildable[] = [];

      const result = validateBuildableLocation(
        {
          id: "generic_plant",
          type: "coal_plant",
          coordinates: centerCoords,
        },
        grid,
        emptyBuildables,
        "player-3",
        player3Blueprints
      );

      expect(result.valid).toBe(true);
    });

    test("should reject power plants in cells with no region", () => {
      const result = validateBuildableLocation(
        {
          id: "generic_plant",
          type: "coal_plant",
          coordinates: noRegionCoords,
        },
        grid,
        buildables,
        "player-1",
        player1Blueprints
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Power plants must be placed in a region");
    });

    test("should reject power plants not matching required state", () => {
      const result = validateBuildableLocation(
        {
          id: "california_plant", // Blueprint requires California
          type: "coal_plant",
          coordinates: texasCoords, // Texas region
        },
        grid,
        buildables,
        "player-1",
        player1Blueprints
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe(
        "This power plant must be placed in California"
      );
    });

    test("should allow power plants matching required state", () => {
      const result = validateBuildableLocation(
        {
          id: "california_plant", // Blueprint requires California
          type: "coal_plant",
          coordinates: neCoords, // California region
        },
        grid,
        buildables,
        "player-1",
        player1Blueprints
      );

      expect(result.valid).toBe(true);
    });

    test("should reject power plants not connected to player's grid", () => {
      // Create a context with a player who has a power plant but trying to build in a disconnected location
      const result = validateBuildableLocation(
        {
          id: "generic_plant",
          type: "coal_plant",
          coordinates: texasCoords, // Far from player 1's grid
        },
        grid,
        buildables,
        "player-1",
        player1Blueprints
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe(
        "Power plants must be connected to your existing grid"
      );
    });

    test("should allow power plants connected to player's grid", () => {
      const result = validateBuildableLocation(
        {
          id: "generic_plant",
          type: "coal_plant",
          coordinates: nwCoords, // Adjacent to player 1's pole
        },
        grid,
        buildables,
        "player-1",
        player1Blueprints
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("Invalid Buildable Types", () => {
    test("should reject invalid buildable types", () => {
      const result = validateBuildableLocation(
        {
          id: "invalid",
          type: "invalid_type" as any,
        },
        grid,
        buildables,
        "player-1",
        player1Blueprints
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe(
        "Invalid buildable type or missing coordinates"
      );
    });

    test("should reject buildables with missing coordinates", () => {
      const result = validateBuildableLocation(
        {
          id: "missing-coords",
          type: "coal_plant",
          // Missing coordinates
        },
        grid,
        buildables,
        "player-1",
        player1Blueprints
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe(
        "Invalid buildable type or missing coordinates"
      );
    });
  });
});
