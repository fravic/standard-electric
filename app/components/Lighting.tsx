import { useSpring, animated } from "@react-spring/three";
import { GameContext } from "@/actor/game.context";
import { HOURS_PER_DAY, MILLISECONDS_PER_IN_GAME_HOUR } from "@/lib/constants";
import { useEffect } from "react";
import { ticksToHour } from "@/lib/time";

// Lighting waypoints for different times of day
const WAYPOINTS = [
  {
    hour: 0,
    color: [0.6, 0.6, 1] as [number, number, number], // Deep blue night
    intensity: 1.0,
  },
  {
    hour: 6,
    color: [1, 0.7, 0.6] as [number, number, number], // Warm morning light
    intensity: 1.0,
  },
  {
    hour: 7,
    color: [1, 0.9, 0.9] as [number, number, number], // Sunrise complete
    intensity: 1.0,
  },
  {
    hour: 8,
    color: [1, 1, 1] as [number, number, number], // Bright daylight
    intensity: 1.0,
  },
  {
    hour: 18,
    color: [1, 0.75, 0.75] as [number, number, number], // Start of sunset
    intensity: 1.0,
  },
  {
    hour: 19,
    color: [1, 0.55, 0.55] as [number, number, number], // Orange sunset
    intensity: 1.0,
  },
  {
    hour: 20,
    color: [0.7, 0.7, 1] as [number, number, number], // Sunset complete
    intensity: 1.0,
  },
] as const;

function getWaypoint(hour: number) {
  // Find the last waypoint that occurred before or at the current hour
  const currentWaypoint = [...WAYPOINTS].reverse().find((waypoint) => hour >= waypoint.hour);

  // If we're past the last waypoint, return the first waypoint
  return currentWaypoint ?? WAYPOINTS[0];
}

export function Lighting() {
  const { totalTicks } = GameContext.useSelector((state) => state.public.time);
  const hour = ticksToHour(totalTicks);

  const waypoint = getWaypoint(hour);

  const [springStyles, springApi] = useSpring(() => ({
    from: {
      intensity: waypoint.intensity,
      lightColor: waypoint.color,
    },
    config: {
      duration: MILLISECONDS_PER_IN_GAME_HOUR,
    },
  }));

  // Update spring values when time changes
  useEffect(() => {
    springApi.start({
      to: {
        intensity: waypoint.intensity,
        lightColor: waypoint.color,
      },
    });
  }, [hour]);

  return (
    <>
      <animated.ambientLight intensity={springStyles.intensity} color={springStyles.lightColor} />
    </>
  );
}
