import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import { WritableDraft } from "immer";
import { z } from "zod";

import { HexGrid, HexGridSchema, type HexGridData } from "../lib/HexGrid";
import { MapData } from "../lib/MapData";
import { HexCell } from "../lib/HexCell";
import { HexCoordinates } from "../lib/HexCoordinates";

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
  makeNewHexGridFromMapData: (mapData: MapData) => void;
  setIsDebug: (isDebug: boolean) => void;
  exportHexGridToJSON: () => string;
  importHexGridFromJSON: (jsonString: string) => void;
};

const makeNewHexGridFromMapData = (set: Setter) => (mapData: MapData) => {
  set(
    (state) => {
      state.hexGrid = new HexGrid(100, 60);
      state.hexGrid.constructFromMapData(mapData);
    },
    undefined,
    "makeNewHexGridFromMapData"
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
      elevation: cell.elevation,
      waterLevel: cell.waterLevel,
      stateInfo: cell.stateInfo,
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
          cell.elevation = cellData.elevation;
          cell.waterLevel = cellData.waterLevel;
          cell.stateInfo = cellData.stateInfo;
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

export const useGameStore = create<GameState & Actions>()(
  devtools(
    immer((set) => ({
      isDebug: false,
      hexGrid: new HexGrid(10, 10),

      makeNewHexGridFromMapData: makeNewHexGridFromMapData(set),
      setIsDebug: setIsDebug(set),
      exportHexGridToJSON: exportHexGridToJSON(set),
      importHexGridFromJSON: importHexGridFromJSON(set),
    }))
  )
);
