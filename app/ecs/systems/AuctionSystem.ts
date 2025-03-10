import { World } from "miniplex";
import { Draft } from "immer";
import seedrandom from "seedrandom";

import { Player, Auction, GameContext } from "@/actor/game.types";
import { Entity, EntitySchema } from "../entity";
import { System, SystemContext, SystemResult } from "./System";
import powerPlantBlueprintsData from "../../../public/powerPlantBlueprints.json";

/**
 * Context for the AuctionSystem
 */
export interface AuctionContext extends SystemContext {
  totalTicks: number;
  players: Record<string, Player>;
  auction: Auction | null;
  randomSeed?: number;
}

/**
 * Result of the AuctionSystem operations
 */
export interface AuctionResult extends SystemResult {
  auction: Auction | null;
  purchasesToProcess?: Array<{
    playerId: string;
    blueprintId: string;
    price: number;
  }>;
  entitiesToAdd?: Entity[];
}

/**
 * Handles auction logic for power plant blueprints
 * Implements the System interface for standardized system integration
 */
export class AuctionSystem implements System<AuctionContext, AuctionResult> {
  /**
   * Initializes the system with the world and context
   * @param world The current Miniplex world
   * @param context AuctionContext needed for initialization
   */
  public initialize(world: World<Entity>, context: AuctionContext): void {
    // No initialization needed
  }

  /**
   * Updates the auction state based on the current context
   * @param world The current Miniplex world
   * @param context AuctionContext needed for the update
   * @returns AuctionResult with updated auction state
   */
  public update(world: World<Entity>, context: AuctionContext): AuctionResult {
    // This is a no-op by default, just return the current auction state
    // Auction logic is primarily triggered by events, not the update loop
    return {
      success: true,
      auction: context.auction,
    };
  }

  // Old mutate method removed to implement the new System interface

  /**
   * Start a new auction with the provided blueprints
   * @param availableBlueprintIds IDs of blueprints available for auction
   * @param allowPassing Whether passing is allowed in this auction
   * @returns A new Auction object
   */
  public startAuction(
    auctionContext: AuctionContext,
    allowPassing: boolean = true
  ): AuctionResult {
    // TODO: Should set up a different set of blueprints each auction. Only one auction for now.
    // Parse the entities from the JSON file using the EntitySchema
    const powerPlantEntities = (powerPlantBlueprintsData as any[]).map(blueprint => 
      EntitySchema.parse(blueprint)
    );
    const availableEntities = powerPlantEntities.slice(
      0,
      // First auction has at least one blueprint per player
      Math.max(Object.keys(auctionContext.players).length, 3)
    );
    const blueprintIds = availableEntities.map(entity => entity.id);

    const auction = {
      currentBlueprint: null,
      availableBlueprintIds: blueprintIds,
      purchases: [],
      isPassingAllowed: allowPassing,
      passedPlayerIds: [],
    };
    
    return {
      success: true,
      auction,
      purchasesToProcess: [],
      entitiesToAdd: availableEntities
    };
  }

  /**
   * Initiate bidding on a specific blueprint
   * @param auction Current auction state
   * @param blueprintId ID of the blueprint to bid on
   * @param initiatorPlayerId ID of the player initiating the bid
   * @param initialBidAmount Initial bid amount
   * @returns Updated auction state or null if invalid
   */
  public auctionInitiateBid(
    auction: Auction,
    blueprintId: string,
    initiatorPlayerId: string,
    initialBidAmount: number
  ): AuctionResult {
    if (!auction || !blueprintId || !initiatorPlayerId) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    // Check if blueprint is available
    if (!auction.availableBlueprintIds.includes(blueprintId)) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    const updatedAuction = {
      ...auction,
      currentBlueprint: {
        blueprintId,
        bids: [
          {
            playerId: initiatorPlayerId,
            amount: initialBidAmount,
          },
        ],
      },
    };
    
    return {
      success: true,
      auction: updatedAuction,
      purchasesToProcess: []
    };
  }

  /**
   * Record a player passing on the entire auction
   * @param auction Current auction state
   * @param playerId ID of the player passing
   * @returns Updated auction state or null if invalid
   */
  public auctionPass(
    auction: Auction,
    playerId: string
  ): AuctionResult {
    if (!auction || !playerId) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    // Check if passing is allowed
    if (!auction.isPassingAllowed) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    // Check if player has already passed
    if (auction.passedPlayerIds.includes(playerId)) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    const updatedAuction = {
      ...auction,
      passedPlayerIds: [...auction.passedPlayerIds, playerId],
    };
    
    return {
      success: true,
      auction: updatedAuction,
      purchasesToProcess: []
    };
  }

  /**
   * Record a player placing a bid on the current blueprint
   * @param auction Current auction state
   * @param playerId ID of the player bidding
   * @param amount Bid amount
   * @param players Map of player information to check funds
   * @returns Updated auction state or null if invalid
   */
  public auctionPlaceBid(
    auction: Auction,
    playerId: string,
    amount: number,
    players: Record<string, Player>
  ): AuctionResult {
    if (!auction?.currentBlueprint || !playerId) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    // Check if player can afford the bid
    if (!this.canPlayerAffordBid(players[playerId], amount)) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    // Check if player has already purchased
    if (auction.purchases.some(p => p.playerId === playerId)) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    const updatedAuction = {
      ...auction,
      currentBlueprint: {
        ...auction.currentBlueprint,
        bids: [
          ...auction.currentBlueprint.bids,
          {
            playerId,
            amount,
          },
        ],
      },
    };
    
    return {
      success: true,
      auction: updatedAuction,
      purchasesToProcess: []
    };
  }

  /**
   * Record a player passing on bidding for the current blueprint
   * @param auction Current auction state
   * @param playerId ID of the player passing
   * @returns Updated auction state or null if invalid
   */
  public auctionPassBid(
    auction: Auction,
    playerId: string
  ): AuctionResult {
    if (!auction?.currentBlueprint || !playerId) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    // Check if player has already passed or bid on this blueprint
    const playerBids = auction.currentBlueprint.bids.filter(bid => bid.playerId === playerId);
    if (playerBids.some(bid => bid.passed)) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    const updatedAuction = {
      ...auction,
      currentBlueprint: {
        ...auction.currentBlueprint,
        bids: [
          ...auction.currentBlueprint.bids,
          {
            playerId,
            passed: true,
          },
        ],
      },
    };
    
    return {
      success: true,
      auction: updatedAuction,
      purchasesToProcess: []
    };
  }

  /**
   * End bidding on the current blueprint and process the winner
   * @param auction Current auction state
   * @param players Map of player information
   * @returns Updated auction state or null if invalid
   */
  public endBidding(
    auction: Auction,
    players: Record<string, Player>
  ): AuctionResult {
    const updatedAuction = this.processBlueprintWinner(players, auction);
    if (!updatedAuction) {
      return { success: false, auction: null, purchasesToProcess: [] };
    }
    
    // Find the newest purchase that was just added
    const newPurchases = [];
    if (updatedAuction.purchases.length > auction.purchases.length) {
      // Get the most recently added purchase
      const latestPurchase = updatedAuction.purchases[updatedAuction.purchases.length - 1];
      newPurchases.push(latestPurchase);
    }
    
    return {
      success: true,
      auction: updatedAuction,
      purchasesToProcess: newPurchases
    };
  }

  /**
   * Get the ID of the next player who should initiate bidding
   * @param context AuctionContext containing player and auction data
   * @returns Player ID or undefined if no eligible initiator
   */
  public getNextInitiator(context: AuctionContext): string | undefined {
    if (!context.auction) return undefined;
    
    return this.getNextInitiatorPlayerId(
      context.players,
      context.auction,
      context.totalTicks,
      context.randomSeed || 0
    );
  }

  /**
   * Get the ID of the next player who should bid on the current blueprint
   * @param context AuctionContext containing player and auction data
   * @returns Player ID or null if no eligible bidder
   */
  public getNextBidder(context: AuctionContext): string | null {
    if (!context.auction) return null;
    
    return this.getNextBidderPlayerId(
      context.players,
      context.auction,
      context.totalTicks,
      context.randomSeed || 0
    );
  }

  /**
   * Check if bidding should end for the current blueprint
   * @param context AuctionContext containing player and auction data
   * @returns True if bidding should end
   */
  public shouldEndBidding(context: AuctionContext): boolean {
    if (!context.auction) return false;
    
    return this.shouldEndBiddingInternal(context.players, context.auction);
  }

  /**
   * Check if the entire auction should end
   * @param context AuctionContext containing player and auction data
   * @returns True if the auction should end
   */
  public shouldEndAuction(context: AuctionContext): boolean {
    if (!context.auction) return false;
    
    return this.shouldEndAuctionInternal(context.players, context.auction);
  }
  
  /**
   * Implements the System.mutate method
   * Performs mutations on the game context based on the auction result
   * @param result The result from the update method
   * @param contextDraft An Immer draft of the entire game context
   */
  public mutate(
    result: AuctionResult,
    contextDraft: Draft<GameContext>
  ): void {
    // Update the auction state in the public context
    if (result.auction) {
      contextDraft.public.auction = result.auction;
    } else if (contextDraft.public.auction) {
      // If the auction is null in the result but exists in the context, end it
      contextDraft.public.auction = null;
    }

    // Process each purchase
    result.purchasesToProcess?.forEach(purchase => {
      const { playerId, blueprintId, price } = purchase;
      
      // Update player money in public context
      if (contextDraft.public.players[playerId]) {
        contextDraft.public.players[playerId].money -= price;
      }
      
      // Add blueprint to player inventory
      if (contextDraft.public.entitiesById[blueprintId]) {
        const blueprint = contextDraft.public.entitiesById[blueprintId];
        
        // Set the owner of the blueprint to the player
        if (blueprint) {
          blueprint.owner = { playerId };
        }
      }
    });

    // Process each entity to add
    result.entitiesToAdd?.forEach(entity => {
      contextDraft.public.entitiesById[entity.id] = entity;
    });
  }
  
  /**
   * Returns the order in which players should bid, based on their power sold.
   * Players who have sold less power get priority (ascending order).
   * In case of a tie, players are ordered randomly using a seeded random number generator.
   * @private
   */
  private getBidderPriorityOrder(
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
   * @private
   */
  private getNextInitiatorPlayerId(
    players: Record<string, Player>,
    auction: Auction,
    totalTicks: number,
    randomSeed: number
  ): string | undefined {
    const bidderOrder = this.getBidderPriorityOrder(
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
   * @private
   */
  private getNextBidderPlayerId(
    players: Record<string, Player>,
    auction: Auction,
    totalTicks: number,
    randomSeed: number
  ): string | null {
    if (!auction.currentBlueprint) return null;

    const bidderOrder = this.getBidderPriorityOrder(
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
   * @private
   */
  private canPlayerAffordBid(player: Player, amount: number): boolean {
    return player.money >= amount;
  }

  /**
   * Checks if bidding should end on the current blueprint
   * @private
   */
  private shouldEndBiddingInternal(
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
   * @private
   */
  private shouldEndAuctionInternal(
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
   * @private
   */
  private processBlueprintWinner(
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

    const blueprintId = auction.currentBlueprint.blueprintId;
    const winner = players[winningBid.playerId];

    // Create new auction state
    return {
      ...auction,
      currentBlueprint: null,
      availableBlueprintIds: auction.availableBlueprintIds.filter(
        (id) => id !== blueprintId
      ),
      purchases: [
        ...auction.purchases,
        {
          playerId: winningBid.playerId,
          blueprintId: blueprintId,
          price: winningBid.amount,
        },
      ],
    };
  }
}
