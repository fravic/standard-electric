import { assign, setup, spawnChild, stopChild } from "xstate";
import { ActorKitStateMachine } from "actor-kit";
import { produce, current } from "immer";

import { HexGridSchema } from "../lib/HexGrid";
import { GameContext, GameEvent, GameInput } from "./game.types";
import hexGridData from "../../public/hexgrid.json";
import powerPlantBlueprintsData from "../../public/powerPlantBlueprints.json";
import { gameTimerActor } from "./gameTimerActor";
import { PowerSystem } from "@/lib/power/PowerSystem";
import { Entity, EntitySchema } from "@/ecs/entity";
import {
  getNextInitiatorPlayerId,
  getNextBidderPlayerId,
  canPlayerAffordBid,
  shouldEndBidding,
  shouldEndAuction,
  processBlueprintWinner,
} from "@/lib/auction";
import {
  initializeCommodityMarket,
  buyFuelForPowerPlant,
  sellFuelFromPowerPlant,
} from "../lib/market/CommodityMarket";
import { precomputeHexCellResources, SERVER_ONLY_ID, startSurvey, updateSurveys } from "../lib/surveys";
import { validateBuildableLocation } from "../lib/buildables/validateBuildableLocation";
import { createDefaultBlueprintsForPlayer, createEntityFromBlueprint, createWorldWithEntities } from "@/ecs/factories";
import { With } from "miniplex";
import { findPossibleConnectionsWithWorld } from "@/lib/buildables/findPossibleConnections";

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

      const nextBidderId = getNextBidderPlayerId(
        context.public.players,
        context.public.auction,
        context.public.time.totalTicks,
        context.public.randomSeed
      );
      return nextBidderId === event.caller.id;
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
      if (
        !context.public.auction ||
        !context.public.auction.currentBlueprint ||
        event.type !== "AUCTION_PLACE_BID"
      ) {
        return false;
      }

      const player = context.public.players[event.caller.id];
      if (!player) return false;

      return canPlayerAffordBid(player, event.amount);
    },
    shouldEndBidding: ({ context }) => {
      return shouldEndBidding(context.public.players, context.public.auction!);
    },
    shouldEndAuction: ({ context }) => {
      return shouldEndAuction(context.public.players, context.public.auction!);
    },
    isValidBuildableLocation: ({ context, event }) => {
      if (event.type !== "ADD_BUILDABLE") {
        return false;
      }

      const playerId = event.caller.id;
      const blueprintId = event.blueprintId;
      const playerPrivateContext = context.private[playerId];

      const blueprintEntity = context.public.entitiesById[blueprintId];
      if (blueprintEntity.owner?.playerId !== playerId) {
        throw new Error(`Player ${playerId} is not the owner of blueprint ${blueprintId}`);
      }

      if (!blueprintEntity) {
        return false;
      }

      const buildable = createEntityFromBlueprint(blueprintEntity as With<Entity, 'blueprint'>, event.options);

      if (!playerPrivateContext?.surveyResultByHexCell) {
        return false;
      }

      // Create a set of surveyed hex cells
      const surveyedHexCells = new Set<string>();
      Object.entries(playerPrivateContext.surveyResultByHexCell).forEach(
        ([coordString, survey]) => {
          if (survey?.isComplete) {
            surveyedHexCells.add(coordString);
          }
        }
      );

      // Check if the location is valid according to validateBuildableLocation
      const world = createWorldWithEntities(context.public.entitiesById);
      const validation = validateBuildableLocation({
        buildable,
        grid: context.public.hexGrid,
        world,
        playerId,
        surveyedHexCells,
      });

      return validation.valid;
    },
  },
  actions: {
    joinGame: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => {
        if (event.type !== "JOIN_GAME") return context;

        const playerId = event.caller.id;

        // Initialize private context for the player
        const updatedPrivate = { ...context.private };
        updatedPrivate[playerId] = { surveyResultByHexCell: {} };

        return {
          public: produce(context.public, (draft) => {
            draft.players[playerId] = {
              name: event.name,
              number: Object.keys(draft.players).length + 1,
              money: 100,
              powerSoldKWh: 0,
              isHost: Object.keys(draft.players).length === 0,
            };
            // Create default blueprints for each player
            const defaultBlueprints = createDefaultBlueprintsForPlayer(playerId);
            defaultBlueprints.forEach(blueprint => {
              draft.entitiesById[blueprint.id] = blueprint;
            });
          }),
          private: updatedPrivate,
        };
      }
    ),
    startGameTimer: spawnChild(gameTimerActor, { id: "gameTimer" } as any),
    stopGameTimer: stopChild("gameTimer"),
    gameTick: assign(({ context }) => {
      return {
        public: produce(context.public, (draft) => {
          const world = createWorldWithEntities(current(draft.entitiesById));
          draft.time.totalTicks += 1;

          // TODO: Change how we update the draft here

          // Calculate and distribute income for each player
          const powerSystem = new PowerSystem(
            current(draft.hexGrid),
            world
          );
          const powerSystemResult =
            powerSystem.resolveOneHourOfPowerProduction();

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
            if (!draft.entitiesById[plantId].fuelStorage) return;
            draft.entitiesById[plantId].fuelStorage = {
              ...draft.entitiesById[plantId].fuelStorage,
              currentFuelStorage: fuelLevel
            };
          });
        }),
        private: produce(context.private, (draft) => {
          // Process all player's surveys
          const precomputedResources =
            context.private[SERVER_ONLY_ID]!.hexCellResources!;
          Object.keys(draft).forEach((playerId) => {
            // Skip the server-only player
            if (playerId === SERVER_ONLY_ID) return;

            if (draft[playerId]?.surveyResultByHexCell) {
              // Update the player's surveys using the updateSurveys function
              draft[playerId].surveyResultByHexCell = updateSurveys(
                draft[playerId].surveyResultByHexCell,
                context.public.time.totalTicks + 1, // Use the updated tick value
                precomputedResources
              );
            }
          });
        }),
      };
    }),
    addBuildable: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "ADD_BUILDABLE") {
            const world = createWorldWithEntities(draft.entitiesById);
            const blueprintEntity = context.public.entitiesById[event.blueprintId] as With<Entity, 'blueprint'>;
            if (blueprintEntity.owner?.playerId !== event.caller.id) {
              throw new Error(`Player ${event.caller.id} is not the owner of blueprint ${event.blueprintId}`);
            }

            // Check if player has enough money
            const cost = blueprintEntity.cost?.amount ?? 0;
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
            const entity = createEntityFromBlueprint(blueprintEntity, {
              ...event.options,
              connections: blueprintEntity.blueprint.components.connections ? { ...event.options.connections, connectedToIds: findPossibleConnectionsWithWorld(world, event.options.cornerPosition!.cornerCoordinates, event.caller.id) } : undefined
            });
            draft.entitiesById[entity.id] = entity;

            if (blueprintEntity.blueprint.buildsRemaining) {
              const buildsRemaining = blueprintEntity.blueprint.buildsRemaining - 1;
              if (buildsRemaining <= 0) {
                delete draft.entitiesById[blueprintEntity.id];
              } else {
                draft.entitiesById[blueprintEntity.id] = {
                  ...draft.entitiesById[blueprintEntity.id],
                  blueprint: {
                    ...blueprintEntity.blueprint,
                    buildsRemaining,
                  },
                };
              }
            }
          }
        }),
      })
    ),

    // Auctions
    startAuction: assign(({ context }: { context: GameContext }) => ({
      public: produce(context.public, (draft) => {
        // TODO: Should set up a different set of blueprints each auction. Only one auction for now.
        // Parse the entities from the JSON file using the EntitySchema
        const powerPlantEntities = (powerPlantBlueprintsData as any[]).map(blueprint => 
          EntitySchema.parse(blueprint)
        );
        const availableEntities = powerPlantEntities.slice(
          0,
          // First auction has at least one blueprint per player
          Math.max(Object.keys(context.public.players).length, 3)
        );
        
        // Store the entities in entitiesById
        const entitiesById = availableEntities.reduce((acc, entity) => {
          acc[entity.id] = entity;
          return acc;
        }, {} as Record<string, Entity>);
        
        draft.auction = {
          currentBlueprint: null,
          availableBlueprintIds: availableEntities.map(entity => entity.id),
          purchases: [],
          // No passing allowed on the first auction
          isPassingAllowed: false,
          passedPlayerIds: [],
        };
        draft.entitiesById = {
          ...draft.entitiesById,
          ...entitiesById
        };
      }),
    })),
    auctionInitiateBid: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "INITIATE_BID" && draft.auction) {
            const blueprintId = event.blueprintId;
            const blueprint = draft.entitiesById[blueprintId];
            if (!blueprint) return;

            draft.auction.currentBlueprint = {
              blueprintId,
              bids: [
                {
                  playerId: event.caller.id,
                  amount: blueprint.cost?.amount || 0,
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
        draft.entitiesById[purchase.blueprintId].owner = {
          playerId: purchase.playerId,
        };

        // Update auction state
        draft.auction = newAuctionState;
      }),
    })),
    // Commodity Market
    buyCommodity: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => {
        if (event.type !== "BUY_COMMODITY") return context;
        return {
          public: produce(context.public, (draft) => {
            const playerId = event.caller.id;
            const player = context.public.players[playerId];
            if (!player) return;

            // Find the specific power plant by ID
            const powerPlant = context.public.entitiesById[event.powerPlantId];
            if (powerPlant?.owner?.playerId !== playerId) {
              throw new Error(`Player ${playerId} is not the owner of power plant ${event.powerPlantId}`);
            }
            if (!powerPlant) return;

            // Use the new function to handle the purchase
            const result = buyFuelForPowerPlant({
              market: context.public.commodityMarket,
              powerPlant,
              fuelType: event.fuelType,
              units: event.units,
              playerMoney: player.money,
            });

            // If the purchase wasn't successful, return early
            if (!result.success) return;

            // Update player's money
            draft.players[playerId].money -= result.actualCost;

            // Update power plant's fuel storage
            if (powerPlant.fuelStorage) {
              draft.entitiesById[powerPlant.id] = {
                ...draft.entitiesById[powerPlant.id],
                fuelStorage: {
                  ...powerPlant.fuelStorage,
                  currentFuelStorage: (powerPlant.fuelStorage.currentFuelStorage || 0) + result.actualFuelAdded,
                },
              };
            }

            // Update market state
            draft.commodityMarket = result.updatedMarket;
          }),
        };
      }
    ),

    sellCommodity: assign(({ context, event }) => {
      if (event.type !== "SELL_COMMODITY") return context;
      return {
        public: produce(context.public, (draft) => {
          const playerId = event.caller.id;
          const { powerPlantId } = event;

          // Find the specific power plant by ID
          const powerPlant = context.public.entitiesById[powerPlantId] as With<Entity, 'owner'>;

          if (powerPlant.owner?.playerId !== playerId) {
            throw new Error(`Player ${playerId} is not the owner of power plant ${powerPlantId}`);
          }

          if (!powerPlant) return;

          // Use the new function to handle the sale
          const result = sellFuelFromPowerPlant({
            market: context.public.commodityMarket,
            powerPlant,
            fuelType: event.fuelType,
            units: event.units,
          });

          // If the sale wasn't successful, return early
          if (!result.success) return;

          // Update power plant's fuel storage
          if (powerPlant.fuelStorage) {
            draft.entitiesById[powerPlant.id] = {
              ...draft.entitiesById[powerPlant.id],
              fuelStorage: {
                ...powerPlant.fuelStorage,
                currentFuelStorage: (powerPlant.fuelStorage.currentFuelStorage || 0) - result.actualFuelRemoved,
              },
            };
          }

          // Update player's money and market state
          draft.players[playerId].money += result.totalProfit;
          draft.commodityMarket = result.updatedMarket;
        }),
      };
    }),
    surveyHexTile: assign(({ context, event }) => {
      if (event.type !== "SURVEY_HEX_TILE") return context;
      return {
        private: produce(context.private, (draft) => {
          const playerId = event.caller.id;

          // Initialize private context for this player if it doesn't exist
          if (!draft[playerId]) {
            draft[playerId] = { surveyResultByHexCell: {} };
          }

          // Try to start a new survey
          const playerSurveys = draft[playerId].surveyResultByHexCell;
          const updatedSurveys = startSurvey(
            playerSurveys,
            event.coordinates,
            context.public.time.totalTicks
          );
          draft[playerId].surveyResultByHexCell = updatedSurveys;
        }),
      };
    }),
    precomputeResources: assign(({ context }) => {
      // Precompute resources for all hex cells
      return {
        private: produce(context.private, (draft) => {
          const hexCellResources = precomputeHexCellResources(
            context.public.hexGrid,
            context.public.randomSeed
          );
          draft[SERVER_ONLY_ID] = {
            surveyResultByHexCell: {},
            hexCellResources,
          };
        }),
      };
    }),
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
      entitiesById: {},
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
          actions: "precomputeResources",
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
          guard: "isValidBuildableLocation",
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
        SURVEY_HEX_TILE: {
          actions: "surveyHexTile",
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
