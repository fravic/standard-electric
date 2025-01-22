import { createStore } from '@xstate/store';
import { useEffect, useState } from 'react';
import { HexCoordinates } from "../coordinates/HexCoordinates";
import { Population, TerrainType } from "../HexCell";
// import { BuildableType } from "../buildables/Buildable";

export type BuildMode = null | {
  type: string;
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

type Actions = {
  setIsDebug: (isDebug: boolean) => void;
  setPaintbrushMode: (enabled: boolean) => void;
  setSelectedTerrainType: (terrainType: TerrainType | null) => void;
  setSelectedPopulation: (population: Population | null) => void;
  setBuildMode: (mode: BuildMode) => void;
  setHoverLocation: (worldPoint: [number, number, number] | null) => void;
  selectHex: (coordinates: HexCoordinates | null) => void;
};

const store = createStore({
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
    setSelectedTerrainType: (context, event: { terrainType: TerrainType | null }) => ({
      mapBuilder: {
        ...context.mapBuilder,
        selectedTerrainType: event.terrainType,
      },
    }),
    setSelectedPopulation: (context, event: { population: Population | null }) => ({
      mapBuilder: {
        ...context.mapBuilder,
        selectedPopulation: event.population,
      },
    }),
    setBuildMode: (context, event: { mode: BuildMode }) => ({
      buildMode: event.mode,
    }),
    setHoverLocation: (context, event: { worldPoint: [number, number, number] | null }) => ({
      hoverLocation: event.worldPoint ? { worldPoint: event.worldPoint } : null,
    }),
    selectHex: (context, event: { coordinates: HexCoordinates | null }) => ({
      selectedHexCoordinates: event.coordinates,
    }),
  },
});

// Export a hook-like interface that matches the previous Zustand API
export const useClientStore = <T>(selector: (state: ClientState & Actions) => T): T => {
  // Use state to force re-render on store updates
  const [value, setValue] = useState(() => {
    const state = store.getSnapshot().context;
    const actions: Actions = {
      setIsDebug: (isDebug) => store.send({ type: 'setIsDebug', isDebug }),
      setPaintbrushMode: (enabled) => store.send({ type: 'setPaintbrushMode', enabled }),
      setSelectedTerrainType: (terrainType) => store.send({ type: 'setSelectedTerrainType', terrainType }),
      setSelectedPopulation: (population) => store.send({ type: 'setSelectedPopulation', population }),
      setBuildMode: (mode) => store.send({ type: 'setBuildMode', mode }),
      setHoverLocation: (worldPoint) => store.send({ type: 'setHoverLocation', worldPoint }),
      selectHex: (coordinates) => store.send({ type: 'selectHex', coordinates }),
    };
    return selector({ ...state, ...actions });
  });

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = store.subscribe((snapshot) => {
      const state = snapshot.context;
      const actions: Actions = {
        setIsDebug: (isDebug) => store.send({ type: 'setIsDebug', isDebug }),
        setPaintbrushMode: (enabled) => store.send({ type: 'setPaintbrushMode', enabled }),
        setSelectedTerrainType: (terrainType) => store.send({ type: 'setSelectedTerrainType', terrainType }),
        setSelectedPopulation: (population) => store.send({ type: 'setSelectedPopulation', population }),
        setBuildMode: (mode) => store.send({ type: 'setBuildMode', mode }),
        setHoverLocation: (worldPoint) => store.send({ type: 'setHoverLocation', worldPoint }),
        selectHex: (coordinates) => store.send({ type: 'selectHex', coordinates }),
      };
      const newValue = selector({ ...state, ...actions });
      if (newValue !== value) {
        setValue(newValue);
      }
    });

    return () => {
      unsubscribe.unsubscribe();
    };
  }, [selector, value]);

  return value;
};
