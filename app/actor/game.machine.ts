import { assign, setup, spawnChild, stopChild } from "xstate";
import { ActorKitStateMachine } from "actor-kit";
import { produce, current } from "immer";
import { nanoid } from "nanoid";

import { HexGridSchema } from "../lib/HexGrid";
import { GameContext, GameEvent, GameInput } from "./game.types";
import { createBuildable } from "@/lib/buildables/Buildable";
import { BUILDABLE_COSTS } from "@/lib/buildables/costs";
import hexGridData from "../../public/hexgrid.json";
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
  guards: {
    isHost: ({ context, event }) => {
      const playerId = event.caller.id;
      return context.public.players[playerId]?.isHost === true;
    },
  },
  actions: {
    joinGame: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "JOIN_GAME") {
            draft.players[event.caller.id] = {
              name: event.name,
              money: 100,
              powerSoldKWh: 0,
              isHost: Object.keys(draft.players).length === 0,
              blueprintsById: {
                // Temporary
                coal_plant_small: {
                  id: "coal_plant_small",
                  type: "coal_plant",
                  name: "Small Coal Plant",
                  powerGenerationKW: 1000,
                  startingPrice: 10,
                },
              },
            };
          }
        }),
      })
    ),
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
          const powerSoldKWh =
            powerSystemResult.powerSoldPerPlayerKWh[playerId] ?? 0;
          console.log(
            `Player ${playerId} income: ${income}, power sold: ${powerSoldKWh}`
          );
          draft.players[playerId].money += income;
          draft.players[playerId].powerSoldKWh += powerSoldKWh;
        });
      }),
    })),
    addBuildable: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "ADD_BUILDABLE") {
            // Check if player has enough money
            const cost = BUILDABLE_COSTS[event.buildable.type];
            if (draft.players[event.caller.id].money < cost) {
              console.log("Not enough money to build! ", {
                playerId: event.caller.id,
                cost,
                money: draft.players[event.caller.id].money,
              });
              return;
            }

            // Deduct cost and create buildable
            draft.players[event.caller.id].money -= cost;
            const buildable = createBuildable({
              buildable: event.buildable,
              playerId: event.caller.id,
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
      players: {},
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
    lobby: {
      on: {
        JOIN_GAME: {
          actions: "joinGame",
        },
        START_GAME: {
          target: "active",
          guard: "isHost",
        },
      },
    },
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
