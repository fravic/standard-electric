import { createActorKitMockClient } from "actor-kit/test";
import { createContext, useContext } from "react";
import { z } from "zod";

import { GameContext } from "@/actor/game.context";
import { GameMachine } from "@/actor/game.machine";
import { Game } from "@/components/Game";
import { HexGrid } from "@/lib/HexGrid";
import { clientStore } from "@/lib/clientState";
import { coordinatesToString } from "@/lib/coordinates/HexCoordinates";
import { TerrainType, Population } from "@/lib/HexCell";
import { GameClientEventSchema } from "@/actor/game.schemas";
import { AuthContext } from "@/auth.context";
import { initializeCommodityMarket } from "@/lib/market/CommodityMarket";
import hexGrid from "@/../public/hexgrid.json";

type GameClientEvent = z.infer<typeof GameClientEventSchema>;

interface MapEditorContextType {
  updateRegionName: (
    coordinates: { x: number; z: number },
    regionName: string | null
  ) => void;
  updateHexTerrain: (
    coordinates: { x: number; z: number },
    terrainType: TerrainType
  ) => void;
  updateHexPopulation: (
    coordinates: { x: number; z: number },
    population: Population
  ) => void;
  updateHexCity: (
    coordinates: { x: number; z: number },
    cityName: string | null
  ) => void;
}

export const MapEditorContext = createContext<MapEditorContextType | null>(
  null
);

export function useMapEditor() {
  return (
    useContext(MapEditorContext) ?? {
      updateRegionName: () => {},
      updateHexTerrain: () => {},
      updateHexPopulation: () => {},
      updateHexCity: () => {},
    }
  );
}

export default function MapEditor() {
  const userId = AuthContext.useSelector((state) => state.userId);

  const client = createActorKitMockClient<GameMachine>({
    initialSnapshot: {
      public: {
        id: "map-editor",
        players: {
          [userId!]: {
            name: "Map Editor",
            money: 1000,
            powerSoldKWh: 0,
            blueprintsById: {},
            isHost: true,
            number: 0,
          },
        },
        time: {
          totalTicks: 0,
          isPaused: true,
        },
        buildables: [],
        hexGrid: hexGrid as HexGrid,
        auction: null,
        randomSeed: 0,
        commodityMarket: initializeCommodityMarket(),
      },
      private: {},
      value: "active",
    },
  });

  // Enable build mode
  clientStore.send({ type: "setIsDebug", isDebug: true });

  const mapEditorContext: MapEditorContextType = {
    updateRegionName: (coordinates, regionName) => {
      const coordKey = coordinatesToString(coordinates);
      client.produce((draft) => {
        const cell = draft.public.hexGrid.cellsByHexCoordinates[coordKey];
        if (cell) {
          cell.regionName = regionName;
        }
      });
    },
    updateHexTerrain: (coordinates, terrainType) => {
      const coordKey = coordinatesToString(coordinates);
      client.produce((draft) => {
        const cell = draft.public.hexGrid.cellsByHexCoordinates[coordKey];
        if (cell) {
          cell.terrainType = terrainType;
        }
      });
    },
    updateHexPopulation: (coordinates, population) => {
      const coordKey = coordinatesToString(coordinates);
      client.produce((draft) => {
        const cell = draft.public.hexGrid.cellsByHexCoordinates[coordKey];
        if (cell) {
          cell.population = population;
        }
      });
    },
    updateHexCity: (coordinates, cityName) => {
      const coordKey = coordinatesToString(coordinates);
      client.produce((draft) => {
        const cell = draft.public.hexGrid.cellsByHexCoordinates[coordKey];
        if (cell) {
          cell.cityName = cityName;
        }
      });
    },
  };

  return (
    <MapEditorContext.Provider value={mapEditorContext}>
      <GameContext.ProviderFromClient client={client}>
        <Game />
      </GameContext.ProviderFromClient>
    </MapEditorContext.Provider>
  );
}
