import { assign, setup, spawnChild, stopChild } from "xstate";
import { ActorKitStateMachine } from "actor-kit";
import { produce, current } from "immer";

import { HexGridSchema } from "../lib/HexGrid";
import { GameContext, GameEvent, GameInput } from "./game.types";
import hexGridData from "../../public/hexgrid.json";
import { gameTimerActor } from "./gameTimerActor";
import { PowerSystem } from "@/ecs/systems/PowerSystem";
import { AuctionSystem } from "@/ecs/systems/AuctionSystem";
import { Entity, EntitySchema } from "@/ecs/entity";
import {
  initializeCommodityMarket,
  buyFuelForPowerPlant,
  sellFuelFromPowerPlant,
} from "../lib/market/CommodityMarket";
import { SurveySystem, SurveyContext, HexCellResource, SERVER_ONLY_ID } from "@/ecs/systems/SurveySystem";
import { validateBuildableLocation } from "../lib/buildables/validateBuildableLocation";
import { createDefaultBlueprintsForPlayer, createEntityFromBlueprint, createWorldWithEntities } from "@/ecs/factories";
import { With } from "miniplex";
import { findPossibleConnectionsWithWorld } from "@/lib/buildables/findPossibleConnections";
import { createDefaultContext } from "./createDefaultContext";

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
      
      const auctionSystem = new AuctionSystem();
      const auctionContext = {
        gameTime: context.public.time.totalTicks,
        totalTicks: context.public.time.totalTicks,
        players: context.public.players,
        auction: context.public.auction,
        randomSeed: context.public.randomSeed
      };
      
      const nextBidderId = auctionSystem.getNextBidder(auctionContext);
      return nextBidderId === event.caller.id;
    },
    isCurrentInitiator: ({ context, event }) => {
      if (!context.public.auction) return false;
      const playerId = event.caller.id;
      
      const auctionSystem = new AuctionSystem();
      const auctionContext = {
        gameTime: context.public.time.totalTicks,
        totalTicks: context.public.time.totalTicks,
        players: context.public.players,
        auction: context.public.auction,
        randomSeed: context.public.randomSeed
      };
      
      return auctionSystem.getNextInitiator(auctionContext) === playerId;
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
      
      return player.money >= event.amount;
    },
    shouldEndBidding: ({ context }) => {
      if (!context.public.auction) return false;
      
      const auctionSystem = new AuctionSystem();
      const auctionContext = {
        totalTicks: context.public.time.totalTicks,
        players: context.public.players,
        auction: context.public.auction,
        randomSeed: context.public.randomSeed
      };
      
      return auctionSystem.shouldEndBidding(auctionContext);
    },
    shouldEndAuction: ({ context }) => {
      if (!context.public.auction) return false;
      
      const auctionSystem = new AuctionSystem();
      const auctionContext = {
        totalTicks: context.public.time.totalTicks,
        players: context.public.players,
        auction: context.public.auction,
        randomSeed: context.public.randomSeed
      };
      
      return auctionSystem.shouldEndAuction(auctionContext);
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

      // Check if the location is valid according to validateBuildableLocation
      const world = createWorldWithEntities(context.public.entitiesById, playerPrivateContext.entitiesById);
      const validation = validateBuildableLocation({
        buildable,
        grid: context.public.hexGrid,
        world,
        playerId,
      });

      if (!validation.valid) {
        console.error("Invalid buildable location:", validation.reason);
      }

      return validation.valid;
    },
  },
  actions: {
    joinGame: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => {
        if (event.type !== "JOIN_GAME") return context;

        const playerId = event.caller.id;

        // Initialize private context for the player
        const updatedPrivate = { ...context.private, [playerId]: { entitiesById: {} } };

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
      return produce(context, (contextDraft) => {
        // Increment the tick count
        contextDraft.public.time.totalTicks += 1;
        
        // Create a new Miniplex world from the entities
        const publicWorld = createWorldWithEntities(contextDraft.public.entitiesById, {});

        // Power system update and mutate
        const powerSystem = new PowerSystem();
        
        // Create the PowerContext object
        const powerContext = {
          gameTime: contextDraft.public.time.totalTicks,
          hexGrid: current(contextDraft.public.hexGrid)
        };
        
        // Use the update() method to get the power system results
        const powerSystemResult = powerSystem.update(publicWorld, powerContext);

        // Use the mutate() method to update the game context
        powerSystem.mutate(powerSystemResult, contextDraft);

        // Process each player's surveys
        Object.keys(context.public.players).forEach((playerId) => {
          const privateWorld = createWorldWithEntities(contextDraft.public.entitiesById, contextDraft.private[playerId].entitiesById);
          const surveySystem = new SurveySystem();
          const surveyContext: SurveyContext = {
            playerId,
            currentTick: contextDraft.public.time.totalTicks, // Use the updated tick value
            hexGrid: contextDraft.public.hexGrid,
            randomSeed: contextDraft.public.randomSeed,
            precomputedResources: contextDraft.private[SERVER_ONLY_ID]?.hexCellResources || {}
          };
          surveySystem.initialize(privateWorld, surveyContext);
          const surveyResult = surveySystem.update(privateWorld, surveyContext);
          surveySystem.mutate(surveyResult, contextDraft);
        });
      });
    }),
    addBuildable: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "ADD_BUILDABLE") {
            const world = createWorldWithEntities(draft.entitiesById, context.private[event.caller.id].entitiesById);
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
    startAuction: assign(({ context }: { context: GameContext }) => produce(context, (draft) => {    
      const auctionSystem = new AuctionSystem();
      const auctionContext = {
        totalTicks: context.public.time.totalTicks,
        players: context.public.players,
        auction: context.public.auction,
        randomSeed: context.public.randomSeed
      };
      const result = auctionSystem.startAuction(auctionContext, false); // No passing allowed on the first auction
      auctionSystem.mutate(result, draft);
    })),
    auctionInitiateBid: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => produce(context, (draft) => {
        if (event.type === "INITIATE_BID" && draft.public.auction) {
          const blueprintId = event.blueprintId;
          const blueprint = draft.public.entitiesById[blueprintId];
          if (!blueprint) return;

          // Use AuctionSystem to initiate a bid
          const auctionSystem = new AuctionSystem();
          const initialBidAmount = blueprint.cost?.amount || 0;
          const result = auctionSystem.auctionInitiateBid(
            draft.public.auction,
            blueprintId,
            event.caller.id,
            initialBidAmount
          );
          auctionSystem.mutate(result, draft);
        }
      }),
    ),
    auctionPass: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => produce(context, (draft) => {
        if (event.type === "PASS_AUCTION" && draft.public.auction) {
          // Use AuctionSystem to pass the auction
          const auctionSystem = new AuctionSystem();
          const result = auctionSystem.auctionPass(
            draft.public.auction,
            event.caller.id
          );
          auctionSystem.mutate(result, draft);
        }
      }),
    ),
    auctionPlaceBid: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => produce(context, (draft) => {
        if (event.type === "AUCTION_PLACE_BID" && draft.public.auction) {
          // Use AuctionSystem to place a bid
          const auctionSystem = new AuctionSystem();
          const result = auctionSystem.auctionPlaceBid(
            draft.public.auction,
            event.caller.id,
            event.amount,
            context.public.players
          );
          
          auctionSystem.mutate(result, draft);
        }
      }),
    ),
    auctionPassBid: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => produce(context, (draft) => {
        if (
          event.type === "AUCTION_PASS_BID" &&
          draft.public.auction?.currentBlueprint
        ) {
          // Use AuctionSystem to pass a bid
          const auctionSystem = new AuctionSystem();
          const result = auctionSystem.auctionPassBid(
            draft.public.auction,
            event.caller.id
          );
          auctionSystem.mutate(result, draft);
        }
      }),
    ),
    endBidding: assign(({ context }) => {
      return produce(context, (contextDraft) => {
        const auctionSystem = new AuctionSystem();
        
        // Use AuctionSystem to end bidding
        const result = auctionSystem.endBidding(
          contextDraft.public.auction!,
          contextDraft.public.players
        );
        
        if (!result.success || !result.auction) return;

        // Update auction state
        contextDraft.public.auction = result.auction;

        // Use the mutate method to update context with auction results
        auctionSystem.mutate(result, contextDraft);
      });
    }),

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

    // Surveys
    surveyHexTile: assign(({ context, event }) => {
      if (event.type !== "SURVEY_HEX_TILE") return context;
      return produce(context, (contextDraft) => {
          const playerId = event.caller.id;

          // Use SurveySystem to start a new survey
          const surveySystem = new SurveySystem();
          const world = createWorldWithEntities(context.public.entitiesById, context.private[playerId].entitiesById);
          const surveyContext: SurveyContext = {
            playerId,
            currentTick: context.public.time.totalTicks,
            hexGrid: context.public.hexGrid,
            randomSeed: context.public.randomSeed,
            precomputedResources: context.private[SERVER_ONLY_ID]?.hexCellResources || {}
          };
          surveySystem.initialize(world, surveyContext);
          const result = surveySystem.startSurvey(
            event.coordinates,
            surveyContext.currentTick
          );
          surveySystem.mutate(result, contextDraft);
        });
    }),
    precomputeResources: assign(({ context }) => {
      // Precompute resources for all hex cells using SurveySystem
      return produce(context, (contextDraft) => {
          const surveySystem = new SurveySystem();
          const world = createWorldWithEntities(context.public.entitiesById, {});
          
          // Initialize SurveySystem with the context
          const surveyContext: SurveyContext = {
            playerId: SERVER_ONLY_ID,
            currentTick: context.public.time.totalTicks,
            hexGrid: context.public.hexGrid,
            randomSeed: context.public.randomSeed,
            precomputedResources: {}
          };
          surveySystem.initialize(world, surveyContext);
          const result = surveySystem.precomputeHexCellResources();
          surveySystem.mutate(result, contextDraft);
        });
    }),
  },
}).createMachine({
  id: "game",
  initial: "lobby",
  context: ({ input }: { input: GameInput }) => createDefaultContext(input, {}),
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
