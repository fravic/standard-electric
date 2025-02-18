import { Player } from "@/actor/game.types";
import { Auction } from "@/actor/game.types";
import seedrandom from "seedrandom";

/**
 * Returns the order in which players should bid, based on their power sold.
 * Players who have sold less power get priority (ascending order).
 * In case of a tie, players are ordered randomly using a seeded random number generator.
 */
export function getBidderPriorityOrder(
  players: Record<string, Player>,
  auction: Auction,
  totalTicks: number,
  randomSeed: number
): string[] {
  // Create array of player IDs and their power sold
  const playerEntries = Object.entries(players).map(([id, player]) => ({
    id,
    powerSoldKWh: player.powerSoldKWh,
  }));

  // Create a seeded random number generator
  const rng = seedrandom(`${totalTicks}-${randomSeed}`);

  // Sort players by power sold (ascending)
  // If there's a tie, use seeded random number to break it
  return playerEntries
    .sort((a, b) => {
      const powerDiff = a.powerSoldKWh - b.powerSoldKWh;
      if (powerDiff !== 0) return powerDiff;
      return rng() - 0.5;
    })
    .map((entry) => entry.id);
}

/**
 * Returns the ID of the player whose turn it currently is to bid.
 * This is the first player in the priority order who hasn't passed or purchased.
 */
export function getCurrentBidderId(
  players: Record<string, Player>,
  auction: Auction,
  totalTicks: number,
  randomSeed: number
): string | undefined {
  const bidderOrder = getBidderPriorityOrder(
    players,
    auction,
    totalTicks,
    randomSeed
  );
  const passedPlayerIds = auction.passedPlayerIds ?? [];
  const purchases = auction.purchases ?? [];

  return bidderOrder.find(
    (playerId) =>
      !passedPlayerIds.includes(playerId) &&
      !purchases.some((p) => p.playerId === playerId)
  );
}
