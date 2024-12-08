import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import { WritableDraft } from "immer";
import { z } from "zod";

import { HexGrid, HexGridSchema, type HexGridData } from "../lib/HexGrid";
import { MapData } from "../lib/MapData";

interface GameState {
  isDebug: boolean;
  hexGrid: HexGrid;
}

type Setter = (
  state: (state: WritableDraft<GameState>) => void,
  shouldReplace?: false,
  name?: string
) => void;

// Actions

type Actions = {
  loadHexGrid: (mapData: MapData) => void;
  setIsDebug: (isDebug: boolean) => void;
  exportHexGridToJSON: () => void;
  importHexGridFromJSON: (jsonString: string) => void;
};

const loadHexGrid = (set: Setter) => (mapData: MapData) => {
  set(
    (state) => {
      state.hexGrid = new HexGrid(100, 60);
      state.hexGrid.constructFromMapData(mapData);
    },
    undefined,
    "loadHexGrid"
  );
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

const exportHexGridToJSON = (set: Setter) => (): void => {
  const state = useGameStore.getState();
  const exportData: HexGridData = {
    width: state.hexGrid.width,
    height: state.hexGrid.height,
    cells: state.hexGrid.cells.map((cell) => ({
      coordinates: {
        x: cell.coordinates.X,
        z: cell.coordinates.Z,
      },
      elevation: cell.elevation,
      waterLevel: cell.waterLevel,
      stateInfo: cell.stateInfo,
    })),
  };
  console.log(JSON.stringify(exportData, null, 2));
};

const importHexGridFromJSON = (set: Setter) => (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString);
    const validatedData = HexGridSchema.parse(data);

    set(
      (state) => {
        state.hexGrid = new HexGrid(validatedData.width, validatedData.height);
        validatedData.cells.forEach((cellData) => {
          const cell = state.hexGrid.cells.find(
            (c) =>
              c.coordinates.X === cellData.coordinates.x &&
              c.coordinates.Z === cellData.coordinates.z
          );
          if (cell) {
            cell.elevation = cellData.elevation;
            cell.waterLevel = cellData.waterLevel;
            cell.stateInfo = cellData.stateInfo;
          }
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

export const useGameStore = create<GameState & Actions>()(
  devtools(
    immer((set) => ({
      isDebug: false,
      hexGrid: new HexGrid(10, 10),

      loadHexGrid: loadHexGrid(set),
      setIsDebug: setIsDebug(set),
      exportHexGridToJSON: exportHexGridToJSON(set),
      importHexGridFromJSON: importHexGridFromJSON(set),
    }))
  )
);
