import { createActor } from "xstate";
import { World } from "miniplex";
import { describe, test, expect, beforeEach } from "bun:test";
import { gameMachine } from "../game.machine";
import { GameEvent, GameInput } from "../game.types";
import { Env } from "../../env";
import { CornerPosition, HexCoordinates } from "../../lib/coordinates/types";
import { AdditionalBlueprintOptions, createWorldWithEntities } from "../../ecs/factories";
import { omit, cloneDeep } from "lodash";
import {
  powerPlantBlueprintsForPlayer,
  powerPoleBlueprintsForPlayer,
  powerPoles,
} from "@/ecs/queries";
import { Entity } from "@/ecs/entity";
import { CommodityType } from "@/lib/types";

/**
 * Helper function to scrub entity IDs for consistent snapshots
 * Replaces random entity IDs with predictable values (ENTITY_ID_0, ENTITY_ID_1, etc.)
 * Also updates references to entity IDs in connections components
 */
function scrubEntityIds(obj: any): any {
  // Create a deep clone to avoid modifying the original object
  const clone = cloneDeep(obj);

  // Track entity IDs to ensure consistent replacement
  const entityIdMap = new Map<string, string>();
  let nextEntityId = 0;

  // Replace entity IDs with predictable values
  if (clone.entitiesById) {
    const newEntitiesById: Record<string, any> = {};

    // First pass: create mapping of real IDs to scrubbed IDs
    Object.entries(clone.entitiesById).forEach(([id, entity]: [string, any]) => {
      if (!entityIdMap.has(id)) {
        entityIdMap.set(id, `ENTITY_ID_${nextEntityId++}`);
      }
    });

    // Second pass: replace all entity IDs with scrubbed IDs
    Object.entries(clone.entitiesById).forEach(([id, entity]: [string, any]) => {
      const scrubbedId = entityIdMap.get(id)!;
      const scrubbedEntity = { ...entity, id: scrubbedId };

      // Replace any connected entity IDs in connections component
      if (scrubbedEntity.connections?.connectedToIds) {
        scrubbedEntity.connections.connectedToIds = scrubbedEntity.connections.connectedToIds.map(
          (connectedId: string) => entityIdMap.get(connectedId) || connectedId
        );
      }

      newEntitiesById[scrubbedId] = scrubbedEntity;
    });

    clone.entitiesById = newEntitiesById;
  }

  return clone;
}

describe("Game Machine", () => {
  // Create mock objects for testing
  const createMockStorage = () => {
    return {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
      list: async () => ({ keys: [] }),
      getAlarm: async () => null,
      setAlarm: async () => {},
      deleteAlarm: async () => {},
    } as any;
  };

  const createMockEnv = () => {
    return {
      GAME: {},
      REMIX: {},
      ACTOR_KIT_SECRET: "test-secret",
      ACTOR_KIT_HOST: "test-host",
      SESSION_JWT_SECRET: "test-jwt-secret",
      AUTH_SECRET: "test-auth-secret",
      SENDGRID_API_KEY: "test-sendgrid-key",
      KV_STORAGE: {},
    } as Env;
  };

  // Helper function to create event with common properties
  const createEvent = <T extends { type: string }>(
    eventData: T,
    playerId: string,
    mockEnv: Env,
    mockStorage: any
  ): GameEvent => {
    return {
      ...eventData,
      caller: { id: playerId, type: "client" },
      origin: "client",
      env: mockEnv,
      storage: mockStorage,
    } as unknown as GameEvent;
  };

  // Test that the game machine can be created, players can join, and game can start
  test("should allow players to join, start the game, and perform various actions", () => {
    // 1. Arrange - Create the game machine and actor
    const mockEnv = createMockEnv();
    const mockStorage = createMockStorage();
    let world: World<Entity>;

    // Set a constant random seed for consistent test results
    const FIXED_RANDOM_SEED = 12345;

    const gameActor = createActor(gameMachine, {
      input: {
        id: "test-game",
        randomSeed: FIXED_RANDOM_SEED,
        caller: { id: "system", type: "system" },
        env: mockEnv,
        storage: mockStorage,
      } as GameInput,
    });

    // Start the actor (initialize the state machine)
    gameActor.start();

    // Initial state should be 'lobby'
    expect(gameActor.getSnapshot().value).toEqual("lobby");

    // 2. Act - Add two players to the game
    // Player 1 joins (becomes host)
    gameActor.send({
      type: "JOIN_GAME",
      name: "Player 1",
      caller: { id: "player-1", type: "client" },
      origin: "client",
      env: mockEnv,
      storage: mockStorage,
    } as unknown as GameEvent);

    // Player 2 joins
    gameActor.send({
      type: "JOIN_GAME",
      name: "Player 2",
      caller: { id: "player-2", type: "client" },
      origin: "client",
      env: mockEnv,
      storage: mockStorage,
    } as unknown as GameEvent);

    // 3. Assert - Check that both players are in the game
    const snapshot = gameActor.getSnapshot();
    const players = snapshot.context.public.players;

    expect(Object.keys(players).length).toEqual(2);
    expect(players["player-1"]).toBeDefined();
    expect(players["player-2"]).toBeDefined();
    expect(players["player-1"].name).toEqual("Player 1");
    expect(players["player-2"].name).toEqual("Player 2");
    expect(players["player-1"].isHost).toEqual(true);
    expect(players["player-2"].isHost).toEqual(false);

    // 4. Act - Start the game (only the host can do this)
    gameActor.send({
      type: "START_GAME",
      caller: { id: "player-1", type: "client" },
      origin: "client",
      env: mockEnv,
      storage: mockStorage,
    } as unknown as GameEvent);

    // 5. Assert - Check that the game state has changed to 'auction'
    const auctionSnapshot = gameActor.getSnapshot();
    expect(auctionSnapshot.value).toEqual({
      auction: "initiatingBid",
    });

    // Check that the auction state is initialized
    expect(auctionSnapshot.context.public.auction).toBeTruthy();

    // Get the first available blueprint from the auction
    const availableBlueprintIds = auctionSnapshot.context.public.auction!.availableBlueprintIds;
    expect(availableBlueprintIds.length).toBeGreaterThan(0);
    const blueprintId = availableBlueprintIds[0];

    // 6. Act - Player 1 initiates a bid for the first blueprint
    gameActor.send(
      createEvent(
        {
          type: "INITIATE_BID",
          blueprintId,
        },
        "player-1",
        mockEnv,
        mockStorage
      )
    );

    // Check that the bid was initiated
    const bidInitiatedSnapshot = gameActor.getSnapshot();
    expect(bidInitiatedSnapshot.value).toEqual({
      auction: "biddingOnBlueprint",
    });
    expect(bidInitiatedSnapshot.context.public.auction!.currentBlueprint).toBeTruthy();
    expect(bidInitiatedSnapshot.context.public.auction!.currentBlueprint!.blueprintId).toEqual(
      blueprintId
    );

    // 7. Act - Player 2 places a bid
    const initialBidAmount =
      bidInitiatedSnapshot.context.public.auction!.currentBlueprint!.bids[0].amount || 0;
    const player2BidAmount = initialBidAmount + 10;

    gameActor.send(
      createEvent(
        {
          type: "AUCTION_PLACE_BID",
          amount: player2BidAmount,
        },
        "player-2",
        mockEnv,
        mockStorage
      )
    );

    // 8. Act - Player 1 places another bid
    const player1BidAmount = player2BidAmount + 10;
    gameActor.send(
      createEvent(
        {
          type: "AUCTION_PLACE_BID",
          amount: player1BidAmount,
        },
        "player-1",
        mockEnv,
        mockStorage
      )
    );

    // 9. Act - Player 2 passes the bid
    gameActor.send(
      createEvent(
        {
          type: "AUCTION_PASS_BID",
        },
        "player-2",
        mockEnv,
        mockStorage
      )
    );

    // Check that the bidding ended and player 1 won the blueprint
    const biddingEndedSnapshot = gameActor.getSnapshot();
    const purchases = biddingEndedSnapshot.context.public.auction!.purchases;
    expect(purchases.length).toBeGreaterThan(0);
    expect(purchases[purchases.length - 1].playerId).toEqual("player-1");
    expect(purchases[purchases.length - 1].blueprintId).toEqual(blueprintId);

    // 10. Act - Get the next blueprint and player 2 buys it
    // First check if we're in initiatingBid state
    if (
      typeof biddingEndedSnapshot.value === "object" &&
      "auction" in biddingEndedSnapshot.value &&
      biddingEndedSnapshot.value.auction === "initiatingBid"
    ) {
      const nextBlueprintId = biddingEndedSnapshot.context.public.auction!.availableBlueprintIds[0];

      gameActor.send(
        createEvent(
          {
            type: "INITIATE_BID",
            blueprintId: nextBlueprintId,
          },
          "player-2",
          mockEnv,
          mockStorage
        )
      );

      // Check that player 2 won the blueprint (automatically, since player 1 cannot take any more)
      const nextBiddingSnapshot = gameActor.getSnapshot();
      const nextPurchases = nextBiddingSnapshot.context.public.auction!.purchases;
      expect(nextPurchases.length).toBeGreaterThan(purchases.length);
      expect(nextPurchases[nextPurchases.length - 1].playerId).toEqual("player-2");
    }

    // 12. Assert - Check that we're in the active state
    let currentSnapshot = gameActor.getSnapshot();
    expect(currentSnapshot.value).toEqual("active");

    // 13. Act - Survey hex cells
    // Player 1 surveys a hex cell
    const player1SurveyCoordinates: HexCoordinates = { x: 3, z: 11 };
    gameActor.send(
      createEvent(
        {
          type: "SURVEY_HEX_TILE",
          coordinates: player1SurveyCoordinates,
        },
        "player-1",
        mockEnv,
        mockStorage
      )
    );

    // Player 2 surveys a different hex cell
    const player2SurveyCoordinates: HexCoordinates = { x: 4, z: 14 };
    gameActor.send(
      createEvent(
        {
          type: "SURVEY_HEX_TILE",
          coordinates: player2SurveyCoordinates,
        },
        "player-2",
        mockEnv,
        mockStorage
      )
    );

    // 14. Act - Pass 5 game ticks to complete the surveys
    for (let i = 0; i < 5; i++) {
      gameActor.send(
        createEvent(
          {
            type: "TICK",
          },
          "system",
          mockEnv,
          mockStorage
        )
      );
    }

    // 15. Act - Build power plants on the surveyed cells
    // Find a power plant blueprint owned by player 1
    world = createWorldWithEntities(currentSnapshot.context.public.entitiesById, {});
    const player1Blueprint = powerPlantBlueprintsForPlayer(world, "player-1").first;
    const player1PowerPlantBlueprintId = player1Blueprint!.id;

    // Build a power plant on the surveyed cell
    gameActor.send(
      createEvent(
        {
          type: "ADD_BUILDABLE",
          blueprintId: player1PowerPlantBlueprintId,
          options: {
            hexPosition: {
              coordinates: player1SurveyCoordinates,
            },
          } as AdditionalBlueprintOptions,
        },
        "player-1",
        mockEnv,
        mockStorage
      )
    );

    // Find a power plant blueprint owned by player 2
    world = createWorldWithEntities(currentSnapshot.context.public.entitiesById, {});
    const player2Blueprint = powerPlantBlueprintsForPlayer(world, "player-2").first;
    const player2PowerPlantBlueprintId = player2Blueprint!.id;

    // Build a power plant on the surveyed cell
    gameActor.send(
      createEvent(
        {
          type: "ADD_BUILDABLE",
          blueprintId: player2PowerPlantBlueprintId,
          options: {
            hexPosition: {
              coordinates: player2SurveyCoordinates,
            },
          } as AdditionalBlueprintOptions,
        },
        "player-2",
        mockEnv,
        mockStorage
      )
    );

    // 16. Act - Build power poles
    // Find power pole blueprints
    world = createWorldWithEntities(currentSnapshot.context.public.entitiesById, {});
    const player1PoleBlueprint = powerPoleBlueprintsForPlayer(world, "player-1").first;
    const player1PoleBlueprintId = player1PoleBlueprint!.id;

    // Build a power pole at the north corner of the hex
    gameActor.send(
      createEvent(
        {
          type: "ADD_BUILDABLE",
          blueprintId: player1PoleBlueprintId,
          options: {
            cornerPosition: {
              cornerCoordinates: {
                hex: player1SurveyCoordinates,
                position: CornerPosition.North,
              },
            },
          } as AdditionalBlueprintOptions,
        },
        "player-1",
        mockEnv,
        mockStorage
      )
    );

    // Build another connected power pole
    gameActor.send(
      createEvent(
        {
          type: "ADD_BUILDABLE",
          blueprintId: player1PoleBlueprintId,
          options: {
            cornerPosition: {
              cornerCoordinates: {
                hex: { x: 4, z: 10 } as HexCoordinates,
                position: CornerPosition.South,
              },
            },
          } as AdditionalBlueprintOptions,
        },
        "player-1",
        mockEnv,
        mockStorage
      )
    );

    // Update the current snapshot to include the built power poles
    currentSnapshot = gameActor.getSnapshot();

    // Verify that power poles were built
    world = createWorldWithEntities(currentSnapshot.context.public.entitiesById, {});
    const builtPowerPoles = powerPoles(world);
    expect(builtPowerPoles.entities.length).toBeGreaterThan(0);

    // 17. Assert - Final game state
    const finalSnapshot = gameActor.getSnapshot();
    expect(finalSnapshot.value).toEqual("active");

    // 18. Act - Buy and sell commodities
    // Find power plants owned by player 1 and player 2
    world = createWorldWithEntities(finalSnapshot.context.public.entitiesById, {});
    const player1PowerPlants = world.entities.filter(
      (e) =>
        e.renderable?.renderableComponentName === "PowerPlant" && e.owner?.playerId === "player-1"
    );
    const player2PowerPlants = world.entities.filter(
      (e) =>
        e.renderable?.renderableComponentName === "PowerPlant" && e.owner?.playerId === "player-2"
    );

    expect(player1PowerPlants.length).toBeGreaterThan(0);
    expect(player2PowerPlants.length).toBeGreaterThan(0);

    const player1PowerPlantId = player1PowerPlants[0].id;
    const player2PowerPlantId = player2PowerPlants[0].id;

    // Player 1 buys coal
    gameActor.send(
      createEvent(
        {
          type: "BUY_COMMODITY",
          powerPlantId: player1PowerPlantId,
          fuelType: CommodityType.COAL,
          units: 2,
        },
        "player-1",
        mockEnv,
        mockStorage
      )
    );

    // Player 2 buys coal
    gameActor.send(
      createEvent(
        {
          type: "BUY_COMMODITY",
          powerPlantId: player2PowerPlantId,
          fuelType: CommodityType.COAL,
          units: 1,
        },
        "player-2",
        mockEnv,
        mockStorage
      )
    );

    // Get snapshot after purchases
    const afterPurchaseSnapshot = gameActor.getSnapshot();

    // Verify fuel was added to power plants
    const player1PowerPlantAfterPurchase =
      afterPurchaseSnapshot.context.public.entitiesById[player1PowerPlantId];
    const player2PowerPlantAfterPurchase =
      afterPurchaseSnapshot.context.public.entitiesById[player2PowerPlantId];

    expect(player1PowerPlantAfterPurchase.fuelStorage?.currentFuelStorage).toBeGreaterThan(0);
    expect(player2PowerPlantAfterPurchase.fuelStorage?.currentFuelStorage).toBeGreaterThan(0);

    // Player 1 sells some coal
    gameActor.send(
      createEvent(
        {
          type: "SELL_COMMODITY",
          powerPlantId: player1PowerPlantId,
          fuelType: CommodityType.COAL,
          units: 1,
        },
        "player-1",
        mockEnv,
        mockStorage
      )
    );

    // Get snapshot after sale
    const afterSaleSnapshot = gameActor.getSnapshot();

    // Verify fuel was removed from player 1's power plant
    const player1PowerPlantAfterSale =
      afterSaleSnapshot.context.public.entitiesById[player1PowerPlantId];

    expect(player1PowerPlantAfterSale.fuelStorage?.currentFuelStorage).toBeLessThan(
      player1PowerPlantAfterPurchase.fuelStorage?.currentFuelStorage || 0
    );

    // Use snapshot assertions with scrubbed entity IDs
    // This will detect any unintended changes to the game state in future tests
    const scrubbedPublic = scrubEntityIds(omit(afterSaleSnapshot.context.public, "hexGrid"));
    const scrubbedPrivatePlayer1 = scrubEntityIds(afterSaleSnapshot.context.private["player-1"]);
    const scrubbedPrivatePlayer2 = scrubEntityIds(afterSaleSnapshot.context.private["player-2"]);

    expect(scrubbedPublic).toMatchSnapshot();
    expect(scrubbedPrivatePlayer1).toMatchSnapshot();
    expect(scrubbedPrivatePlayer2).toMatchSnapshot();
  });
});
