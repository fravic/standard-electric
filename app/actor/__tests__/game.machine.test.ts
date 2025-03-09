import { createActor } from "xstate";
import { describe, test, expect, beforeEach } from "bun:test";
import { gameMachine } from "../game.machine";
import { GameEvent, GameInput } from "../game.types";
import { Env } from "../../env";

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
      deleteAlarm: async () => {}
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
      KV_STORAGE: {}
    } as Env;
  };

  // Test that the game machine can be created, players can join, and game can start
  test("should allow players to join and start the game", () => {
    // 1. Arrange - Create the game machine and actor
    const mockEnv = createMockEnv();
    const mockStorage = createMockStorage();
    
    const gameActor = createActor(gameMachine, {
      input: {
        id: "test-game",
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
    const finalSnapshot = gameActor.getSnapshot();
    expect(finalSnapshot.value).toEqual({
      auction: "initiatingBid"
    });
    
    // Check that the auction state is initialized
    expect(finalSnapshot.context.public.auction).toBeDefined();
  });
});
