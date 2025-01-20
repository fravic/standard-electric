import React from "react";
import { TICKS_PER_CYCLE } from "@/lib/constants";
import { GameContext } from "@/actor/game.context";

const CLOCK_SIZE = 80;
const CENTER = CLOCK_SIZE / 2;
const RADIUS = (CLOCK_SIZE / 2) * 0.8; // 80% of half width
const TICK_LENGTH = 6; // Length of tick marks in pixels

const styles = {
  container: {
    position: "fixed" as const,
    top: "10px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "white",
    padding: "10px",
    borderRadius: "5px",
    fontFamily: "monospace",
    fontSize: "14px",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "10px",
  },
  clockFace: {
    width: `${CLOCK_SIZE}px`,
    height: `${CLOCK_SIZE}px`,
    borderRadius: "50%",
    border: "2px solid white",
    position: "relative" as const,
  },
  hand: {
    position: "absolute" as const,
    width: "2px",
    height: `${RADIUS}px`,
    backgroundColor: "white",
    bottom: "50%",
    left: "50%",
    transformOrigin: "bottom",
  },
  tick: {
    position: "absolute" as const,
    width: "1px",
    height: `${TICK_LENGTH}px`,
    backgroundColor: "white",
    top: "50%",
    left: "50%",
    transformOrigin: "0 0",
  },
  dayNight: {
    position: "absolute" as const,
    width: "100%",
    height: "100%",
    borderRadius: "50%",
  },
  controls: {
    display: "flex",
    gap: "8px",
  },
  button: {
    backgroundColor: "#4CAF50",
    border: "none",
    color: "white",
    padding: "4px 8px",
    fontSize: "12px",
    borderRadius: "3px",
    cursor: "pointer",
  },
};

function getTickStyle(hour: number) {
  // Convert hour to angle, starting from top
  const angle = (hour / TICKS_PER_CYCLE) * 360 - 90;
  // Calculate position on the circle and rotate tick to point inward
  return {
    transform: `
      rotate(${angle}deg)
      translate(${RADIUS}px)
      rotate(90deg)
    `,
  };
}

export function Clock() {
  const { totalTicks } = GameContext.useSelector((state) => state.public.time);
  const isPaused = GameContext.useSelector((state) => state.value === "paused");
  const sendGameEvent = GameContext.useSend();

  // Calculate current cycle and tick
  const currentCycle = Math.floor(totalTicks / TICKS_PER_CYCLE) + 1;
  const currentTick = totalTicks % TICKS_PER_CYCLE;

  // Convert tick (0-11) to degrees (0-360), with 0 pointing up
  const degrees = (currentTick / TICKS_PER_CYCLE) * 360;
  const isNight = currentTick >= 9 || currentTick < 3;

  return (
    <div style={styles.container}>
      <div
        style={styles.clockFace}
        onClick={() => sendGameEvent({ type: isPaused ? "UNPAUSE" : "PAUSE" })}
      >
        <div
          style={{
            ...styles.dayNight,
            background: isNight
              ? "radial-gradient(circle at 50% 50%, rgba(0, 0, 50, 0.3), rgba(0, 0, 50, 0.6))"
              : "radial-gradient(circle at 50% 50%, rgba(255, 255, 200, 0.3), rgba(255, 255, 200, 0))",
          }}
        />
        {/* Tick marks */}
        {Array.from({ length: TICKS_PER_CYCLE }, (_, i) => (
          <div
            key={i}
            style={{
              ...styles.tick,
              ...getTickStyle(i),
            }}
          />
        ))}
        <div
          style={{
            ...styles.hand,
            transform: `rotate(${degrees}deg)`,
          }}
        />
      </div>
      <div style={styles.controls}>
        {isPaused ? (
          <div>Paused</div>
        ) : (
          <div>
            Cycle {currentCycle}, Hour {currentTick + 1}
            {isNight ? " 🌙" : " ☀️"}
          </div>
        )}
      </div>
    </div>
  );
}
