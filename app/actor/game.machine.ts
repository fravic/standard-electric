import { assign, setup, spawnChild, stopChild } from "xstate";
import { ActorKitStateMachine } from "actor-kit";
import { produce, current } from "immer";
import { nanoid } from "nanoid";

import { HexGridSchema } from "../lib/HexGrid";
import { GameContext, GameEvent, GameInput } from "./game.types";
import { createBuildable } from "@/lib/buildables/Buildable";
import { BUILDABLE_COSTS } from "@/lib/buildables/costs";
import hexGridData from "../../public/hexgrid.json";
import powerPlantBlueprintsData from "../../public/powerPlantBlueprints.json";
import { gameTimerActor } from "./gameTimerActor";
import { PowerSystem } from "@/lib/power/PowerSystem";
import { PowerPlantBlueprintsSchema } from "@/lib/buildables/schemas";
import { getNextInitiatorPlayerId, getNextBidderPlayerId } from "@/lib/auction";

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
    isCurrentBidder: ({ context, event }) => {
      if (!context.public.auction || !context.public.auction.currentBlueprint) {
        return false;
      }
      const playerId = event.caller.id;
      return (
        getNextBidderPlayerId(
          context.public.players,
          context.public.auction,
          context.public.time.totalTicks,
          context.public.randomSeed
        ) === playerId
      );
    },
    isCurrentInitiator: ({ context, event }) => {
      if (!context.public.auction) return false;
      const playerId = event.caller.id;
      return (
        getNextInitiatorPlayerId(
          context.public.players,
          context.public.auction,
          context.public.time.totalTicks,
          context.public.randomSeed
        ) === playerId
      );
    },
    canAffordBid: ({ context, event }) => {
      const player = context.public.players[event.caller.id];
      if (!player) return false;

      if (event.type === "INITIATE_BID") {
        const blueprint = context.public.auction!.availableBlueprints.find(
          (b) => b.id === event.blueprintId
        );
        if (!blueprint) return false;
        return player.money >= blueprint.startingPrice;
      }
      if (event.type === "AUCTION_PLACE_BID") {
        return player.money >= event.amount;
      }
      return false;
    },
  },
  actions: {
    joinGame: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "JOIN_GAME") {
            draft.players[event.caller.id] = {
              name: event.name,
              number: Object.keys(draft.players).length + 1,
              money: 100,
              powerSoldKWh: 0,
              isHost: Object.keys(draft.players).length === 0,
              blueprintsById: {},
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

    // Auctions
    startAuction: assign(({ context }: { context: GameContext }) => ({
      public: produce(context.public, (draft) => {
        // TODO: Should set up a different set of blueprints each auction. Only one auction for now.
        const powerPlantBlueprints = PowerPlantBlueprintsSchema.parse(
          powerPlantBlueprintsData.blueprints
        );
        const availableBlueprints = Object.values(powerPlantBlueprints).slice(
          0,
          3
        );
        draft.auction = {
          currentBlueprint: null,
          availableBlueprints,
          purchases: [],
          isPassingAllowed: false,
          passedPlayerIds: [],
        };
      }),
    })),
    auctionInitiateBid: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "INITIATE_BID" && draft.auction) {
            const blueprint = draft.auction.availableBlueprints.find(
              (b) => b.id === event.blueprintId
            );
            if (!blueprint) return;

            draft.auction.currentBlueprint = {
              blueprint,
              bids: [
                {
                  playerId: event.caller.id,
                  amount: blueprint.startingPrice,
                },
              ],
            };
          }
        }),
      })
    ),
    auctionPass: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "AUCTION_PASS_BID" && draft.auction) {
            draft.auction.passedPlayerIds.push(event.caller.id);
          }
        }),
      })
    ),
    auctionPlaceBid: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "AUCTION_PLACE_BID" && draft.auction) {
            // Add bid to existing auction
            draft.auction.currentBlueprint!.bids.push({
              playerId: event.caller.id,
              amount: event.amount,
            });
          }
        }),
      })
    ),
    auctionPassBid: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (
            event.type === "AUCTION_PASS_BID" &&
            draft.auction?.currentBlueprint
          ) {
            // Add pass bid to the current blueprint's bids
            draft.auction.currentBlueprint.bids.push({
              playerId: event.caller.id,
              passed: true,
            });
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
      auction: null,
      randomSeed: Math.floor(Math.random() * 1000000),
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
          target: "auction",
          guard: "isHost",
        },
      },
    },
    auction: {
      entry: ["startAuction"],
      initial: "initiatingBid",
      states: {
        initiatingBid: {
          on: {
            INITIATE_BID: {
              actions: "auctionInitiateBid",
              target: "biddingOnBlueprint",
              guards: ["isCurrentInitiator", "canAffordBid"],
            },
            PASS_BID: {
              actions: "auctionPass",
              guard: "isCurrentInitiator",
            },
          },
        },
        biddingOnBlueprint: {
          on: {
            AUCTION_PLACE_BID: {
              actions: "auctionPlaceBid",
              guards: ["isCurrentBidder", "canAffordBid"],
            },
            AUCTION_PASS_BID: {
              actions: "auctionPassBid",
              guards: ["isCurrentBidder"],
            },
          },
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
