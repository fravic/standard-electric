import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import { WritableDraft } from "immer";

import { HexCoordinates } from "../coordinates/HexCoordinates";
import { Population, TerrainType } from "../HexCell";
import { BuildableType } from "../buildables/schemas";

export type BuildMode = null | {
  type: BuildableType;
};

interface MapBuilder {
  isPaintbrushMode: boolean;
  selectedTerrainType: TerrainType | null;
  selectedPopulation: Population | null;
}

interface ClientState {
  isDebug: boolean;
  mapBuilder: MapBuilder;
  buildMode: BuildMode;
  hoverLocation: {
    worldPoint: [number, number, number];
  } | null;
  selectedHexCoordinates: HexCoordinates | null;
}

type Setter = (
  state: (state: WritableDraft<ClientState>) => void,
  shouldReplace?: false,
  name?: string
) => void;

// Actions

type Actions = {
  setIsDebug: (isDebug: boolean) => void;
  setPaintbrushMode: (enabled: boolean) => void;
  setSelectedTerrainType: (terrainType: TerrainType | null) => void;
  setSelectedPopulation: (population: Population | null) => void;
  setBuildMode: (mode: BuildMode) => void;
  setHoverLocation: (worldPoint: [number, number, number] | null) => void;
  selectHex: (coordinates: HexCoordinates | null) => void;
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

const setBuildMode = (set: Setter) => (mode: BuildMode) => {
  set(
    (state) => {
      state.buildMode = mode;
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
  (set: Setter) => (worldPoint: [number, number, number] | null) => {
    set(
      (state) => {
        state.hoverLocation = worldPoint ? { worldPoint } : null;
      },
      undefined,
      "setHoverLocation"
    );
  };

const selectHex = (set: Setter) => (coordinates: HexCoordinates | null) => {
  set(
    (state) => {
      state.selectedHexCoordinates = coordinates;
    },
    undefined,
    "selectHex"
  );
};

export const useClientStore = create<ClientState & Actions>()(
  devtools(
    immer((set) => ({
      isDebug: false,
      mapBuilder: {
        isPaintbrushMode: false,
        selectedTerrainType: null,
        selectedPopulation: null,
      },
      buildMode: null,
      hoverLocation: null,
      selectedHexCoordinates: null,
      setIsDebug: setIsDebug(set),
      setPaintbrushMode: setPaintbrushMode(set),
      setSelectedTerrainType: setSelectedTerrainType(set),
      setSelectedPopulation: setSelectedPopulation(set),
      setBuildMode: setBuildMode(set),
      setHoverLocation: setHoverLocation(set),
      selectHex: selectHex(set),
    }))
  )
);
