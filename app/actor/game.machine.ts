import { assign, setup } from "xstate";
import { ActorKitStateMachine } from "actor-kit";

import { HexGrid } from "../lib/HexGrid";
import { GameContext, GameEvent, GameInput } from "./game.types";

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
    input: {} as GameInput,
  },
  actions: {
    setDebug: assign({}),
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
      on: {
        LEAVE_GAME: "lobby",
      },
    },
  },
}) satisfies ActorKitStateMachine<GameEvent, GameInput, GameContext>;

export type GameMachine = typeof gameMachine;
