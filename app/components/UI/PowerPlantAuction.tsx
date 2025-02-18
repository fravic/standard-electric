import React from "react";
import { UI_COLORS } from "@/lib/palette";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { BuildButton } from "./BuildButton";
import { AuctionBidder } from "./AuctionBidder";
import { Button } from "./Button";
import { Card } from "./Card";

export function PowerPlantAuction() {
  const userId = AuthContext.useSelector((state) => state.userId);
  const { auction, players, time, randomSeed } = GameContext.useSelector(
    (state) => state.public
  );
  const sendGameEvent = GameContext.useSend();

  if (!auction || !userId) return null;

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

        {auction.currentBlueprint ? (
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
              name={auction.currentBlueprint.blueprint.name}
              details={{
                powerGenerationKW:
                  auction.currentBlueprint.blueprint.powerGenerationKW,
                requiredState: auction.currentBlueprint.blueprint.requiredState,
              }}
              price={auction.currentBlueprint.blueprint.startingPrice}
              disabled={true}
              onClick={() => {}}
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
          </Card>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {auction.availableBlueprints.map((blueprint) => (
              <BuildButton
                key={blueprint.id}
                name={blueprint.name}
                details={{
                  powerGenerationKW: blueprint.powerGenerationKW,
                  requiredState: blueprint.requiredState,
                }}
                price={blueprint.startingPrice}
                onClick={() =>
                  sendGameEvent({
                    type: "AUCTION_PLACE_BID",
                    blueprintId: blueprint.id,
                    amount: blueprint.startingPrice,
                  })
                }
                isActive={
                  auction.currentBlueprint?.blueprint.id === blueprint.id
                }
              />
            ))}
          </div>
        )}

        <Button
          fullWidth
          style={{ marginTop: "1rem" }}
          disabled={!auction.isPassingAllowed}
          onClick={() => sendGameEvent({ type: "AUCTION_PASS" })}
        >
          Pass
        </Button>
      </Card>
    </div>
  );
}
