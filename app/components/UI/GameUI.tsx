import React, { useState } from "react";
import { HexPreviewTooltip } from "./HexPreviewTooltip";
import { TerrainPaintUI } from "./TerrainPaintUI";
import { HOURS_PER_DAY } from "../../lib/constants";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { UI_COLORS } from "@/lib/palette";
import { isDayTime } from "@/lib/time";
import { PlayerBar } from "./PlayerBar";
import { BuildBar } from "./BuildBar";
import { Lobby } from "./Lobby";
import { PowerPlantAuction } from "./PowerPlantAuction";
import { HexDetails } from "./HexDetails";
import { CommodityMarketModal } from "./CommodityMarketModal";
import { Button } from "./Button";
import { clientStore } from "@/lib/clientState";
import { useSelector } from "@xstate/store/react";

const styles = {
  playersContainer: {
    position: "fixed" as const,
    top: "10px",
    left: "10px",
    zIndex: 1000,
    maxHeight: "calc(100vh - 20px)",
    overflowY: "auto" as const,
    width: "300px",
  },
  timeContainer: {
    position: "fixed" as const,
    top: "10px",
    right: "10px",
    backgroundColor: UI_COLORS.BACKGROUND,
    color: "white",
    padding: "10px",
    borderRadius: "5px",
    fontFamily: "monospace",
    zIndex: 1000,
  },
  marketButton: {
    position: "fixed" as const,
    top: "70px",
    right: "10px",
    zIndex: 1000,
  },
};

export const GameUI: React.FC = () => {
  const [showMarketModal, setShowMarketModal] = useState(false);

  const userId = AuthContext.useSelector((state) => state.userId);
  const { players, time } = GameContext.useSelector((state) => state.public);
  const currentPlayer = userId ? players[userId] : undefined;
  const { totalTicks } = time;
  const timeEmoji = isDayTime(totalTicks) ? "☀️" : "🌙";
  const dayNumber = Math.floor(totalTicks / HOURS_PER_DAY) + 1;
  const isLobby = GameContext.useMatches("lobby");
  const isAuction = GameContext.useMatches("auction");
  const isDebug = useSelector(clientStore, (state) => state.context.isDebug);
  const selectedHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.selectedHexCoordinates
  );

  // Sort players so current player is first, then alphabetically by name
  const sortedPlayers = Object.entries(players).sort(([id1, p1], [id2, p2]) => {
    if (id1 === userId) return -1;
    if (id2 === userId) return 1;
    return p1.name.localeCompare(p2.name);
  });

  return (
    <>
      <div style={styles.playersContainer}>
        {sortedPlayers.map(([playerId, player]) => (
          <PlayerBar
            key={playerId}
            player={player}
            isCurrentPlayer={playerId === userId}
          />
        ))}
        {!isLobby && currentPlayer && <BuildBar player={currentPlayer} />}
      </div>
      {!isLobby && (
        <>
          <div style={styles.timeContainer}>
            Day {dayNumber} {timeEmoji}
          </div>
          <div style={styles.marketButton}>
            <Button onClick={() => setShowMarketModal(true)}>
              Commodity Market
            </Button>
          </div>
          <TerrainPaintUI />
          <HexPreviewTooltip />
          {!isDebug && <HexDetails />}
        </>
      )}
      {isAuction && <PowerPlantAuction />}
      {isLobby && <Lobby players={players} />}
      {showMarketModal && (
        <CommodityMarketModal onClose={() => setShowMarketModal(false)} />
      )}
    </>
  );
};
