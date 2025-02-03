import { createActorKitMockClient } from "actor-kit/test";

import { GameContext } from "@/actor/game.context";
import { GameMachine } from "@/actor/game.machine";
import { Game } from "@/components/Game";
import { HexGrid } from "@/lib/HexGrid";
import { PLAYER_ID } from "@/lib/constants";
import { clientStore } from "@/lib/clientState";
import { coordinatesToString } from "@/lib/coordinates/HexCoordinates";
import { z } from "zod";
import { GameClientEventSchema } from "@/actor/game.schemas";

import hexGrid from "@/../public/hexgrid.json";

type GameClientEvent = z.infer<typeof GameClientEventSchema>;

export default function MapEditor() {
  const client = createActorKitMockClient<GameMachine>({
    initialSnapshot: {
      public: {
        id: "map-editor",
        players: {
          [PLAYER_ID]: {
            name: "Map Editor",
            money: 1000,
            powerSoldKWh: 0,
          },
        },
        time: {
          totalTicks: 0,
          isPaused: true,
        },
        buildables: [],
        hexGrid: hexGrid as HexGrid,
      },
      private: {},
      value: "active",
    },
    onSend: (event: GameClientEvent) => {
      if (
        event.type === "UPDATE_HEX_TERRAIN" ||
        event.type === "UPDATE_HEX_POPULATION" ||
        event.type === "UPDATE_HEX_CITY"
      ) {
        const coordKey = coordinatesToString(event.coordinates);

        client.produce((draft) => {
          const cell = draft.public.hexGrid.cellsByHexCoordinates[coordKey];
          if (cell) {
            if (event.type === "UPDATE_HEX_TERRAIN") {
              cell.terrainType = event.terrainType;
            } else if (event.type === "UPDATE_HEX_POPULATION") {
              cell.population = event.population;
            } else if (event.type === "UPDATE_HEX_CITY") {
              cell.cityName = event.cityName;
            }
          }
        });
      }
    },
  });

  // Enable build mode
  clientStore.send({ type: "setIsDebug", isDebug: true });

  return (
    <GameContext.ProviderFromClient client={client}>
      <Game />
    </GameContext.ProviderFromClient>
  );
}
