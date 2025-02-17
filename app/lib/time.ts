import { HOURS_PER_DAY } from "./constants";

export const SUNRISE_HOUR = 6; // 6 AM
export const NOON_HOUR = 12; // 12 PM
export const SUNSET_HOUR = 20; // 8 PM
export const MIDNIGHT_HOUR = 0; // 12 AM

// Twilight periods for color transitions
export const SUNSET_START_HOUR = 19; // 7 PM - start transitioning to sunset colors
export const NIGHT_START_HOUR = 22; // 10 PM - fully dark

/**
 * Returns true if it's night time (after NIGHT_START_HOUR or before SUNRISE_HOUR)
 */
export function isNightTime(totalTicks: number): boolean {
  const currentHour = totalTicks % HOURS_PER_DAY;
  return currentHour >= NIGHT_START_HOUR || currentHour < SUNRISE_HOUR;
}

/**
 * Returns true if it's day time (between SUNRISE_HOUR and SUNSET_START_HOUR)
 */
export function isDayTime(totalTicks: number): boolean {
  return !isNightTime(totalTicks);
}
