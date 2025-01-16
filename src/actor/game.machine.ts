import { assign, setup } from "xstate";
import { ActorKitStateMachine } from "actor-kit";
import { produce } from "immer";
import { nanoid } from "nanoid";

import { HexGrid, HexGridSchema } from "../lib/HexGrid";
import { GameContext, GameEvent, GameInput } from "./game.types";
import { createBuildable } from "@/lib/buildables/Buildable";
import hexGridData from "../../public/hexgrid.json";
import { PLAYER_ID } from "@/lib/constants";

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
    input: {} as GameInput,
  },
  actions: {
    addBuildable: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "ADD_BUILDABLE") {
            const buildable = createBuildable({
              id: nanoid(),
              buildable: event.buildable,
              playerId: PLAYER_ID,
              isGhost: false,
              context: context,
            });
            draft.buildables.push(buildable);
          }
        }),
      })
    ),
  },
}).createMachine({
  id: "game",
  initial: "game",
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
        [PLAYER_ID]: {
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
      hexGrid: HexGridSchema.parse(hexGridData),
    },
    private: {},
  }),
  states: {
    game: {
      on: {
        ADD_BUILDABLE: {
          actions: "addBuildable",
        },
      },
    },
  },
}) satisfies ActorKitStateMachine<GameEvent, GameInput, GameContext>;

export type GameMachine = typeof gameMachine;
