import React from "react";
import { useGameStore } from "../../store/gameStore";
import { HexDetailsUI } from "../HexGrid/HexDetailsUI";
import { TerrainPaintUI } from "./TerrainPaintUI";
import { Clock } from "./Clock";
import { PLAYER_ID } from "@/constants";

const styles = {
  buildContainer: {
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
  },
  activeButton: {
    backgroundColor: "#45a049",
  },
};

const ClientGameUI: React.FC = () => {
  const player = useGameStore((state) => state.players[PLAYER_ID]);
  const setBuildMode = useGameStore((state) => state.setBuildMode);

  if (!player) return null;

  return (
    <>
      <div style={styles.buildContainer}>
        <div style={styles.money}>Money: ${player.money}</div>
        <button
          style={{
            ...styles.button,
            ...(player.buildMode?.type === "power_pole"
              ? styles.activeButton
              : {}),
          }}
          onClick={() =>
            setBuildMode(
              PLAYER_ID,
              player.buildMode?.type === "power_pole"
                ? null
                : { type: "power_pole" }
            )
          }
        >
          {player.buildMode?.type === "power_pole"
            ? "Exit Build Mode"
            : "Build Power Pole ($1)"}
        </button>
        <button
          style={{
            ...styles.button,
            ...(player.buildMode?.type === "coal_plant"
              ? styles.activeButton
              : {}),
          }}
          onClick={() =>
            setBuildMode(
              PLAYER_ID,
              player.buildMode?.type === "coal_plant"
                ? null
                : { type: "coal_plant" }
            )
          }
        >
          {player.buildMode?.type === "coal_plant"
            ? "Exit Build Mode"
            : "Build Coal Plant ($5)"}
        </button>
      </div>
      <Clock />
      <TerrainPaintUI />
      <HexDetailsUI />
    </>
  );
};

export default ClientGameUI; 