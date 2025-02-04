import React from "react";
import { useSelector } from "@xstate/store/react";
import { HexDetailsUI } from "./HexDetailsUI";
import { TerrainPaintUI } from "./TerrainPaintUI";
import { PLAYER_ID, HOURS_PER_DAY } from "../../lib/constants";
import { GameContext } from "@/actor/game.context";
import { clientStore } from "@/lib/clientState";
import { BUILDABLE_COSTS } from "@/lib/buildables/costs";
import { formatPowerKWh } from "@/lib/power/formatPower";
import { isDayTime } from "@/lib/time";
import { UI_COLORS } from "@/lib/palette";

const POWER_SELL_GOAL_KWH = 1_000_000_000; // 1 TWh in kWh

const styles = {
  buildContainer: {
    position: "fixed" as const,
    top: "10px",
    left: "10px",
    backgroundColor: UI_COLORS.BACKGROUND,
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
  timeContainer: {
    position: "fixed" as const,
    top: "10px",
    right: "10px",
    backgroundColor: UI_COLORS.BACKGROUND,
    color: "white",
    padding: "10px",
    borderRadius: "5px",
    fontFamily: "monospace",
    fontSize: "14px",
    zIndex: 1000,
  },
  money: {
    fontSize: "16px",
    fontWeight: "bold" as const,
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
  progressContainer: {
    width: "100%",
    backgroundColor: "#f1f1f1",
    borderRadius: "3px",
    marginTop: "5px",
    position: "relative" as const,
  },
  progressBar: {
    height: "20px",
    backgroundColor: UI_COLORS.PRIMARY,
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

export const GameUI: React.FC = () => {
  const player = GameContext.useSelector(
    (state) => state.public.players[PLAYER_ID]
  );
  const buildMode = useSelector(
    clientStore,
    (state) => state.context.buildMode
  );
  const { totalTicks } = GameContext.useSelector((state) => state.public.time);
  const timeEmoji = isDayTime(totalTicks) ? "☀️" : "🌙";

  const canAffordPowerPole = player.money >= BUILDABLE_COSTS.power_pole;
  const canAffordCoalPlant = player.money >= BUILDABLE_COSTS.coal_plant;
  const dayNumber = Math.floor(totalTicks / HOURS_PER_DAY) + 1;
  const powerProgress =
    Math.min(player.powerSoldKWh / POWER_SELL_GOAL_KWH, 1) * 100;

  return (
    <>
      <div style={styles.buildContainer}>
        <div style={styles.money}>Money: ${player.money}</div>
        <div>
          <div>Power Sold Progress</div>
          <div style={styles.progressContainer}>
            <div
              style={{
                ...styles.progressBar,
                width: `${powerProgress}%`,
              }}
            />
            <div style={styles.progressText}>
              {formatPowerKWh(player.powerSoldKWh)}
            </div>
          </div>
        </div>
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
      <div style={styles.timeContainer}>
        Day {dayNumber} {timeEmoji}
      </div>
      <TerrainPaintUI />
      <HexDetailsUI />
    </>
  );
};
