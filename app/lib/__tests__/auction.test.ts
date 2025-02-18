import {
  getBidderPriorityOrder,
  getNextInitiatorPlayerId,
  getNextBidderPlayerId,
  canPlayerAffordBid,
  shouldEndBidding,
  shouldEndAuction,
  processBlueprintWinner,
} from "../auction";
import { Player, Auction } from "@/actor/game.types";

describe("auction", () => {
  const mockPlayers: Record<string, Player> = {
    player1: {
      name: "Player 1",
      number: 1,
      money: 100,
      powerSoldKWh: 0,
      isHost: true,
      blueprintsById: {},
    },
    player2: {
      name: "Player 2",
      number: 2,
      money: 100,
      powerSoldKWh: 1000,
      isHost: false,
      blueprintsById: {},
    },
    player3: {
      name: "Player 3",
      number: 3,
      money: 100,
      powerSoldKWh: 500,
      isHost: false,
      blueprintsById: {},
    },
  };

  const mockAuction: Auction = {
    availableBlueprints: [],
    currentBlueprint: null,
    purchases: [],
    passedPlayerIds: [],
    isPassingAllowed: true,
  };

  describe("getBidderPriorityOrder", () => {
    it("should order players by power sold ascending", () => {
      const order = getBidderPriorityOrder(mockPlayers, mockAuction, 0, 123);
      expect(order[0]).toBe("player1"); // 0 kWh
      expect(order[1]).toBe("player3"); // 500 kWh
      expect(order[2]).toBe("player2"); // 1000 kWh
    });

    it("should maintain consistent random order for ties", () => {
      const tiePlayers: Record<string, Player> = {
        player1: { ...mockPlayers.player1, powerSoldKWh: 0 },
        player2: { ...mockPlayers.player2, powerSoldKWh: 0 },
        player3: { ...mockPlayers.player3, powerSoldKWh: 0 },
      };

      const order1 = getBidderPriorityOrder(tiePlayers, mockAuction, 0, 123);
      const order2 = getBidderPriorityOrder(tiePlayers, mockAuction, 0, 123);
      expect(order1).toEqual(order2);
    });

    it("should change random order based on totalTicks", () => {
      const tiePlayers: Record<string, Player> = {
        player1: { ...mockPlayers.player1, powerSoldKWh: 0 },
        player2: { ...mockPlayers.player2, powerSoldKWh: 0 },
      };

      const orders = new Set();
      for (let i = 0; i < 10; i++) {
        const order = getBidderPriorityOrder(tiePlayers, mockAuction, i, 123);
        orders.add(order.join(","));
      }
      expect(orders.size).toBeGreaterThan(1);
    });
  });

  describe("getNextInitiatorPlayerId", () => {
    it("should return first player when no one has passed or purchased", () => {
      const nextBidder = getNextInitiatorPlayerId(
        mockPlayers,
        mockAuction,
        0,
        123
      );
      expect(nextBidder).toBe("player1");
    });

    it("should skip players who have passed", () => {
      const auctionWithPass: Auction = {
        ...mockAuction,
        passedPlayerIds: ["player1"],
      };
      const nextBidder = getNextInitiatorPlayerId(
        mockPlayers,
        auctionWithPass,
        0,
        123
      );
      expect(nextBidder).toBe("player3");
    });

    it("should skip players who have purchased", () => {
      const auctionWithPurchase: Auction = {
        ...mockAuction,
        purchases: [{ playerId: "player1", blueprintId: "test", price: 10 }],
      };
      const nextBidder = getNextInitiatorPlayerId(
        mockPlayers,
        auctionWithPurchase,
        0,
        123
      );
      expect(nextBidder).toBe("player3");
    });

    it("should return undefined when all players have passed or purchased", () => {
      const auctionComplete: Auction = {
        ...mockAuction,
        passedPlayerIds: ["player1", "player3"],
        purchases: [{ playerId: "player2", blueprintId: "test", price: 10 }],
      };
      const nextBidder = getNextInitiatorPlayerId(
        mockPlayers,
        auctionComplete,
        0,
        123
      );
      expect(nextBidder).toBeUndefined();
    });
  });

  describe("getNextBidderPlayerId", () => {
    it("should return null when there is no current blueprint", () => {
      const nextBidder = getNextBidderPlayerId(
        mockPlayers,
        mockAuction,
        0,
        123
      );
      expect(nextBidder).toBeNull();
    });

    it("should return first eligible player when there are no bids", () => {
      const auctionWithBlueprint: Auction = {
        ...mockAuction,
        currentBlueprint: {
          blueprint: {
            id: "test",
            type: "coal_plant",
            name: "Test Plant",
            powerGenerationKW: 1000,
            startingPrice: 10,
          },
          bids: [],
        },
      };
      const nextBidder = getNextBidderPlayerId(
        mockPlayers,
        auctionWithBlueprint,
        0,
        123
      );
      expect(nextBidder).toBe("player1");
    });

    it("should return next player after last bidder", () => {
      const auctionWithBids: Auction = {
        ...mockAuction,
        currentBlueprint: {
          blueprint: {
            id: "test",
            type: "coal_plant",
            name: "Test Plant",
            powerGenerationKW: 1000,
            startingPrice: 10,
          },
          bids: [{ playerId: "player1", amount: 10 }],
        },
      };
      const nextBidder = getNextBidderPlayerId(
        mockPlayers,
        auctionWithBids,
        0,
        123
      );
      expect(nextBidder).toBe("player3"); // player3 is next in priority order
    });

    it("should skip players who have purchased", () => {
      const auctionWithPurchase: Auction = {
        ...mockAuction,
        currentBlueprint: {
          blueprint: {
            id: "test",
            type: "coal_plant",
            name: "Test Plant",
            powerGenerationKW: 1000,
            startingPrice: 10,
          },
          bids: [{ playerId: "player1", amount: 10 }],
        },
        purchases: [{ playerId: "player3", blueprintId: "other", price: 10 }],
      };
      const nextBidder = getNextBidderPlayerId(
        mockPlayers,
        auctionWithPurchase,
        0,
        123
      );
      expect(nextBidder).toBe("player2"); // player3 has purchased, so player2 is next
    });

    it("should cycle back to first eligible player", () => {
      const auctionWithBids: Auction = {
        ...mockAuction,
        currentBlueprint: {
          blueprint: {
            id: "test",
            type: "coal_plant",
            name: "Test Plant",
            powerGenerationKW: 1000,
            startingPrice: 10,
          },
          bids: [
            { playerId: "player1", amount: 10 },
            { playerId: "player3", amount: 11 },
            { playerId: "player2", amount: 12 },
          ],
        },
      };
      const nextBidder = getNextBidderPlayerId(
        mockPlayers,
        auctionWithBids,
        0,
        123
      );
      expect(nextBidder).toBe("player1"); // cycles back to player1
    });
  });

  describe("canPlayerAffordBid", () => {
    it("should return true if player has enough money", () => {
      const player = { ...mockPlayers.player1, money: 100 };
      expect(canPlayerAffordBid(player, 50)).toBe(true);
    });

    it("should return false if player does not have enough money", () => {
      const player = { ...mockPlayers.player1, money: 100 };
      expect(canPlayerAffordBid(player, 150)).toBe(false);
    });

    it("should return true if bid amount equals player money", () => {
      const player = { ...mockPlayers.player1, money: 100 };
      expect(canPlayerAffordBid(player, 100)).toBe(true);
    });
  });

  describe("shouldEndBidding", () => {
    it("should return false when there is no current blueprint", () => {
      expect(shouldEndBidding(mockPlayers, mockAuction)).toBe(false);
    });

    it("should return true when only one player has not passed", () => {
      const auctionWithBids: Auction = {
        ...mockAuction,
        currentBlueprint: {
          blueprint: {
            id: "test",
            type: "coal_plant",
            name: "Test Plant",
            powerGenerationKW: 1000,
            startingPrice: 10,
          },
          bids: [
            { playerId: "player1", amount: 10 },
            { playerId: "player2", passed: true },
            { playerId: "player3", passed: true },
          ],
        },
      };
      expect(shouldEndBidding(mockPlayers, auctionWithBids)).toBe(true);
    });

    it("should return false when multiple players have not passed", () => {
      const auctionWithBids: Auction = {
        ...mockAuction,
        currentBlueprint: {
          blueprint: {
            id: "test",
            type: "coal_plant",
            name: "Test Plant",
            powerGenerationKW: 1000,
            startingPrice: 10,
          },
          bids: [
            { playerId: "player1", amount: 10 },
            { playerId: "player2", amount: 12 },
            { playerId: "player3", passed: true },
          ],
        },
      };
      expect(shouldEndBidding(mockPlayers, auctionWithBids)).toBe(false);
    });
  });

  describe("shouldEndAuction", () => {
    it("should return false when there is no auction", () => {
      expect(shouldEndAuction(mockPlayers, null as any)).toBe(false);
    });

    it("should return true when all players have either passed or purchased", () => {
      const auctionComplete: Auction = {
        ...mockAuction,
        passedPlayerIds: ["player1", "player3"],
        purchases: [{ playerId: "player2", blueprintId: "test", price: 10 }],
      };
      expect(shouldEndAuction(mockPlayers, auctionComplete)).toBe(true);
    });

    it("should return false when some players have not passed or purchased", () => {
      const auctionIncomplete: Auction = {
        ...mockAuction,
        passedPlayerIds: ["player1"],
        purchases: [{ playerId: "player2", blueprintId: "test", price: 10 }],
      };
      expect(shouldEndAuction(mockPlayers, auctionIncomplete)).toBe(false);
    });
  });

  describe("processBlueprintWinner", () => {
    it("should return null when there is no current blueprint", () => {
      expect(processBlueprintWinner(mockPlayers, mockAuction)).toBeNull();
    });

    it("should return null when there are no valid bids", () => {
      const auctionWithNoBids: Auction = {
        ...mockAuction,
        currentBlueprint: {
          blueprint: {
            id: "test",
            type: "coal_plant",
            name: "Test Plant",
            powerGenerationKW: 1000,
            startingPrice: 10,
          },
          bids: [
            { playerId: "player1", passed: true },
            { playerId: "player2", passed: true },
          ],
        },
      };
      expect(processBlueprintWinner(mockPlayers, auctionWithNoBids)).toBeNull();
    });

    it("should process winner correctly", () => {
      const auctionWithBids: Auction = {
        ...mockAuction,
        currentBlueprint: {
          blueprint: {
            id: "test",
            type: "coal_plant",
            name: "Test Plant",
            powerGenerationKW: 1000,
            startingPrice: 10,
          },
          bids: [
            { playerId: "player1", amount: 10 },
            { playerId: "player2", amount: 15 },
            { playerId: "player3", passed: true },
          ],
        },
      };

      const result = processBlueprintWinner(mockPlayers, auctionWithBids);
      expect(result).not.toBeNull();
      expect(result!.currentBlueprint).toBeNull();
      expect(result!.purchases).toHaveLength(1);
      expect(result!.purchases[0]).toEqual({
        playerId: "player2",
        blueprintId: "test",
        price: 15,
      });
      expect(result!.availableBlueprints).toHaveLength(0);
    });
  });
});
