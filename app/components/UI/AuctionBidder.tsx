import React, { useMemo } from "react";
import { GameContext } from "@/actor/game.context";
import { AuctionSystem } from "@/ecs/systems/AuctionSystem";
import { Auction, Player } from "@/actor/game.types";

interface AuctionBidderProps {
  players: Record<string, Player>;
  auction: Auction;
  totalTicks: number;
  randomSeed: number;
}

export function AuctionBidder({ players, auction, totalTicks, randomSeed }: AuctionBidderProps) {
  const auctionSystem = useMemo(() => {
    return new AuctionSystem();
  }, []);
  const { entitiesById } = GameContext.useSelector((state) => state.public);

  // Get current bidder and initiator
  const currentBidderId = auctionSystem.getNextBidder({
    players,
    auction,
    totalTicks,
    randomSeed,
  });
  const currentInitiatorId = auctionSystem.getNextInitiator({
    players,
    auction,
    totalTicks,
    randomSeed,
  });

  // Compute player orders
  const passedPlayerIds = auction.passedPlayerIds;
  const playerIds = Object.keys(players);
  const purchases: { playerId: string; blueprintId: string }[] = auction.purchases;

  // Compute player turn order
  const bidderOrder = auctionSystem.getBidderPriorityOrder(players, totalTicks, randomSeed);

  return (
    <div className="mb-4 rounded-lg bg-black/5 p-4">
      <div className="mb-2 font-serif-extra text-foreground">Bidders</div>

      <div className="flex flex-col gap-2">
        {bidderOrder.map((playerId: string) => {
          const player = players[playerId];
          const hasPassed = passedPlayerIds.includes(playerId);
          const purchase = purchases.find((p) => p.playerId === playerId);
          const isInactive = hasPassed || purchase;
          const isInitiator = playerId === currentInitiatorId;
          const isBidder = playerId === currentBidderId;
          const isPlayerTurn =
            (auction.currentBlueprint && isBidder) || (!auction.currentBlueprint && isInitiator);

          return (
            <div
              key={playerId}
              className={`flex items-center gap-2 rounded p-2 text-foreground ${
                isInactive ? "opacity-50" : ""
              } ${isPlayerTurn ? "bg-black/10" : ""}`}
            >
              {isPlayerTurn && <span className="mr-2">➜</span>}
              <span>{player.name}</span>
              <span className="ml-auto text-[0.9em]">
                {hasPassed
                  ? "(Passed)"
                  : purchase
                    ? `(Bought ${entitiesById[purchase.blueprintId]?.name ?? "Unknown Plant"})`
                    : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
