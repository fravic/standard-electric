import React, { useMemo } from "react";
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
  }, []);

  if (!auction) return null;

  const currentBidderId = auctionSystem.getNextBidder({
    players,
    auction,
    totalTicks: time.totalTicks,
    randomSeed,
  });
  const isCurrentBidder = currentBidderId === userId;
  const currentInitiatorId = auctionSystem.getNextInitiator({
    players,
    auction,
    totalTicks: time.totalTicks,
    randomSeed,
  });
  const isCurrentInitiator = currentInitiatorId === userId;
  const currentPlayer = userId ? players[userId] : undefined;

  // Calculate minimum bid if there's a current blueprint
  const currentBid = auction.currentBlueprint?.bids
    .filter((bid) => !bid.passed)
    .reduce((max, bid) => Math.max(max, bid.amount || 0), 0);
  const currentBlueprint = auction.currentBlueprint
    ? entitiesById[auction.currentBlueprint.blueprintId]
    : null;
  const minimumBid = currentBid ? currentBid + 1 : currentBlueprint?.cost?.amount;
  const canAffordBid = minimumBid && currentPlayer ? currentPlayer.money >= minimumBid : false;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/75">
      <Card className="max-w-[600px] w-full">
        <h2 className="mt-0 mb-4 text-foreground font-serif-extra">Power Plant Auction</h2>

        <AuctionBidder
          players={players}
          auction={auction}
          totalTicks={time.totalTicks}
          randomSeed={randomSeed}
        />

        {auction.currentBlueprint && (
          <Card variant="secondary" className="mb-4">
            <h3 className="mt-0 mb-4 text-foreground font-serif-extra">Current Auction</h3>
            <BuildButton
              variant="bid"
              name={currentBlueprint?.name || ""}
              details={{
                powerGenerationKW:
                  currentBlueprint?.blueprint?.components?.powerGeneration?.powerGenerationKW || 0,
                requiredRegion:
                  currentBlueprint?.blueprint?.components?.requiredRegion?.requiredRegionName,
              }}
              price={minimumBid || 0}
              disabled={true}
              onClick={() => {}}
              className="border border-black/20"
            />
            <div className="mt-4 flex flex-col gap-2">
              <h4 className="mt-0 mb-2 text-foreground font-serif-extra">Bids</h4>
              {auction.currentBlueprint.bids.map((bid, index) => (
                <div
                  key={index}
                  className="flex justify-between rounded bg-black/5 p-2 text-foreground"
                >
                  <span>{players[bid.playerId].name}</span>
                  <span>{bid.passed ? "Passed" : bid.amount ? `$${bid.amount}` : ""}</span>
                </div>
              ))}
            </div>
            {isCurrentBidder && (
              <div className="mt-4 flex gap-2">
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

        <div className="flex flex-col gap-2">
          <h3 className="mt-0 mb-4 text-foreground font-serif-extra">Available Power Plants</h3>
          {auction.availableBlueprintIds.map((blueprintId) => {
            const blueprint = entitiesById[blueprintId];
            if (!blueprint) return null;
            return (
              <BuildButton
                key={blueprintId}
                variant="bid"
                name={blueprint.name || ""}
                details={{
                  powerGenerationKW:
                    blueprint.blueprint?.components?.powerGeneration?.powerGenerationKW,
                  requiredRegion:
                    blueprint.blueprint?.components?.requiredRegion?.requiredRegionName,
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
          {isCurrentInitiator && !auction.currentBlueprint && auction.isPassingAllowed && (
            <Button
              fullWidth
              className="mt-4"
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
