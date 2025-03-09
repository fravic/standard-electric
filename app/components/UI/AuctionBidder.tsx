import React from "react";
import { UI_COLORS } from "@/lib/palette";
import { Player, Auction } from "@/actor/game.types";
import {
  getBidderPriorityOrder,
  getNextBidderPlayerId,
  getNextInitiatorPlayerId,
} from "@/lib/auction";
import { GameContext } from "@/actor/game.context";

interface AuctionBidderProps {
  players: Record<string, Player>;
  auction: Auction;
  totalTicks: number;
  randomSeed: number;
}

export function AuctionBidder({
  players,
  auction,
  totalTicks,
  randomSeed,
}: AuctionBidderProps) {
  const bidderOrder = getBidderPriorityOrder(
    players,
    auction,
    totalTicks,
    randomSeed
  );

  // Ensure these arrays exist with defaults
  const passedPlayerIds = auction.passedPlayerIds ?? [];
  const purchases = auction.purchases ?? [];
  const currentBidderId = getNextBidderPlayerId(
    players,
    auction,
    totalTicks,
    randomSeed
  );
  const currentInitiatorId = getNextInitiatorPlayerId(
    players,
    auction,
    totalTicks,
    randomSeed
  );
  const entitiesById = GameContext.useSelector((state) => state.public.entitiesById);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginBottom: "1rem",
      }}
    >
      <h3
        style={{
          color: UI_COLORS.TEXT_LIGHT,
          marginTop: 0,
          marginBottom: "0.5rem",
        }}
      >
        Bidding Order
      </h3>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {bidderOrder.map((playerId) => {
          const player = players[playerId];
          const hasPassed = passedPlayerIds.includes(playerId);
          const purchase = purchases.find((p) => p.playerId === playerId);
          const isInactive = hasPassed || purchase;
          const isInitiator = playerId === currentInitiatorId;
          const isBidder = playerId === currentBidderId;
          const isPlayerTurn =
            (auction.currentBlueprint && isBidder) ||
            (!auction.currentBlueprint && isInitiator);

          return (
            <div
              key={playerId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                opacity: isInactive ? 0.5 : 1,
                color: UI_COLORS.TEXT_LIGHT,
                padding: "0.5rem",
                backgroundColor: isPlayerTurn
                  ? UI_COLORS.PRIMARY_DARK
                  : "transparent",
                borderRadius: "4px",
              }}
            >
              {isPlayerTurn && <span style={{ marginRight: "0.5rem" }}>➜</span>}
              <span>{player.name}</span>
              <span style={{ marginLeft: "auto", fontSize: "0.9em" }}>
                {hasPassed
                  ? "(Passed)"
                  : purchase
                  ? `(Bought ${
                      entitiesById[purchase.blueprintId]
                        ?.name ?? "Unknown Plant"
                    })`
                  : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
