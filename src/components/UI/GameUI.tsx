import React from "react";
import { useGameStore } from "../../store/gameStore";
import { PLAYER_ID } from "../../store/constants";

const styles = {
  container: {
    position: "fixed" as const,
    top: "10px",
    left: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "white",
    padding: "10px",
    borderRadius: "5px",
    fontFamily: "monospace",
    fontSize: "14px",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },
  money: {
    fontSize: "16px",
    fontWeight: "bold" as const,
  },
  button: {
    backgroundColor: "#4CAF50",
    border: "none",
    color: "white",
    padding: "8px 16px",
    textAlign: "center" as const,
    textDecoration: "none",
    display: "inline-block",
    fontSize: "14px",
    margin: "4px 2px",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "background-color 0.3s",
    "&:hover": {
      backgroundColor: "#45a049",
    },
  },
  activeButton: {
    backgroundColor: "#45a049",
  },
};

export function GameUI() {
  const player = useGameStore((state) => state.players[PLAYER_ID]);
  const setBuildMode = useGameStore((state) => state.setBuildMode);

  if (!player) return null;

  return (
    <div style={styles.container}>
      <div style={styles.money}>Money: ${player.money}</div>
      <button
        style={{
          ...styles.button,
          ...(player.isBuildMode ? styles.activeButton : {}),
        }}
        onClick={() => setBuildMode(PLAYER_ID, !player.isBuildMode)}
      >
        {player.isBuildMode ? "Exit Build Mode" : "Build Power Pole ($1)"}
      </button>
    </div>
  );
}
