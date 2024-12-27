import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import { WritableDraft } from "immer";
import { z } from "zod";
import { nanoid } from "nanoid";

import { HexGrid, HexGridSchema, type HexGridData } from "../lib/HexGrid";
import { MapData } from "../lib/MapData";
import { HexCell, TerrainType, Population } from "../lib/HexCell";
import { HexCoordinates } from "../lib/HexCoordinates";
import { PowerPole } from "../lib/PowerSystem";
import { CoalPlant } from "../lib/CoalPlant";
import { Buildable, BuildableType } from "../lib/Buildable";
import { CornerCoordinates } from "../lib/CornerCoordinates";

export type BuildMode = null | {
  type: BuildableType;
};

interface Player {
  money: number;
  buildMode: BuildMode;
  hoverLocation: {
    worldPoint: [number, number, number];
  } | null;
  selectedHexCoordinates: HexCoordinates | null;
}

interface MapBuilder {
  isPaintbrushMode: boolean;
  selectedTerrainType: TerrainType | null;
  selectedPopulation: Population | null;
}

interface GameState {
  isDebug: boolean;
  mapBuilder: MapBuilder;
  hexGrid: HexGrid;
  buildables: Buildable[];
  players: {
    [playerId: string]: Player;
  };
}

type Setter = (
  state: (state: WritableDraft<GameState>) => void,
  shouldReplace?: false,
  name?: string
) => void;

// Actions

type BuildableData = {
  type: BuildableType;
  coordinates?: HexCoordinates;
  cornerCoordinates?: CornerCoordinates;
  isGhost?: boolean;
};

type Actions = {
  setIsDebug: (isDebug: boolean) => void;
  setPaintbrushMode: (enabled: boolean) => void;
  setSelectedTerrainType: (terrainType: TerrainType | null) => void;
  setSelectedPopulation: (population: Population | null) => void;
  exportHexGridToJSON: () => string;
  importHexGridFromJSON: (jsonString: string) => void;
  addBuildable: (buildableData: BuildableData) => boolean;
  setMoney: (playerId: string, amount: number) => void;
  spendMoney: (playerId: string, amount: number) => boolean;
  setBuildMode: (playerId: string, mode: BuildMode) => void;
  setHoverLocation: (
    playerId: string,
    worldPoint: [number, number, number] | null
  ) => void;
  selectHex: (coordinates: HexCoordinates | null) => void;
  updateHexTerrain: (
    coordinates: HexCoordinates,
    terrainType: TerrainType
  ) => void;
  updateHexPopulation: (
    coordinates: HexCoordinates,
    population: Population
  ) => void;
};

const setIsDebug = (set: Setter) => (isDebug: boolean) => {
  set(
    (state) => {
      state.isDebug = isDebug;
    },
    undefined,
    "setIsDebug"
  );
};

const exportHexGridToJSON = (set: Setter) => (): string => {
  const state = useGameStore.getState();
  const exportData: HexGridData = {
    width: state.hexGrid.width,
    height: state.hexGrid.height,
    cells: state.hexGrid.cells.map((cell) => ({
      coordinates: {
        x: cell.coordinates.x,
        z: cell.coordinates.z,
      },
      stateInfo: cell.stateInfo,
      terrainType: cell.terrainType,
      population: cell.population,
    })),
  };
  return JSON.stringify(exportData, null, 2);
};

const importHexGridFromJSON = (set: Setter) => (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString);
    const validatedData = HexGridSchema.parse(data);

    set(
      (state) => {
        state.hexGrid = new HexGrid(validatedData.width, validatedData.height);
        validatedData.cells.forEach((cellData) => {
          const cell = new HexCell(
            cellData.coordinates.x,
            cellData.coordinates.z
          );
          cell.stateInfo = cellData.stateInfo;
          if (cellData.terrainType) {
            cell.terrainType = cellData.terrainType;
          }
          if (
            cellData.population !== undefined &&
            cellData.population !== null
          ) {
            cell.population = cellData.population;
          }
          state.hexGrid.addCell(
            cell,
            cellData.coordinates.x,
            cellData.coordinates.z
          );
        });
      },
      undefined,
      "importHexGridFromJSON"
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Invalid HexGrid data:", error.errors);
    }
    throw error;
  }
};

const setMoney = (set: Setter) => (playerId: string, amount: number) => {
  set(
    (state) => {
      if (state.players[playerId]) {
        state.players[playerId].money = amount;
      }
    },
    undefined,
    "setMoney"
  );
};

const spendMoney =
  (set: Setter) =>
  (playerId: string, amount: number): boolean => {
    let success = false;
    set(
      (state) => {
        const player = state.players[playerId];
        if (player && player.money >= amount) {
          player.money -= amount;
          success = true;
        }
      },
      undefined,
      "spendMoney"
    );
    return success;
  };

const setBuildMode = (set: Setter) => (playerId: string, mode: BuildMode) => {
  set(
    (state) => {
      if (state.players[playerId]) {
        state.players[playerId].buildMode = mode;
        if (!mode) {
          state.players[playerId].hoverLocation = null;
        }
      }
    },
    undefined,
    "setBuildMode"
  );
};

const setPaintbrushMode = (set: Setter) => (enabled: boolean) => {
  set(
    (state) => {
      state.mapBuilder.isPaintbrushMode = enabled;
    },
    undefined,
    "setPaintbrushMode"
  );
};

const setSelectedTerrainType =
  (set: Setter) => (terrainType: TerrainType | null) => {
    set(
      (state) => {
        state.mapBuilder.selectedTerrainType = terrainType;
      },
      undefined,
      "setSelectedTerrainType"
    );
  };

const setSelectedPopulation =
  (set: Setter) => (population: Population | null) => {
    set(
      (state) => {
        state.mapBuilder.selectedPopulation = population;
      },
      undefined,
      "setSelectedPopulation"
    );
  };

const setHoverLocation =
  (set: Setter) =>
  (playerId: string, worldPoint: [number, number, number] | null) => {
    set(
      (state) => {
        if (state.players[playerId]) {
          state.players[playerId].hoverLocation = worldPoint
            ? { worldPoint }
            : null;
        }
      },
      undefined,
      "setHoverLocation"
    );
  };

const addBuildable =
  (set: Setter) =>
  (buildableData: BuildableData): boolean => {
    let success = false;
    set(
      (state) => {
        // For now, just use the first player
        const playerId = Object.keys(state.players)[0];
        const player = state.players[playerId];

        // Check if there's already a buildable at this location
        const existingBuildable = state.buildables.find((b) => {
          if (buildableData.coordinates && b.coordinates) {
            return b.coordinates.equals(buildableData.coordinates);
          }
          if (buildableData.cornerCoordinates && b.cornerCoordinates) {
            return b.cornerCoordinates.equals(buildableData.cornerCoordinates);
          }
          return false;
        });

        if (!existingBuildable && player) {
          const cost = buildableData.type === "power_pole" ? 1 : 5;
          if (player.money >= cost) {
            const id = nanoid(6);
            let buildable: Buildable;

            if (
              buildableData.type === "power_pole" &&
              buildableData.cornerCoordinates
            ) {
              const pole = new PowerPole(
                id,
                buildableData.cornerCoordinates,
                buildableData.isGhost
              );
              // Create connections with existing power poles
              const otherPoles = state.buildables.filter(
                (b): b is PowerPole => b instanceof PowerPole
              );
              pole.createConnections(otherPoles);
              buildable = pole;
            } else if (
              buildableData.type === "coal_plant" &&
              buildableData.coordinates
            ) {
              buildable = new CoalPlant(
                id,
                buildableData.coordinates,
                buildableData.isGhost
              );
            } else {
              throw new Error("Invalid buildable data");
            }

            state.buildables.push(buildable);
            player.money -= cost;
            success = true;
          }
        }
      },
      undefined,
      "addBuildable"
    );
    return success;
  };

const selectHex = (set: Setter) => (coordinates: HexCoordinates | null) => {
  set(
    (state) => {
      // For now, just use the first player
      const playerId = Object.keys(state.players)[0];
      if (state.players[playerId]) {
        state.players[playerId].selectedHexCoordinates = coordinates;
      }
    },
    undefined,
    "selectHex"
  );
};

const updateHexTerrain =
  (set: Setter) => (coordinates: HexCoordinates, terrainType: TerrainType) => {
    set(
      (state) => {
        const cell = state.hexGrid.getCell(coordinates);
        if (cell) {
          cell.terrainType = terrainType;
        }
      },
      undefined,
      "updateHexTerrain"
    );
  };

const updateHexPopulation =
  (set: Setter) => (coordinates: HexCoordinates, population: Population) => {
    set(
      (state) => {
        const cell = state.hexGrid.getCell(coordinates);
        if (cell) {
          cell.population = population;
        }
      },
      undefined,
      "updateHexPopulation"
    );
  };

export const useGameStore = create<GameState & Actions>()(
  devtools(
    immer((set) => ({
      isDebug: false,
      mapBuilder: {
        isPaintbrushMode: false,
        selectedTerrainType: null,
        selectedPopulation: null,
      },
      hexGrid: new HexGrid(10, 10),
      buildables: [],
      players: {
        player1: {
          money: 10,
          buildMode: null,
          hoverLocation: null,
          selectedHexCoordinates: null,
        },
      },

      setIsDebug: setIsDebug(set),
      setPaintbrushMode: setPaintbrushMode(set),
      setSelectedTerrainType: setSelectedTerrainType(set),
      setSelectedPopulation: setSelectedPopulation(set),
      exportHexGridToJSON: exportHexGridToJSON(set),
      importHexGridFromJSON: importHexGridFromJSON(set),
      addBuildable: addBuildable(set),
      setMoney: setMoney(set),
      spendMoney: spendMoney(set),
      setBuildMode: setBuildMode(set),
      setHoverLocation: setHoverLocation(set),
      selectHex: selectHex(set),
      updateHexTerrain: updateHexTerrain(set),
      updateHexPopulation: updateHexPopulation(set),
    }))
  )
);
