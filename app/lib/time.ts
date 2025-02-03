import { TICKS_PER_CYCLE } from "./constants";

/**
 * Returns true if it's night time (between 9PM and 3AM game time)
 */
export function isNightTime(totalTicks: number): boolean {
  const currentTick = totalTicks % TICKS_PER_CYCLE;
  return currentTick >= 9 || currentTick < 3;
}

/**
 * Returns true if it's day time (between 3AM and 9PM game time)
 */
export function isDayTime(totalTicks: number): boolean {
  return !isNightTime(totalTicks);
}
