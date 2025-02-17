import React from "react";
import { UI_COLORS } from "@/lib/palette";
import { BUILDABLE_COSTS } from "@/lib/buildables/costs";
import { clientStore } from "@/lib/clientState";
import { useSelector } from "@xstate/store/react";
import { Player } from "@/actor/game.types";

const styles = {
  container: {
    backgroundColor: UI_COLORS.BACKGROUND,
    color: "white",
    padding: "10px",
    borderRadius: "5px",
    fontFamily: "monospace",
    fontSize: "14px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
    marginBottom: "10px",
  },
  button: {
    backgroundColor: UI_COLORS.PRIMARY,
    border: "none",
    color: UI_COLORS.TEXT_LIGHT,
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
  disabledButton: {
    backgroundColor: UI_COLORS.PRIMARY_DARK,
    color: UI_COLORS.TEXT_DARK,
    cursor: "not-allowed",
    opacity: 0.7,
  },
  activeButton: {
    backgroundColor: UI_COLORS.PRIMARY_DARK,
    color: UI_COLORS.TEXT_LIGHT,
  },
};

interface BuildBarProps {
  player: Player;
}

export const BuildBar: React.FC<BuildBarProps> = ({ player }) => {
  const buildMode = useSelector(
    clientStore,
    (state) => state.context.buildMode
  );
  const canAffordPowerPole = player.money >= BUILDABLE_COSTS.power_pole;
  const canAffordCoalPlant = player.money >= BUILDABLE_COSTS.coal_plant;

  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.button,
          ...(buildMode?.type === "power_pole" ? styles.activeButton : {}),
          ...(!canAffordPowerPole && buildMode?.type !== "power_pole"
            ? styles.disabledButton
            : {}),
        }}
        onClick={() =>
          buildMode?.type === "power_pole"
            ? clientStore.send({ type: "setBuildMode", mode: null })
            : canAffordPowerPole &&
              clientStore.send({
                type: "setBuildMode",
                mode: { type: "power_pole" },
              })
        }
        disabled={!canAffordPowerPole && buildMode?.type !== "power_pole"}
      >
        {buildMode?.type === "power_pole"
          ? "Exit Build Mode"
          : `Build Power Pole ($${BUILDABLE_COSTS.power_pole})`}
      </button>
      <button
        style={{
          ...styles.button,
          ...(buildMode?.type === "coal_plant" ? styles.activeButton : {}),
          ...(!canAffordCoalPlant && buildMode?.type !== "coal_plant"
            ? styles.disabledButton
            : {}),
        }}
        onClick={() =>
          buildMode?.type === "coal_plant"
            ? clientStore.send({ type: "setBuildMode", mode: null })
            : canAffordCoalPlant &&
              clientStore.send({
                type: "setBuildMode",
                mode: { type: "coal_plant" },
              })
        }
        disabled={!canAffordCoalPlant && buildMode?.type !== "coal_plant"}
      >
        {buildMode?.type === "coal_plant"
          ? "Exit Build Mode"
          : `Build Coal Plant ($${BUILDABLE_COSTS.coal_plant})`}
      </button>
    </div>
  );
};
