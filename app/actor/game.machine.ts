import { assign, setup, spawnChild, stopChild } from "xstate";
import { ActorKitStateMachine } from "actor-kit";
import { produce, current } from "immer";
import { nanoid } from "nanoid";

import { HexGridSchema } from "../lib/HexGrid";
import { GameContext, GameEvent, GameInput } from "./game.types";
import {
  createBuildable,
  validateBuildableLocation,
} from "@/lib/buildables/Buildable";
import { BUILDABLE_COSTS } from "@/lib/buildables/costs";
import hexGridData from "../../public/hexgrid.json";
import powerPlantBlueprintsData from "../../public/powerPlantBlueprints.json";
import { gameTimerActor } from "./gameTimerActor";
import { PowerSystem } from "@/lib/power/PowerSystem";
import { PowerPlantBlueprintsSchema } from "@/lib/buildables/schemas";
import {
  getNextInitiatorPlayerId,
  getNextBidderPlayerId,
  canPlayerAffordBid,
  shouldEndBidding,
  shouldEndAuction,
  processBlueprintWinner,
} from "@/lib/auction";
import { isPowerPlant } from "@/lib/buildables/PowerPlant";
import {
  initializeCommodityMarket,
  buyCommodity,
  sellCommodity,
  CommodityType,
} from "../lib/market/CommodityMarket";
import { PowerPlant } from "../lib/buildables/schemas";

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
        return canPlayerAffordBid(player, blueprint.startingPrice);
      }
      if (event.type === "AUCTION_PLACE_BID") {
        return canPlayerAffordBid(player, event.amount);
      }
      return false;
    },
    shouldEndBidding: ({ context }) => {
      return shouldEndBidding(context.public.players, context.public.auction!);
    },
    shouldEndAuction: ({ context }) => {
      return shouldEndAuction(context.public.players, context.public.auction!);
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

        // Update player income and power sold
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

        // Update fuel storage levels for power plants
        Object.entries(
          powerSystemResult.currentFuelStorageByPowerPlantId
        ).forEach(([plantId, fuelLevel]) => {
          const plantIndex = draft.buildables.findIndex(
            (b) => b.id === plantId && isPowerPlant(b)
          );
          if (plantIndex !== -1) {
            (draft.buildables[plantIndex] as any).currentFuelStorage =
              fuelLevel;
          }
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

            // Validate buildable location
            const validation = validateBuildableLocation(
              event.buildable,
              context.public.hexGrid,
              context.public.buildables,
              event.caller.id,
              draft.players[event.caller.id].blueprintsById
            );

            if (!validation.valid) {
              console.log("Invalid buildable location: ", {
                playerId: event.caller.id,
                buildable: event.buildable,
                reason: validation.reason,
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

            // If it's a power plant, remove the blueprint from the player's collection
            if (isPowerPlant(event.buildable)) {
              delete draft.players[event.caller.id].blueprintsById[
                event.buildable.id
              ];
            }
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
          // First auction has at least one blueprint per player
          Math.max(Object.keys(context.public.players).length, 3)
        );
        draft.auction = {
          currentBlueprint: null,
          availableBlueprints,
          purchases: [],
          // No passing allowed on the first auction
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
          if (event.type === "PASS_AUCTION" && draft.auction) {
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
    endBidding: assign(({ context }) => ({
      public: produce(context.public, (draft) => {
        const newAuctionState = processBlueprintWinner(
          context.public.players,
          context.public.auction!
        );
        if (!newAuctionState) return;

        // Update player money and blueprints
        const purchase =
          newAuctionState.purchases[newAuctionState.purchases.length - 1];
        draft.players[purchase.playerId].money -= purchase.price;
        draft.players[purchase.playerId].blueprintsById[purchase.blueprintId] =
          context.public.auction!.currentBlueprint!.blueprint;

        // Update auction state
        draft.auction = newAuctionState;
      }),
    })),
    buyCommodity: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => {
        if (event.type !== "BUY_COMMODITY") return context;

        const playerId = event.caller.id;
        const player = context.public.players[playerId];
        if (!player) return context;

        // Find the specific power plant by ID
        const powerPlant = context.public.buildables.find(
          (b) =>
            b.id === event.powerPlantId &&
            isPowerPlant(b) &&
            b.playerId === playerId
        ) as PowerPlant | undefined;

        if (!powerPlant) return context;

        // Check if the power plant can use this fuel type
        if (powerPlant.fuelType !== event.fuelType) return context;

        // Calculate available space in the fuel storage
        const availableStorage =
          (powerPlant.maxFuelStorage || 0) -
          (powerPlant.currentFuelStorage || 0);
        if (availableStorage <= 0) return context;

        // Calculate how much fuel we can actually buy
        const { updatedMarket, totalCost, fuelAmount } = buyCommodity(
          context.public.commodityMarket,
          event.fuelType,
          event.units
        );

        // Check if player has enough money
        if (player.money < totalCost) return context;

        // Calculate how much fuel we can actually store (might be limited by storage capacity)
        const actualFuelToAdd = Math.min(availableStorage, fuelAmount);

        // If we can't store any fuel, don't proceed with the purchase
        if (actualFuelToAdd <= 0) return context;

        // Calculate the actual cost based on how much fuel we're adding
        const actualCost = (actualFuelToAdd / fuelAmount) * totalCost;

        return {
          public: produce(context.public, (draft) => {
            // Update player's money
            draft.players[playerId].money -= actualCost;

            // Update power plant's fuel storage
            const plantIndex = draft.buildables.findIndex(
              (b) => b.id === powerPlant.id
            );
            if (plantIndex >= 0) {
              const plant = draft.buildables[plantIndex] as PowerPlant;
              plant.currentFuelStorage =
                (plant.currentFuelStorage || 0) + actualFuelToAdd;
            }

            // Update market state
            draft.commodityMarket = updatedMarket;
          }),
        };
      }
    ),

    sellCommodity: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => {
        if (event.type !== "SELL_COMMODITY") return context;

        const playerId = event.caller.id;
        const player = context.public.players[playerId];
        if (!player) return context;

        // Find the specific power plant by ID
        const powerPlant = context.public.buildables.find(
          (b) =>
            b.id === event.powerPlantId &&
            isPowerPlant(b) &&
            b.playerId === playerId
        ) as PowerPlant | undefined;

        if (!powerPlant) return context;

        // Check if the power plant has this fuel type
        if (powerPlant.fuelType !== event.fuelType) return context;

        // Check if the power plant has enough fuel to sell
        const currentFuel = powerPlant.currentFuelStorage || 0;
        if (currentFuel <= 0) return context;

        // Calculate how much fuel we can actually sell
        const { updatedMarket, totalProfit, fuelAmount } = sellCommodity(
          context.public.commodityMarket,
          event.fuelType,
          event.units
        );

        // Calculate how much fuel we can actually sell (might be limited by what we have)
        const actualFuelToSell = Math.min(currentFuel, fuelAmount);

        // If we don't have any fuel to sell, don't proceed
        if (actualFuelToSell <= 0) return context;

        // Calculate the actual profit based on how much fuel we're selling
        const actualProfit = (actualFuelToSell / fuelAmount) * totalProfit;

        return {
          public: produce(context.public, (draft) => {
            // Update player's money
            draft.players[playerId].money += actualProfit;

            // Update power plant's fuel storage
            const plantIndex = draft.buildables.findIndex(
              (b) => b.id === powerPlant.id
            );
            if (plantIndex >= 0) {
              const plant = draft.buildables[plantIndex] as PowerPlant;
              plant.currentFuelStorage = Math.max(
                0,
                (plant.currentFuelStorage || 0) - actualFuelToSell
              );
            }

            // Update market state
            draft.commodityMarket = updatedMarket;
          }),
        };
      }
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
      commodityMarket: initializeCommodityMarket(),
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
          always: {
            target: "#game.active",
            guard: "shouldEndAuction",
          },
          on: {
            INITIATE_BID: {
              actions: "auctionInitiateBid",
              target: "biddingOnBlueprint",
              guards: ["isCurrentInitiator", "canAffordBid"],
            },
            PASS_AUCTION: {
              actions: "auctionPass",
              guard: "isCurrentInitiator",
            },
          },
        },
        biddingOnBlueprint: {
          always: [
            {
              target: "initiatingBid",
              guard: "shouldEndBidding",
              actions: "endBidding",
            },
            {
              target: "#game.active",
              guard: "shouldEndAuction",
            },
          ],
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
        BUY_COMMODITY: {
          actions: "buyCommodity",
        },
        SELL_COMMODITY: {
          actions: "sellCommodity",
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
