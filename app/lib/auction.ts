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
 * Returns the ID of the player whose turn it is to initiate the next auction.
 * This is the first player in the priority order who hasn't passed or purchased.
 */
export function getNextInitiatorPlayerId(
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

/**
 * Returns the ID of the player whose turn it is to bid on the current blueprint.
 * Returns null if there is no current blueprint.
 * Only players who haven't purchased a blueprint can bid.
 * The order follows the priority order, starting after the last bidder.
 */
export function getNextBidderPlayerId(
  players: Record<string, Player>,
  auction: Auction,
  totalTicks: number,
  randomSeed: number
): string | null {
  if (!auction.currentBlueprint) return null;

  const bidderOrder = getBidderPriorityOrder(
    players,
    auction,
    totalTicks,
    randomSeed
  );

  // Filter out players who have already purchased or passed the auction
  const eligibleBidders = bidderOrder.filter(
    (playerId) =>
      !auction.purchases.some((p) => p.playerId === playerId) &&
      !auction.passedPlayerIds.includes(playerId)
  );

  if (eligibleBidders.length === 0) return null;

  const bids = auction.currentBlueprint.bids;
  if (bids.length === 0) return eligibleBidders[0];

  // Get the last non-passed bid
  const lastBid = bids[bids.length - 1];
  if (!lastBid) return eligibleBidders[0];

  // Find the index of the last bidder
  const lastBidderIndex = eligibleBidders.indexOf(lastBid.playerId);
  if (lastBidderIndex === -1) return eligibleBidders[0];

  // Return the next eligible bidder in the order
  return eligibleBidders[(lastBidderIndex + 1) % eligibleBidders.length];
}

/**
 * Checks if a player can afford to make a bid
 */
export function canPlayerAffordBid(player: Player, amount: number): boolean {
  return player.money >= amount;
}

/**
 * Checks if bidding should end on the current blueprint
 */
export function shouldEndBidding(
  players: Record<string, Player>,
  auction: Auction
): boolean {
  if (!auction?.currentBlueprint) return false;

  // Count how many players have not passed
  const bids = auction.currentBlueprint.bids;
  const activePlayers = new Set(
    Object.keys(players).filter(
      (playerId) => !auction.purchases.some((p) => p.playerId === playerId)
    )
  );

  // Count passed players from bids
  const passedPlayers = new Set(
    bids.filter((bid) => bid.passed).map((bid) => bid.playerId)
  );

  // Only one player left bidding
  return activePlayers.size - passedPlayers.size <= 1;
}

/**
 * Checks if the entire auction should end
 */
export function shouldEndAuction(
  players: Record<string, Player>,
  auction: Auction
): boolean {
  if (!auction) return false;

  const allPlayers = Object.keys(players);
  const purchasedPlayers = new Set(auction.purchases.map((p) => p.playerId));
  const passedPlayers = new Set(auction.passedPlayerIds);

  // All players must have either passed or purchased
  return allPlayers.every(
    (playerId) => purchasedPlayers.has(playerId) || passedPlayers.has(playerId)
  );
}

/**
 * Processes the end of bidding on a blueprint
 */
export function processBlueprintWinner(
  players: Record<string, Player>,
  auction: Auction
): Auction | null {
  if (!auction?.currentBlueprint) return null;

  // Find the winning bid (highest non-passed bid)
  const winningBid = auction.currentBlueprint.bids
    .filter((bid) => !bid.passed && bid.amount !== undefined)
    .reduce((highest, current) => {
      if (!highest || (current.amount || 0) > (highest.amount || 0)) {
        return current;
      }
      return highest;
    }, null as { playerId: string; amount?: number } | null);

  if (!winningBid || !winningBid.amount) return null;

  const blueprint = auction.currentBlueprint.blueprint;
  const winner = players[winningBid.playerId];

  // Create new auction state
  return {
    ...auction,
    currentBlueprint: null,
    availableBlueprints: auction.availableBlueprints.filter(
      (b) => b.id !== blueprint.id
    ),
    purchases: [
      ...auction.purchases,
      {
        playerId: winningBid.playerId,
        blueprintId: blueprint.id,
        price: winningBid.amount,
      },
    ],
  };
}
