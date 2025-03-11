import React, { useMemo } from "react";
import { UI_COLORS } from "@/lib/palette";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { BuildButton } from "./BuildButton";
import { AuctionBidder } from "./AuctionBidder";
import { Button } from "./Button";
import { Card } from "./Card";
import { AuctionSystem } from "@/ecs/systems/AuctionSystem";

export function PowerPlantAuction() {
  const userId = AuthContext.useSelector((state) => state.userId);
  const { auction, players, time, randomSeed, entitiesById } = GameContext.useSelector(
    (state) => state.public
  );
  const sendGameEvent = GameContext.useSend();
  const auctionSystem = useMemo(() => {
    return new AuctionSystem();
  }, [])

  if (!auction) return null;

  const currentBidderId = auctionSystem.getNextBidder({
    players,
    auction,
    totalTicks: time.totalTicks,
    randomSeed
  });
  const isCurrentBidder = currentBidderId === userId;
  const currentInitiatorId = auctionSystem.getNextInitiator({
    players,
    auction,
    totalTicks: time.totalTicks,
    randomSeed
  });
  const isCurrentInitiator = currentInitiatorId === userId;
  const currentPlayer = userId ? players[userId] : undefined;

  // Calculate minimum bid if there's a current blueprint
  const currentBid = auction.currentBlueprint?.bids
    .filter((bid) => !bid.passed)
    .reduce((max, bid) => Math.max(max, bid.amount || 0), 0);
  const currentBlueprint = auction.currentBlueprint ? entitiesById[auction.currentBlueprint.blueprintId] : null;
  const minimumBid = currentBid
    ? currentBid + 1
    : currentBlueprint?.cost?.amount;
  const canAffordBid =
    minimumBid && currentPlayer ? currentPlayer.money >= minimumBid : false;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card style={{ maxWidth: "600px", width: "100%" }}>
        <h2
          style={{
            color: UI_COLORS.TEXT_LIGHT,
            marginTop: 0,
            marginBottom: "1rem",
          }}
        >
          Power Plant Auction
        </h2>

        <AuctionBidder
          players={players}
          auction={auction}
          totalTicks={time.totalTicks}
          randomSeed={randomSeed}
        />

        {auction.currentBlueprint && (
          <Card variant="dark" style={{ marginBottom: "1rem" }}>
            <h3
              style={{
                color: UI_COLORS.TEXT_LIGHT,
                marginTop: 0,
                marginBottom: "1rem",
              }}
            >
              Current Auction
            </h3>
            <BuildButton
              variant="bid"
              name={currentBlueprint?.name || ''}
              details={{
                powerGenerationKW:
                  currentBlueprint?.blueprint?.components?.powerGeneration?.powerGenerationKW || 0,
                requiredRegion: currentBlueprint?.blueprint?.components?.requiredRegion?.requiredRegionName,
              }}
              price={minimumBid || 0}
              disabled={true}
              onClick={() => {}}
              style={{
                border: "1px solid rgba(255, 255, 255, 0.4)",
              }}
            />
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <h4
                style={{
                  color: UI_COLORS.TEXT_LIGHT,
                  marginTop: 0,
                  marginBottom: "0.5rem",
                }}
              >
                Bids
              </h4>
              {auction.currentBlueprint.bids.map((bid, index) => (
                <div
                  key={index}
                  style={{
                    color: UI_COLORS.TEXT_LIGHT,
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    borderRadius: "4px",
                  }}
                >
                  <span>{players[bid.playerId].name}</span>
                  <span>
                    {bid.passed ? "Passed" : bid.amount ? `$${bid.amount}` : ""}
                  </span>
                </div>
              ))}
            </div>
            {isCurrentBidder && (
              <div
                style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}
              >
                <Button
                  fullWidth
                  disabled={!canAffordBid}
                  onClick={() => {
                    if (auction.currentBlueprint && minimumBid) {
                      sendGameEvent({
                        type: "AUCTION_PLACE_BID",
                        amount: minimumBid,
                      });
                    }
                  }}
                >
                  Bid ${minimumBid}
                </Button>
                <Button
                  fullWidth
                  onClick={() => {
                    if (auction.currentBlueprint) {
                      sendGameEvent({
                        type: "AUCTION_PASS_BID",
                      });
                    }
                  }}
                >
                  Pass
                </Button>
              </div>
            )}
          </Card>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <h3
            style={{
              color: UI_COLORS.TEXT_LIGHT,
              marginTop: 0,
              marginBottom: "1rem",
            }}
          >
            Available Power Plants
          </h3>
          {auction.availableBlueprintIds.map((blueprintId) => {
            const blueprint = entitiesById[blueprintId];
            if (!blueprint) return null;
            return (
            <BuildButton
              key={blueprintId}
              variant="bid"
              name={blueprint.name || ''}
              details={{
                powerGenerationKW: blueprint.blueprint?.components?.powerGeneration?.powerGenerationKW,
                requiredRegion: blueprint.blueprint?.components?.requiredRegion?.requiredRegionName,
              }}
              price={blueprint.auctionable?.startingPrice || 0}
              disabled={
                !isCurrentInitiator ||
                auction.currentBlueprint !== null ||
                (currentPlayer?.money ?? 0) < (blueprint.auctionable?.startingPrice || 0)
              }
              onClick={() =>
                sendGameEvent({
                  type: "INITIATE_BID",
                  blueprintId: blueprintId,
                })
              }
            />
            );
          })}
          {isCurrentInitiator &&
            !auction.currentBlueprint &&
            auction.isPassingAllowed && (
              <Button
                fullWidth
                style={{ marginTop: "1rem" }}
                onClick={() => sendGameEvent({ type: "PASS_AUCTION" })}
              >
                Pass Auction
              </Button>
            )}
        </div>
      </Card>
    </div>
  );
}
