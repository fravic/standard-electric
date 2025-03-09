import { World } from "miniplex";
import { Entity } from "../../entity";
import { AuctionSystem, AuctionResult } from "../AuctionSystem";
import { Player, Auction } from "@/actor/game.types";

describe("AuctionSystem", () => {
  let world: World<Entity>;
  let auctionSystem: AuctionSystem;
  
  // Sample blueprint entities
  const blueprint1: Entity = {
    id: "blueprint1",
    name: "Coal Power Plant",
    cost: { amount: 1000 },
  };
  
  const blueprint2: Entity = {
    id: "blueprint2",
    name: "Solar Power Plant",
    cost: { amount: 1500 },
  };
  
  // Player IDs for reference in tests
  const PLAYER1_ID = "player1";
  const PLAYER2_ID = "player2";
  const PLAYER3_ID = "player3";
  
  // Sample players - following the Player interface in game.types.ts
  const players: Record<string, Player> = {
    [PLAYER1_ID]: {
      name: "Player 1",
      number: 1,
      money: 5000,
      powerSoldKWh: 100,
      isHost: true,
    },
    [PLAYER2_ID]: {
      name: "Player 2",
      number: 2,
      money: 3000,
      powerSoldKWh: 200,
      isHost: false,
    },
    [PLAYER3_ID]: {
      name: "Player 3",
      number: 3,
      money: 2000,
      powerSoldKWh: 50,
      isHost: false,
    },
  };

  beforeEach(() => {
    world = new World<Entity>();
    world.add(blueprint1);
    world.add(blueprint2);
    auctionSystem = new AuctionSystem();
  });

  describe("startAuction", () => {
    it("should create a new auction with provided blueprint IDs", () => {
      const blueprintIds = [blueprint1.id, blueprint2.id];
      const result = auctionSystem.startAuction(blueprintIds);
      
      expect(result.success).toBe(true);
      expect(result.auction).toEqual({
        currentBlueprint: null,
        availableBlueprintIds: blueprintIds,
        purchases: [],
        isPassingAllowed: true,
        passedPlayerIds: [],
      });
    });

    it("should set isPassingAllowed to false when specified", () => {
      const blueprintIds = [blueprint1.id, blueprint2.id];
      const result = auctionSystem.startAuction(blueprintIds, false);
      
      expect(result.success).toBe(true);
      expect(result.auction?.isPassingAllowed).toBe(false);
    });
  });

  describe("auctionInitiateBid", () => {
    it("should initiate bidding on a blueprint", () => {
      const startResult = auctionSystem.startAuction([blueprint1.id, blueprint2.id]);
      const result = auctionSystem.auctionInitiateBid(
        startResult.auction!,
        blueprint1.id,
        PLAYER1_ID,
        1000
      );
      
      expect(result.success).toBe(true);
      expect(result.auction).toEqual({
        ...startResult.auction,
        currentBlueprint: {
          blueprintId: blueprint1.id,
          bids: [
            {
              playerId: PLAYER1_ID,
              amount: 1000,
            },
          ],
        },
      });
    });

    it("should return failure if blueprint is not available", () => {
      const startResult = auctionSystem.startAuction([blueprint2.id]);
      const result = auctionSystem.auctionInitiateBid(
        startResult.auction!,
        blueprint1.id,
        "player1",
        1000
      );
      
      expect(result.success).toBe(false);
      expect(result.auction).toBeNull();
    });
  });

  describe("auctionPass", () => {
    it("should add player to passedPlayerIds", () => {
      const startResult = auctionSystem.startAuction([blueprint1.id, blueprint2.id]);
      const result = auctionSystem.auctionPass(startResult.auction!, PLAYER1_ID);
      
      expect(result.success).toBe(true);
      expect(result.auction?.passedPlayerIds).toContain(PLAYER1_ID);
    });

    it("should return failure if passing is not allowed", () => {
      const startResult = auctionSystem.startAuction([blueprint1.id, blueprint2.id], false);
      const result = auctionSystem.auctionPass(startResult.auction!, PLAYER1_ID);
      
      expect(result.success).toBe(false);
      expect(result.auction).toBeNull();
    });
  });

  describe("auctionPlaceBid", () => {
    it("should add a bid to the current blueprint", () => {
      const startResult = auctionSystem.startAuction([blueprint1.id, blueprint2.id]);
      const initResult = auctionSystem.auctionInitiateBid(startResult.auction!, blueprint1.id, PLAYER1_ID, 1000);
      
      const result = auctionSystem.auctionPlaceBid(
        initResult.auction!,
        PLAYER2_ID,
        1100,
        players
      );
      
      expect(result.success).toBe(true);
      expect(result.auction?.currentBlueprint?.bids).toEqual([
        {
          playerId: PLAYER1_ID,
          amount: 1000,
        },
        {
          playerId: PLAYER2_ID,
          amount: 1100,
        },
      ]);
    });

    it("should return failure if player cannot afford the bid", () => {
      const startResult = auctionSystem.startAuction([blueprint1.id, blueprint2.id]);
      const initResult = auctionSystem.auctionInitiateBid(startResult.auction!, blueprint1.id, PLAYER1_ID, 1000);
      
      const result = auctionSystem.auctionPlaceBid(
        initResult.auction!,
        PLAYER3_ID,
        3000, // Player3 only has 2000
        players
      );
      
      expect(result.success).toBe(false);
      expect(result.auction).toBeNull();
    });
  });

  describe("auctionPassBid", () => {
    it("should add a passed bid to the current blueprint", () => {
      const startResult = auctionSystem.startAuction([blueprint1.id, blueprint2.id]);
      const initResult = auctionSystem.auctionInitiateBid(startResult.auction!, blueprint1.id, PLAYER1_ID, 1000);
      
      const result = auctionSystem.auctionPassBid(initResult.auction!, PLAYER2_ID);
      
      expect(result.success).toBe(true);
      expect(result.auction?.currentBlueprint?.bids).toEqual([
        {
          playerId: PLAYER1_ID,
          amount: 1000,
        },
        {
          playerId: PLAYER2_ID,
          passed: true,
        },
      ]);
    });
  });

  describe("endBidding", () => {
    it("should process the winner and update auction state", () => {
      const startResult = auctionSystem.startAuction([blueprint1.id, blueprint2.id]);
      const initResult = auctionSystem.auctionInitiateBid(startResult.auction!, blueprint1.id, PLAYER1_ID, 1000);
      const placeBidResult = auctionSystem.auctionPlaceBid(initResult.auction!, PLAYER2_ID, 1100, players);
      
      const result = auctionSystem.endBidding(placeBidResult.auction!, players);
      
      expect(result.success).toBe(true);
      expect(result.auction).not.toBeNull();
      expect(result.auction?.currentBlueprint).toBeNull();
      expect(result.auction?.availableBlueprintIds).not.toContain(blueprint1.id);
      expect(result.auction?.purchases).toEqual([
        {
          playerId: PLAYER2_ID,
          blueprintId: blueprint1.id,
          price: 1100,
        },
      ]);
    });
  });

  describe("shouldEndBidding", () => {
    it("should return true when only one player is left bidding", () => {
      const startResult = auctionSystem.startAuction([blueprint1.id, blueprint2.id]);
      const initResult = auctionSystem.auctionInitiateBid(startResult.auction!, blueprint1.id, PLAYER1_ID, 1000);
      const pass1Result = auctionSystem.auctionPassBid(initResult.auction!, PLAYER2_ID);
      const pass2Result = auctionSystem.auctionPassBid(pass1Result.auction!, PLAYER3_ID);
      
      const context = {
        gameTime: 0,
        totalTicks: 0,
        players,
        auction: pass2Result.auction!,
      };
      
      expect(auctionSystem.shouldEndBidding(context)).toBe(true);
    });
  });

  describe("shouldEndAuction", () => {
    it("should return true when all players have passed or purchased", () => {
      const startResult = auctionSystem.startAuction([blueprint1.id, blueprint2.id]);
      
      // Player1 buys blueprint1
      const initResult = auctionSystem.auctionInitiateBid(startResult.auction!, blueprint1.id, PLAYER1_ID, 1000);
      const endResult = auctionSystem.endBidding(initResult.auction!, players);
      
      // Other players pass
      const pass1Result = auctionSystem.auctionPass(endResult.auction!, PLAYER2_ID);
      const pass2Result = auctionSystem.auctionPass(pass1Result.auction!, PLAYER3_ID);
      
      const context = {
        gameTime: 0,
        totalTicks: 0,
        players,
        auction: pass2Result.auction!,
      };
      
      expect(auctionSystem.shouldEndAuction(context)).toBe(true);
    });
  });

  describe("mutate", () => {
    it("should update entity owners based on auction purchases", () => {
      // Set up auction with a purchase
      const startResult = auctionSystem.startAuction([blueprint1.id, blueprint2.id]);
      const initResult = auctionSystem.auctionInitiateBid(startResult.auction!, blueprint1.id, PLAYER1_ID, 1000);
      const endResult = auctionSystem.endBidding(initResult.auction!, players);
      
      // Create draft entities and players
      const entitiesDraft = {
        [blueprint1.id]: { ...blueprint1 },
        [blueprint2.id]: { ...blueprint2 },
      };
      
      const playersDraft = { ...players };
      
      // Call mutate with the result from endBidding
      auctionSystem.mutate(endResult, entitiesDraft, playersDraft);
      
      // Check that the entity owner was updated
      expect(entitiesDraft[blueprint1.id].owner).toEqual({
        playerId: PLAYER1_ID,
      });
      
      // Check that other entity was not modified
      expect(entitiesDraft[blueprint2.id].owner).toBeUndefined();
    });
  });
});
