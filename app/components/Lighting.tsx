import { useSpring, animated } from "@react-spring/three";
import { GameContext } from "@/actor/game.context";
import { HOURS_PER_DAY, MILLISECONDS_PER_IN_GAME_HOUR } from "@/lib/constants";
import {
  isNightTime,
  isSunsetTime,
  NOON_HOUR,
  SUNSET_START_HOUR,
  NIGHT_START_HOUR,
} from "@/lib/time";

export function Lighting() {
  const { totalTicks } = GameContext.useSelector((state) => state.public.time);
  const hour = totalTicks % HOURS_PER_DAY;

  // Calculate progress through the day, with peak at noon
  const dayProgress =
    ((hour + (HOURS_PER_DAY - NOON_HOUR)) % HOURS_PER_DAY) / HOURS_PER_DAY;

  // Calculate light intensity and colors based on time of day
  let lightIntensity: number;
  let redComponent: number;
  let greenComponent: number;
  let blueComponent: number;

  if (isNightTime(totalTicks)) {
    // Night time (9 PM - 6 AM)
    lightIntensity = 0.3;
    redComponent = 0.5;
    greenComponent = 0.5;
    blueComponent = 1;
  } else if (isSunsetTime(totalTicks)) {
    // Sunset time (6 PM - 9 PM)
    const sunsetProgress =
      (hour - SUNSET_START_HOUR) / (NIGHT_START_HOUR - SUNSET_START_HOUR);
    lightIntensity = 0.7 - sunsetProgress * 0.4; // Gradually dim from 0.7 to 0.3
    redComponent = 1; // Strong red at sunset
    greenComponent = 0.6 - sunsetProgress * 0.1; // Reduce green during sunset
    blueComponent = 0.5; // Keep blue low for warm sunset
  } else {
    // Day time (6 AM - 6 PM)
    lightIntensity = Math.sin(dayProgress * Math.PI) * 0.3 + 0.7; // Range: 0.7 to 1.0
    redComponent = 1;
    greenComponent = 1;
    blueComponent = 0.95; // Slightly reduce blue for warm daylight
  }

  const [springs, api] = useSpring(() => ({
    from: {
      ambientIntensity: 0.5,
      directionalIntensity: 0.7,
      lightColor: [1, 1, 0.95] as [number, number, number],
    },
    config: {
      duration: MILLISECONDS_PER_IN_GAME_HOUR,
    },
  }));

  // Update spring values when time changes
  api.start({
    to: {
      ambientIntensity: lightIntensity * 0.7 + 0.15, // Range: 0.15 to 0.85
      directionalIntensity: lightIntensity,
      lightColor: [redComponent, greenComponent, blueComponent],
    },
  });

  return (
    <>
      <animated.ambientLight intensity={springs.ambientIntensity} />
      <animated.directionalLight
        position={[10, 10, 5]}
        intensity={springs.directionalIntensity}
        color={springs.lightColor}
      />
    </>
  );
}
