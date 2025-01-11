import { createStore } from 'zustand/vanilla'
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { HexGrid } from "../lib/HexGrid";

// Only create the store if we're on the client
const createClientStore = () => {
  if (typeof window === 'undefined') return null;
  
  return createStore(
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
        }
      }))
    )
  );
};

export const clientStore = createClientStore(); 