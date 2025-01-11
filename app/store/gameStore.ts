import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { nanoid } from "nanoid";
import { z } from "zod";
import { Buildable, BuildableType } from "../lib/Buildable";
import { CornerCoordinates } from "../lib/CornerCoordinates";
import { HexCell, Population, TerrainType } from "../lib/HexCell";
import { HexCoordinates } from "../lib/HexCoordinates";
import { HexGrid, HexGridSchema, type HexGridData } from "../lib/HexGrid";
import { CoalPlant } from "../lib/PowerPlants/CoalPlant";
import { PowerPole } from "../lib/PowerSystem";

export type BuildMode = null | {
  type: BuildableType;
};

interface Player {
  name: string;
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
  time: {
    totalTicks: number;
    isPaused: boolean;
  };
}

// Create the store with XState Store
export const gameStore = createStore({
  types: {
    emitted: {} as {
      type:
        | "buildableAdded"
        | "moneySpent"
        | "hexSelected"
        | "terrainUpdated"
        | "populationUpdated"
        | "timeIncremented";
      payload?: any;
    },
  },
  context: {
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
        name: "Player 1",
        money: 10,
        buildMode: null,
        hoverLocation: null,
        selectedHexCoordinates: null,
      },
    },
    time: {
      totalTicks: 0,
      isPaused: true,
    },
  } as GameState,
  on: {
    setIsDebug: (context, event: { value: boolean }) => ({
      isDebug: event.value,
    }),
    setPaintbrushMode: (context, event: { enabled: boolean }) => ({
      mapBuilder: {
        ...context.mapBuilder,
        isPaintbrushMode: event.enabled,
      },
    }),
    setSelectedTerrainType: (
      context,
      event: { terrainType: TerrainType | null }
    ) => ({
      mapBuilder: {
        ...context.mapBuilder,
        selectedTerrainType: event.terrainType,
      },
    }),
    setSelectedPopulation: (
      context,
      event: { population: Population | null }
    ) => ({
      mapBuilder: {
        ...context.mapBuilder,
        selectedPopulation: event.population,
      },
    }),
    addBuildable: (
      context,
      event: { buildableData: BuildableData },
      { emit }
    ) => {
      const player = context.players[event.buildableData.playerId];
      if (!player) return context;

      const existingBuildable = context.buildables.find((b) => {
        if (event.buildableData.coordinates && b.coordinates) {
          return b.coordinates.equals(event.buildableData.coordinates);
        }
        if (event.buildableData.cornerCoordinates && b.cornerCoordinates) {
          return b.cornerCoordinates.equals(
            event.buildableData.cornerCoordinates
          );
        }
        return false;
      });

      if (existingBuildable) return context;

      const cost = event.buildableData.type === "power_pole" ? 1 : 5;
      if (player.money < cost) return context;

      const id = nanoid(6);
      let buildable: Buildable;

      if (
        event.buildableData.type === "power_pole" &&
        event.buildableData.cornerCoordinates
      ) {
        const pole = new PowerPole(
          id,
          event.buildableData.cornerCoordinates,
          event.buildableData.playerId,
          event.buildableData.isGhost
        );
        const otherPoles = context.buildables.filter(
          (b): b is PowerPole => b instanceof PowerPole
        );
        pole.createConnections(otherPoles);
        buildable = pole;
      } else if (
        event.buildableData.type === "coal_plant" &&
        event.buildableData.coordinates
      ) {
        buildable = new CoalPlant(
          id,
          event.buildableData.coordinates,
          event.buildableData.playerId,
          event.buildableData.isGhost
        );
      } else {
        return context;
      }

      emit({ type: "buildableAdded", payload: buildable });

      return {
        buildables: [...context.buildables, buildable],
        players: {
          ...context.players,
          [event.buildableData.playerId]: {
            ...player,
            money: player.money - cost,
          },
        },
      };
    },
    setMoney: (context, event: { playerId: string; amount: number }) => {
      const player = context.players[event.playerId];
      if (!player) return context;

      return {
        players: {
          ...context.players,
          [event.playerId]: {
            ...player,
            money: event.amount,
          },
        },
      };
    },
    setBuildMode: (context, event: { playerId: string; mode: BuildMode }) => {
      const player = context.players[event.playerId];
      if (!player) return context;

      return {
        players: {
          ...context.players,
          [event.playerId]: {
            ...player,
            buildMode: event.mode,
            hoverLocation: event.mode ? player.hoverLocation : null,
          },
        },
      };
    },
    setHoverLocation: (
      context,
      event: { playerId: string; worldPoint: [number, number, number] | null }
    ) => {
      const player = context.players[event.playerId];
      if (!player) return context;

      return {
        players: {
          ...context.players,
          [event.playerId]: {
            ...player,
            hoverLocation: event.worldPoint
              ? { worldPoint: event.worldPoint }
              : null,
          },
        },
      };
    },
    selectHex: (
      context,
      event: { coordinates: HexCoordinates | null },
      { emit }
    ) => {
      const playerId = Object.keys(context.players)[0];
      const player = context.players[playerId];
      if (!player) return context;

      emit({ type: "hexSelected", payload: event.coordinates });

      return {
        players: {
          ...context.players,
          [playerId]: {
            ...player,
            selectedHexCoordinates: event.coordinates,
          },
        },
      };
    },
    updateHexTerrain: (
      context,
      event: { coordinates: HexCoordinates; terrainType: TerrainType },
      { emit }
    ) => {
      const cell = context.hexGrid.getCell(event.coordinates);
      if (!cell) return context;

      cell.terrainType = event.terrainType;
      emit({
        type: "terrainUpdated",
        payload: {
          coordinates: event.coordinates,
          terrainType: event.terrainType,
        },
      });

      return {
        hexGrid: context.hexGrid,
      };
    },
    updateHexPopulation: (
      context,
      event: { coordinates: HexCoordinates; population: Population },
      { emit }
    ) => {
      const cell = context.hexGrid.getCell(event.coordinates);
      if (!cell) return context;

      cell.population = event.population;
      emit({
        type: "populationUpdated",
        payload: {
          coordinates: event.coordinates,
          population: event.population,
        },
      });

      return {
        hexGrid: context.hexGrid,
      };
    },
    incrementTime: (context, _, { emit }) => {
      emit({ type: "timeIncremented", payload: context.time.totalTicks + 1 });

      return {
        time: {
          ...context.time,
          totalTicks: context.time.totalTicks + 1,
        },
      };
    },
    togglePause: (context) => ({
      time: {
        ...context.time,
        isPaused: !context.time.isPaused,
      },
    }),
    exportHexGridToJSON: (context) => {
      const exportData: HexGridData = {
        width: context.hexGrid.width,
        height: context.hexGrid.height,
        cells: context.hexGrid.cells.map((cell: HexCell) => ({
          coordinates: {
            x: cell.coordinates.x,
            z: cell.coordinates.z,
          },
          stateInfo: cell.stateInfo,
          terrainType: cell.terrainType,
          population: cell.population,
        })),
      };
      return context;
    },
    importHexGridFromJSON: (context, event: { jsonString: string }) => {
      try {
        const data = JSON.parse(event.jsonString);
        const validatedData = HexGridSchema.parse(data);
        const newHexGrid = new HexGrid(
          validatedData.width,
          validatedData.height
        );

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
          newHexGrid.addCell(
            cell,
            cellData.coordinates.x,
            cellData.coordinates.z
          );
        });

        return {
          hexGrid: newHexGrid,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Invalid HexGrid data:", error.errors);
        }
        return context;
      }
    },
  },
});

// Helper function for SSR compatibility
export const useGameStore = <T>(selector: (state: GameState) => T): T => {
  return useSelector(gameStore, (state) => selector(state.context));
};

export type BuildableData = {
  type: BuildableType;
  playerId: string;
  coordinates?: HexCoordinates;
  cornerCoordinates?: CornerCoordinates;
  isGhost?: boolean;
};
