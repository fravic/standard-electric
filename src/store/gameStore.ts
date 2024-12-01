import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import { WritableDraft } from "immer";

import { HexGrid } from "../lib/HexGrid";
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

export const useGameStore = create<GameState & Actions>()(
  devtools(
    immer((set) => ({
      isDebug: false,
      hexGrid: new HexGrid(10, 10),

      loadHexGrid: loadHexGrid(set),
      setIsDebug: setIsDebug(set),
    }))
  )
);
