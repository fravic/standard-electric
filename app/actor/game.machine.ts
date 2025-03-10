import { assign, setup, spawnChild, stopChild } from "xstate";
import { ActorKitStateMachine } from "actor-kit";
import { produce, current } from "immer";

import { HexGridSchema } from "../lib/HexGrid";
import { GameContext, GameEvent, GameInput } from "./game.types";
import hexGridData from "../../public/hexgrid.json";
import powerPlantBlueprintsData from "../../public/powerPlantBlueprints.json";
import { gameTimerActor } from "./gameTimerActor";
import { PowerSystem } from "@/ecs/systems/PowerSystem";
import { AuctionSystem } from "@/ecs/systems/AuctionSystem";
import { Entity, EntitySchema } from "@/ecs/entity";
import {
  initializeCommodityMarket,
  buyFuelForPowerPlant,
  sellFuelFromPowerPlant,
} from "../lib/market/CommodityMarket";
import { SERVER_ONLY_ID } from "../lib/surveys";
import { SurveySystem, SurveyContext, SurveyResult, HexCellResource } from "@/ecs/systems/SurveySystem";
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
        gameTime: context.public.time.totalTicks,
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
        gameTime: context.public.time.totalTicks,
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
      return produce(context, (contextDraft) => {
        // Increment the tick count
        contextDraft.public.time.totalTicks += 1;
        
        // Create a new Miniplex world from the entities
        const publicWorld = createWorldWithEntities(current(contextDraft.public.entitiesById));

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

        // Process all player's surveys using the SurveySystem
        const surveySystem = new SurveySystem();
        
        // Create the SurveyContext object
        const surveyContext: SurveyContext = {
          currentTick: contextDraft.public.time.totalTicks, // Use the updated tick value
          gameTime: contextDraft.public.time.totalTicks,
          hexGrid: contextDraft.public.hexGrid,
          randomSeed: contextDraft.public.randomSeed,
          surveyResultsByPlayerId: Object.entries(contextDraft.private).reduce((acc, [playerId, privateContext]) => {
            if (privateContext.surveyResultByHexCell) {
              acc[playerId] = current(privateContext.surveyResultByHexCell);
            }
            return acc;
          }, {} as Record<string, Record<string, SurveyResult>>),
          precomputedResources: contextDraft.private[SERVER_ONLY_ID]?.hexCellResources || {}
        };
        
        // Add all player survey results to the context
        Object.keys(contextDraft.private).forEach((playerId) => {
          if (playerId === SERVER_ONLY_ID) return;
          if (contextDraft.private[playerId]?.surveyResultByHexCell) {
            surveyContext.surveyResultsByPlayerId[playerId] = JSON.parse(
              JSON.stringify(contextDraft.private[playerId].surveyResultByHexCell)
            );
          }
        });
        
        // Use the update() method to get the survey results
        const surveyResults = surveySystem.update(publicWorld, surveyContext);
        
        // Use the mutate method to update the context
        surveySystem.mutate(surveyResults, contextDraft);
      });
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
        
        // Use AuctionSystem to create a new auction
        const auctionSystem = new AuctionSystem();
        const blueprintIds = availableEntities.map(entity => entity.id);
        const result = auctionSystem.startAuction(blueprintIds, false); // No passing allowed on the first auction
        if (result.success && result.auction) {
          draft.auction = result.auction;
        }
        
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

            // Use AuctionSystem to initiate a bid
            const auctionSystem = new AuctionSystem();
            const initialBidAmount = blueprint.cost?.amount || 0;
            const result = auctionSystem.auctionInitiateBid(
              draft.auction,
              blueprintId,
              event.caller.id,
              initialBidAmount
            );
            
            if (result.success && result.auction) {
              draft.auction = result.auction;
            }
          }
        }),
      })
    ),
    auctionPass: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "PASS_AUCTION" && draft.auction) {
            // Use AuctionSystem to pass the auction
            const auctionSystem = new AuctionSystem();
            const result = auctionSystem.auctionPass(
              draft.auction,
              event.caller.id
            );
            
            if (result.success && result.auction) {
              draft.auction = result.auction;
            }
          }
        }),
      })
    ),
    auctionPlaceBid: assign(
      ({ context, event }: { context: GameContext; event: GameEvent }) => ({
        public: produce(context.public, (draft) => {
          if (event.type === "AUCTION_PLACE_BID" && draft.auction) {
            // Use AuctionSystem to place a bid
            const auctionSystem = new AuctionSystem();
            const result = auctionSystem.auctionPlaceBid(
              draft.auction,
              event.caller.id,
              event.amount,
              context.public.players
            );
            
            if (result.success && result.auction) {
              draft.auction = result.auction;
            }
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
            // Use AuctionSystem to pass a bid
            const auctionSystem = new AuctionSystem();
            const result = auctionSystem.auctionPassBid(
              draft.auction,
              event.caller.id
            );
            
            if (result.success && result.auction) {
              draft.auction = result.auction;
            }
          }
        }),
      })
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
    surveyHexTile: assign(({ context, event }) => {
      if (event.type !== "SURVEY_HEX_TILE") return context;
      return {
        private: produce(context.private, (draft) => {
          const playerId = event.caller.id;

          // Initialize private context for this player if it doesn't exist
          if (!draft[playerId]) {
            draft[playerId] = { surveyResultByHexCell: {} };
          }

          // Use SurveySystem to start a new survey
          const surveySystem = new SurveySystem();
          const world = createWorldWithEntities(context.public.entitiesById);
          
          // Create a copy of player surveys to avoid type issues
          const playerSurveys = JSON.parse(JSON.stringify(draft[playerId].surveyResultByHexCell)) as Record<string, import("@/ecs/systems/SurveySystem").SurveyResult>;
          
          // Ensure hexCellResources uses undefined instead of null
          const hexCellResources = context.private[SERVER_ONLY_ID]?.hexCellResources || {};
          const typeSafeResources: Record<string, import("@/ecs/systems/SurveySystem").HexCellResource | undefined> = {};
          
          // Convert any null values to undefined for type safety
          Object.entries(hexCellResources).forEach(([key, value]) => {
            typeSafeResources[key] = value === null ? undefined : value;
          });
          
          // Create a context with just this player's surveys
          const surveyContext: import("@/ecs/systems/SurveySystem").SurveyContext = {
            currentTick: context.public.time.totalTicks,
            gameTime: context.public.time.totalTicks,
            hexGrid: context.public.hexGrid,
            randomSeed: context.public.randomSeed,
            surveyResultsByPlayerId: {
              [playerId]: playerSurveys
            },
            precomputedResources: typeSafeResources
          };
          
          // Use startSurvey method
          const result = surveySystem.startSurvey(
            playerSurveys,
            event.coordinates,
            surveyContext.currentTick
          );
          
          draft[playerId].surveyResultByHexCell = result;
        }),
      };
    }),
    precomputeResources: assign(({ context }) => {
      // Precompute resources for all hex cells using SurveySystem
      return {
        private: produce(context.private, (draft) => {
          const surveySystem = new SurveySystem();
          const world = createWorldWithEntities(context.public.entitiesById);
          
          // Initialize SurveySystem with the context
          const surveyContext: import("@/ecs/systems/SurveySystem").SurveyContext = {
            currentTick: context.public.time.totalTicks,
            gameTime: context.public.time.totalTicks,
            hexGrid: context.public.hexGrid,
            randomSeed: context.public.randomSeed,
            surveyResultsByPlayerId: {} as Record<string, Record<string, import("@/ecs/systems/SurveySystem").SurveyResult>>
          };
          
          // Initialize to precompute resources
          surveySystem.initialize(world, surveyContext);
          
          // If precomputedResources is available, convert undefined to null for compatibility
          let hexCellResources = {};
          if (surveyContext.precomputedResources) {
            hexCellResources = Object.entries(surveyContext.precomputedResources).reduce((acc, [key, value]) => {
              acc[key] = value === undefined ? null : value;
              return acc;
            }, {} as Record<string, import("@/ecs/systems/SurveySystem").HexCellResource | null>);
          }
          
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
