import React from "react";
import { UI_COLORS } from "@/lib/palette";
import { Player } from "@/actor/game.types";
import { formatPowerKWh } from "@/lib/power/formatPower";
import { Card } from "./Card";
import { PLAYER_COLORS } from "@/lib/constants";

const POWER_SELL_GOAL_KWH = 1_000_000_000; // 1 TWh in kWh

const styles = {
  container: {
    marginBottom: "10px",
    border: (isCurrentPlayer: boolean, playerColor: string) =>
      isCurrentPlayer ? `2px solid ${playerColor || UI_COLORS.PRIMARY}` : "none",
  },
  playerInfo: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "8px",
  },
  colorIndicator: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    display: "inline-block" as const,
  },
  money: {
    fontWeight: "bold" as const,
  },
  progressContainer: {
    width: "100%",
    backgroundColor: "#f1f1f1",
    borderRadius: "3px",
    marginTop: "5px",
    position: "relative" as const,
  },
  progressBar: {
    height: "20px",
    borderRadius: "3px",
    transition: "width 0.3s ease-in-out",
  },
  progressText: {
    position: "absolute" as const,
    width: "100%",
    color: UI_COLORS.TEXT_DARK,
    textShadow: "0px 1px 0px rgba(0,0,0,0.5)",
    fontSize: "12px",
    lineHeight: "20px",
    paddingLeft: "5px",
    top: 0,
  },
};

interface PlayerBarProps {
  player: Player;
  isCurrentPlayer?: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ player, isCurrentPlayer }) => {
  const powerProgress = Math.min(player.powerSoldKWh / POWER_SELL_GOAL_KWH, 1) * 100;
  const playerColor = player.color;

  return (
    <Card
      style={{
        ...styles.container,
        border: styles.container.border(isCurrentPlayer ?? false, playerColor),
      }}
    >
      <div style={styles.playerInfo}>
        <div 
          style={{ 
            ...styles.colorIndicator, 
            backgroundColor: playerColor 
          }} 
        />
        <div style={styles.money}>
          {player.name} - ${player.money}
        </div>
      </div>
      <div>
        <div>Power Sold Progress</div>
        <div style={styles.progressContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${powerProgress}%`,
              backgroundColor: playerColor,
            }}
          />
          <div style={styles.progressText}>{formatPowerKWh(player.powerSoldKWh)}</div>
        </div>
      </div>
    </Card>
  );
};
