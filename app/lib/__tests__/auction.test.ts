import { getBidderPriorityOrder, getCurrentBidderId } from "../auction";
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

  describe("getCurrentBidderId", () => {
    it("should return first player when no one has passed or purchased", () => {
      const currentBidder = getCurrentBidderId(
        mockPlayers,
        mockAuction,
        0,
        123
      );
      expect(currentBidder).toBe("player1");
    });

    it("should skip players who have passed", () => {
      const auctionWithPass: Auction = {
        ...mockAuction,
        passedPlayerIds: ["player1"],
      };
      const currentBidder = getCurrentBidderId(
        mockPlayers,
        auctionWithPass,
        0,
        123
      );
      expect(currentBidder).toBe("player3");
    });

    it("should skip players who have purchased", () => {
      const auctionWithPurchase: Auction = {
        ...mockAuction,
        purchases: [{ playerId: "player1", blueprintId: "test", price: 10 }],
      };
      const currentBidder = getCurrentBidderId(
        mockPlayers,
        auctionWithPurchase,
        0,
        123
      );
      expect(currentBidder).toBe("player3");
    });

    it("should return undefined when all players have passed or purchased", () => {
      const auctionComplete: Auction = {
        ...mockAuction,
        passedPlayerIds: ["player1", "player3"],
        purchases: [{ playerId: "player2", blueprintId: "test", price: 10 }],
      };
      const currentBidder = getCurrentBidderId(
        mockPlayers,
        auctionComplete,
        0,
        123
      );
      expect(currentBidder).toBeUndefined();
    });
  });
});
