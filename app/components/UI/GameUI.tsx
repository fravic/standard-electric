import React from "react";
import { useSelector } from "@xstate/store/react";
import { HexDetailsUI } from "./HexDetailsUI";
import { TerrainPaintUI } from "./TerrainPaintUI";
import { Clock } from "./Clock";
import { PLAYER_ID } from "../../lib/constants";
import { GameContext } from "@/actor/game.context";
import { clientStore } from "@/lib/clientState";

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

export const GameUI: React.FC = () => {
  const player = GameContext.useSelector(
    (state) => state.public.players[PLAYER_ID]
  );
  const buildMode = useSelector(clientStore, (state) => state.context.buildMode);

  return (
    <>
      <div style={styles.buildContainer}>
        <div style={styles.money}>Money: ${player.money}</div>
        <button
          style={{
            ...styles.button,
            ...(buildMode?.type === "power_pole" ? styles.activeButton : {}),
          }}
          onClick={() =>
            buildMode?.type === "power_pole"
              ? clientStore.send({ type: "setBuildMode", mode: null })
              : clientStore.send({ type: "setBuildMode", mode: { type: "power_pole" } })
          }
        >
          {buildMode?.type === "power_pole"
            ? "Exit Build Mode"
            : "Build Power Pole ($1)"}
        </button>
        <button
          style={{
            ...styles.button,
            ...(buildMode?.type === "coal_plant" ? styles.activeButton : {}),
          }}
          onClick={() =>
            buildMode?.type === "coal_plant"
              ? clientStore.send({ type: "setBuildMode", mode: null })
              : clientStore.send({ type: "setBuildMode", mode: { type: "coal_plant" } })
          }
        >
          {buildMode?.type === "coal_plant"
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
