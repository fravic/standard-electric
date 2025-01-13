import { assign, setup, fromPromise, DoneActorEvent } from "xstate";
import { ActorKitStateMachine } from "actor-kit";
import { produce } from "immer";

import { HexGrid, HexGridSchema } from "../lib/HexGrid";
import { GameContext, GameEvent, GameInput } from "./game.types";
import { HexCoordinates } from "@/lib/coordinates/HexCoordinates";
import { Buildable } from "@/lib/buildables/Buildable";
import { PLAYER_ID } from "@/lib/constants";

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
    input: {} as GameInput,
  },
  actors: {
    fetchHexGrid: fromPromise(async () => {
      const hexGridJson = await fetch("/public/hexgrid.json");
      const hexGrid = HexGridSchema.parse(await hexGridJson.json());
      return { hexGrid };
    }),
  },
  actions: {
    setHexGrid: assign(({ context }, { hexGrid }: { hexGrid: HexGrid }) => ({
      public: produce(context.public, (draft) => {
        draft.hexGrid = hexGrid;
      }),
    })),
    selectHex: assign(
      ({ context }, { coordinates }: { coordinates: HexCoordinates }) => ({
        public: produce(context.public, (draft) => {
          draft.players[PLAYER_ID].selectedHexCoordinates = coordinates;
        }),
      })
    ),
    addBuildable: assign(
      ({ context }, { buildable }: { buildable: Buildable }) => ({
        public: produce(context.public, (draft) => {
          draft.buildables.push(buildable);
        }),
      })
    ),
  },
}).createMachine({
  id: "game",
  initial: "lobby",
  context: ({ input }: { input: GameInput }) => ({
    public: {
      id: input.id,
      isDebug: false,
      mapBuilder: {
        isPaintbrushMode: false,
        selectedTerrainType: null,
        selectedPopulation: null,
      },
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
      buildables: [],
      hexGrid: {
        width: 0,
        height: 0,
        chunks: [],
        cellsByHexCoordinates: {},
        chunkCountX: 0,
        chunkCountZ: 0,
      },
    },
    private: {},
  }),
  states: {
    lobby: {
      on: {
        JOIN_GAME: "game",
      },
    },
    game: {
      initial: "loading",
      states: {
        loading: {
          invoke: {
            src: "fetchHexGrid",
            onDone: {
              target: "ready",
              actions: {
                type: "setHexGrid",
                params: ({
                  event,
                }: {
                  event: DoneActorEvent<{ hexGrid: HexGrid }>;
                }) => ({
                  hexGrid: event.output.hexGrid,
                }),
              },
            },
            onError: {
              target: "error",
            },
          },
        },
        ready: {
          on: {
            SELECT_HEX: {
              actions: {
                type: "selectHex",
                params: ({
                  event,
                }: {
                  event: Extract<GameEvent, { type: "SELECT_HEX" }>;
                }) => ({
                  coordinates: event.coordinates,
                }),
              },
            },
          },
        },
        error: {},
      },
      on: {
        LEAVE_GAME: "lobby",
      },
    },
  },
}) satisfies ActorKitStateMachine<GameEvent, GameInput, GameContext>;

export type GameMachine = typeof gameMachine;
