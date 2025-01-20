import { assign, setup, spawnChild, stopChild } from "xstate";
import { ActorKitStateMachine } from "actor-kit";
import { produce, current } from "immer";
import { nanoid } from "nanoid";

import { HexGrid, HexGridSchema } from "../lib/HexGrid";
import { GameContext, GameEvent, GameInput } from "./game.types";
import { createBuildable } from "@/lib/buildables/Buildable";
import hexGridData from "../../public/hexgrid.json";
import { PLAYER_ID } from "@/lib/constants";
import { gameTimerActor } from "./gameTimerActor";
import { PowerSystem } from "@/lib/power/PowerSystem";

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
    input: {} as GameInput,
  },
  actors: {
    gameTimer: gameTimerActor,
  },
  actions: {
    startGameTimer: spawnChild(gameTimerActor, { id: "gameTimer" } as any),
    stopGameTimer: stopChild("gameTimer"),
    gameTick: assign(({ context }) => ({
      public: produce(context.public, (draft) => {
        draft.time.totalTicks += 1;

        // Calculate and distribute income for each player
        const powerSystem = new PowerSystem(
          current(draft.hexGrid),
          current(draft.buildables)
        );
        const powerSystemResult = powerSystem.resolveOneHourOfPowerProduction();
        Object.keys(powerSystemResult.incomePerPlayer).forEach((playerId) => {
          const income = powerSystemResult.incomePerPlayer[playerId] ?? 0;
          console.log(`Player ${playerId} income: ${income}`);
          draft.players[playerId].money += income;
        });
      }),
    })),
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
  initial: "active",
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
    active: {
      entry: ["stopGameTimer", "startGameTimer"],
      exit: ["stopGameTimer"],
      on: {
        ADD_BUILDABLE: {
          actions: "addBuildable",
        },
        TICK: {
          actions: "gameTick",
        },
        PAUSE: {
          target: "paused",
        },
        RESUME: {
          actions: ["stopGameTimer", "startGameTimer"],
        },
      },
    },
    paused: {
      on: {
        UNPAUSE: {
          target: "active",
        },
      },
    },
  },
}) satisfies ActorKitStateMachine<GameEvent, GameInput, GameContext>;

export type GameMachine = typeof gameMachine;
