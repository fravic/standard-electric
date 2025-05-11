import { assign, setup, spawnChild, stopChild } from "xstate";
import { ActorKitStateMachine } from "actor-kit";
import { produce, current } from "immer";
import { getPlayerColor } from "@/lib/constants";
import { coordinatesToString } from "@/lib/coordinates/HexCoordinates";

import { GameContext, GameEvent, GameInput } from "./game.types";
import { gameTimerActor } from "./gameTimerActor";
import { PowerSystem } from "@/ecs/systems/PowerSystem";
import { Entity } from "@/ecs/entity";
import { CommoditySystem, CommodityContext } from "@/ecs/systems/CommoditySystem";
import {
  SurveySystem,
  SurveyContext,
  HexCellResource,
  SERVER_ONLY_ID,
} from "@/ecs/systems/SurveySystem";
import { createDefaultBlueprintsForPlayer, createWorldWithEntities } from "@/ecs/factories";
import { With } from "miniplex";
import { createDefaultContext } from "./createDefaultContext";
import { BuildableSystem } from "@/ecs/systems/BuildableSystem";

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
    isValidBuildableLocation: ({ context, event }) => {
      if (event.type !== "ADD_BUILDABLE") {
        return false;
      }
      const playerId = event.caller.id;
      const blueprintId = event.blueprintId;
      const playerPrivateContext = context.private[playerId];
      const blueprintEntity = context.public.entitiesById[blueprintId];
      if (!blueprintEntity) {
        return false;
      }
      if (blueprintEntity.owner?.playerId !== playerId) {
        throw new Error(`Player ${playerId} is not the owner of blueprint ${blueprintId}`);
      }
      const world = createWorldWithEntities(
        context.public.entitiesById,
        playerPrivateContext.entitiesById
      );
      // Get surveyed cells for this player
      const surveyedHexCoords = new Set<string>();
      world
        .with("surveyResult")
        .where(
          (entity) =>
            entity.surveyResult?.isComplete === true && entity.owner?.playerId === playerId
        )
        .entities.forEach((survey) => {
          if (survey.hexPosition?.coordinates) {
            surveyedHexCoords.add(coordinatesToString(survey.hexPosition.coordinates));
          }
        });
      const validationResult = BuildableSystem.isValidBuildableLocation(
        world,
        {
          playerId,
          hexGrid: context.public.hexGrid,
          playerMoney: context.public.players[playerId].money,
          surveyedHexCells: surveyedHexCoords,
        },
        blueprintId,
        event.options
      );
      return validationResult.valid;
    },
  },
  actions: {
    joinGame: assign(({ context, event }: { context: GameContext; event: GameEvent }) => {
      if (event.type !== "JOIN_GAME") return context;

      const playerId = event.caller.id;

      // Initialize private context for the player
      const updatedPrivate = { ...context.private, [playerId]: { entitiesById: {} } };

      return {
        public: produce(context.public, (draft) => {
          const playerNumber = Object.keys(draft.players).length + 1;
          draft.players[playerId] = {
            id: playerId,
            name: event.name,
            number: playerNumber,
            money: 100,
            powerSoldKWh: 0,
            isHost: playerNumber === 1,
            color: getPlayerColor(playerNumber),
          };
          // Create default blueprints for each player
          const defaultBlueprints = createDefaultBlueprintsForPlayer(playerId);
          defaultBlueprints.forEach((blueprint) => {
            draft.entitiesById[blueprint.id] = blueprint;
          });
        }),
        private: updatedPrivate,
      };
    }),
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
          hexGrid: current(contextDraft.public.hexGrid),
        };

        // Use the update() method to get the power system results
        const powerSystemResult = powerSystem.update(publicWorld, powerContext);

        // Use the mutate() method to update the game context
        powerSystem.mutate(powerSystemResult, contextDraft);

        // Process each player's surveys
        Object.keys(context.public.players).forEach((playerId) => {
          const privateWorld = createWorldWithEntities(
            contextDraft.public.entitiesById,
            contextDraft.private[playerId].entitiesById
          );
          const surveySystem = new SurveySystem();
          const surveyContext: SurveyContext = {
            playerId,
            currentTick: contextDraft.public.time.totalTicks, // Use the updated tick value
            hexGrid: contextDraft.public.hexGrid,
            randomSeed: contextDraft.public.randomSeed,
            precomputedResources: contextDraft.private[SERVER_ONLY_ID]?.hexCellResources || {},
          };
          surveySystem.initialize(privateWorld, surveyContext);
          const surveyResult = surveySystem.update(privateWorld, surveyContext);
          surveySystem.mutate(surveyResult, contextDraft);
        });
      });
    }),
    addBuildable: assign(({ context, event }: { context: GameContext; event: GameEvent }) =>
      produce(context, (contextDraft) => {
        if (event.type === "ADD_BUILDABLE") {
          const playerId = event.caller.id;
          const blueprintId = event.blueprintId;
          const world = createWorldWithEntities(
            contextDraft.public.entitiesById,
            contextDraft.private[playerId].entitiesById
          );
          const buildableSystem = new BuildableSystem();

          // Get surveyed cells for this player
          const surveyedHexCoords = new Set<string>();
          world
            .with("surveyResult")
            .where(
              (entity) =>
                entity.surveyResult?.isComplete === true && entity.owner?.playerId === playerId
            )
            .entities.forEach((survey) => {
              if (survey.hexPosition?.coordinates) {
                surveyedHexCoords.add(coordinatesToString(survey.hexPosition.coordinates));
              }
            });

          buildableSystem.initialize(world, {
            playerId,
            hexGrid: contextDraft.public.hexGrid,
            playerMoney: contextDraft.public.players[playerId].money,
            surveyedHexCells: surveyedHexCoords,
          });
          const result = buildableSystem.createBuildable(blueprintId, event.options);
          if (result.success) {
            buildableSystem.mutate(result, contextDraft);
          } else {
            console.error("Failed to create buildable:", result.reason);
          }
        }
      })
    ),

    // Commodity Market
    buyCommodity: assign(({ context, event }: { context: GameContext; event: GameEvent }) => {
      if (event.type !== "BUY_COMMODITY") return context;
      return produce(context, (contextDraft) => {
        const playerId = event.caller.id;
        const player = context.public.players[playerId];
        if (!player) return;

        // Find the specific power plant by ID
        const powerPlant = context.public.entitiesById[event.powerPlantId];
        if (powerPlant?.owner?.playerId !== playerId) {
          throw new Error(
            `Player ${playerId} is not the owner of power plant ${event.powerPlantId}`
          );
        }
        if (!powerPlant) return;

        // Use CommoditySystem to handle the purchase
        const commoditySystem = new CommoditySystem();
        const world = createWorldWithEntities(context.public.entitiesById, {});

        const commodityContext: CommodityContext = {
          playerId,
          market: context.public.commodityMarket,
        };

        commoditySystem.initialize(world, commodityContext);
        const result = commoditySystem.buyCommodity(
          context.public.commodityMarket,
          event.powerPlantId,
          event.fuelType,
          event.units,
          player.money
        );

        // If the operation was successful, let the system handle the mutations
        if (result.success) {
          commoditySystem.mutate(result, contextDraft);
        }
      });
    }),

    sellCommodity: assign(({ context, event }: { context: GameContext; event: GameEvent }) => {
      if (event.type !== "SELL_COMMODITY") return context;
      return produce(context, (contextDraft) => {
        const playerId = event.caller.id;
        const { powerPlantId } = event;

        // Find the specific power plant by ID
        const powerPlant = context.public.entitiesById[powerPlantId] as With<Entity, "owner">;

        if (powerPlant.owner?.playerId !== playerId) {
          throw new Error(`Player ${playerId} is not the owner of power plant ${powerPlantId}`);
        }

        if (!powerPlant) return;

        // Use CommoditySystem to handle the sale
        const commoditySystem = new CommoditySystem();
        const world = createWorldWithEntities(context.public.entitiesById, {});

        const commodityContext: CommodityContext = {
          playerId,
          market: context.public.commodityMarket,
        };

        commoditySystem.initialize(world, commodityContext);
        const result = commoditySystem.sellCommodity(
          context.public.commodityMarket,
          event.powerPlantId,
          event.fuelType,
          event.units
        );

        // If the operation was successful, let the system handle the mutations
        if (result.success) {
          commoditySystem.mutate(result, contextDraft);
        }
      });
    }),

    // Surveys
    surveyHexTile: assign(({ context, event }) => {
      if (event.type !== "SURVEY_HEX_TILE") return context;
      return produce(context, (contextDraft) => {
        const playerId = event.caller.id;

        // Use SurveySystem to start a new survey
        const surveySystem = new SurveySystem();
        const world = createWorldWithEntities(
          context.public.entitiesById,
          context.private[playerId].entitiesById
        );
        const surveyContext: SurveyContext = {
          playerId,
          currentTick: context.public.time.totalTicks,
          hexGrid: context.public.hexGrid,
          randomSeed: context.public.randomSeed,
          precomputedResources: context.private[SERVER_ONLY_ID]?.hexCellResources || {},
        };
        surveySystem.initialize(world, surveyContext);
        const result = surveySystem.startSurvey(event.coordinates, surveyContext.currentTick);
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
          precomputedResources: {},
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
          target: "active",
          guard: "isHost",
          actions: "precomputeResources",
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
