import { createStore } from "@xstate/store";
import { HexCoordinates } from "../coordinates/HexCoordinates";
import { Population, TerrainType } from "../HexCell";

type BuildMode = {
  blueprintId: string;
};

interface MapBuilder {
  isPaintbrushMode: boolean;
  selectedTerrainType: TerrainType | null;
  selectedPopulation: Population | null;
}

interface ClientState {
  isDebug: boolean;
  mapBuilder: MapBuilder;
  buildMode: BuildMode | null;
  hoverLocation: {
    worldPoint: [number, number, number];
  } | null;
  selectedHexCoordinates: HexCoordinates | null;
  hoveringHexCoordinates: HexCoordinates | null;
  areKeyboardControlsActive: boolean;
}

export const clientStore = createStore({
  context: {
    isDebug: false,
    mapBuilder: {
      isPaintbrushMode: false,
      selectedTerrainType: null,
      selectedPopulation: null,
    },
    buildMode: null,
    hoverLocation: null,
    selectedHexCoordinates: null,
    hoveringHexCoordinates: null,
    areKeyboardControlsActive: true,
  } as ClientState,
  on: {
    setIsDebug: (context, event: { isDebug: boolean }) => ({
      isDebug: event.isDebug,
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
    setBuildMode: (context, event: { mode: BuildMode }) => ({
      buildMode: event.mode,
    }),
    setHoverLocation: (
      context,
      event: { worldPoint: [number, number, number] | null }
    ) => ({
      hoverLocation: event.worldPoint ? { worldPoint: event.worldPoint } : null,
    }),
    selectHex: (context, event: { coordinates: HexCoordinates | null }) => ({
      selectedHexCoordinates: event.coordinates,
    }),
    setKeyboardControlsActive: (context, event: { active: boolean }) => ({
      areKeyboardControlsActive: event.active,
    }),
    setHoveringHex: (
      context,
      event: { coordinates: HexCoordinates | null }
    ) => ({
      hoveringHexCoordinates: event.coordinates,
    }),
  },
});
