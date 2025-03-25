import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { Billboard } from "@react-three/drei";
import { GameContext } from "@/actor/game.context";
import { ticksToHour } from "@/lib/time";
import { MILLISECONDS_PER_IN_GAME_HOUR } from "@/lib/constants";

// Vertex shader for our background plane
const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// Fragment shader that creates a dynamic shifting gradient effect with variable control points
const fragmentShader = `
precision highp float;

uniform float time;
uniform int numControlPoints;

// Arrays for colors, positions and alpha values
uniform vec3 colors[10];
uniform float alphas[10];
uniform vec2 positions[10];

varying vec2 vUv;

// Function to calculate weighted blending based on distance
float weightedDistance(vec2 point1, vec2 point2) {
  return 1.0 / (pow(distance(point1, point2), 2.2) + 0.01);
}

void main() {
  // Calculate weights for each position
  float totalWeight = 0.0;
  float weights[10];
  
  // Calculate weights for all control points
  for (int i = 0; i < 10; i++) {
    if (i >= numControlPoints) break;
    weights[i] = weightedDistance(vUv, positions[i]) * alphas[i];
  }
  
  // Calculate total weight
  for (int i = 0; i < 10; i++) {
    if (i >= numControlPoints) break;
    totalWeight += weights[i];
  }
  
  // Protect against division by zero
  if (totalWeight < 0.001) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  
  // Blend colors with normalized weights
  vec3 color = vec3(0.0);
  for (int i = 0; i < 10; i++) {
    if (i >= numControlPoints) break;
    color += colors[i] * (weights[i] / totalWeight);
  }
 
  gl_FragColor = vec4(color, 1.0);
}`;

// Define a control point type (color + base position + animation params)
type ControlPoint = {
  color: string;
  basePosition: [number, number]; // x, y in range 0-1
  amplitude: [number, number]; // How far the point can move from base position
  frequency: [number, number]; // How quickly the point moves. Lower = slower, higher = faster
  phase: [number, number]; // Starting phase offset
};

type ShiftingBackgroundProps = {
  controlPoints?: ControlPoint[];
  distance?: number;
};

// Time constants (hours in 24-hour format)
const SUNRISE_HOUR = 6;
const SUNSET_START_HOUR = 19;
const NIGHT_START_HOUR = 22;
const SHIFT_SPEED = 0.4; // Lower makes the background move slower

// Day and night control point colors
const DAY_COLORS = {
  PRIMARY: "#6BBBFF", // Bright sky blue
  SECONDARY: "#90DAEE", // Light blue
  ACCENT: "#466CC8", // Accent blue
};

const NIGHT_COLORS = {
  PRIMARY: "#1A2D50", // Dark navy
  SECONDARY: "#2233AA", // Deep blue
  ACCENT: "#114494", // Very dark blue
};

// Calculate time-based blend factor (0-1 range)
function getTimeBlendFactor(hour: number): number {
  if (hour >= SUNRISE_HOUR && hour < SUNRISE_HOUR + 2) {
    return (hour - SUNRISE_HOUR) / 2; // Sunrise transition
  } else if (hour >= SUNRISE_HOUR + 2 && hour < SUNSET_START_HOUR) {
    return 1; // Full day
  } else if (hour >= SUNSET_START_HOUR && hour < NIGHT_START_HOUR) {
    return 1 - (hour - SUNSET_START_HOUR) / (NIGHT_START_HOUR - SUNSET_START_HOUR); // Sunset
  } else {
    return 0; // Night
  }
}

export function ShiftingBackground({
  controlPoints,
  distance = 100, // Set a large distance to ensure it's behind everything
}: ShiftingBackgroundProps) {
  // Day control points
  const dayControlPoints: ControlPoint[] = [
    {
      color: DAY_COLORS.PRIMARY,
      basePosition: [0.5, 0.5],
      amplitude: [0.2, 0.2],
      frequency: [1.4, 1.0],
      phase: [0, 0],
    },
    {
      color: DAY_COLORS.SECONDARY,
      basePosition: [0.0, 1.0],
      amplitude: [0.4, 0.4],
      frequency: [0.8, 1.2],
      phase: [1.0, 0],
    },
    {
      color: DAY_COLORS.ACCENT,
      basePosition: [1.0, 1.0],
      amplitude: [0.4, 0.4],
      frequency: [0.1, 0.1],
      phase: [2.0, 0],
    },
    {
      color: DAY_COLORS.PRIMARY,
      basePosition: [0.0, 0.0],
      amplitude: [0.4, 0.4],
      frequency: [0.6, 1.4],
      phase: [3.0, 0],
    },
    {
      color: DAY_COLORS.ACCENT,
      basePosition: [1.0, 0.0],
      amplitude: [0.2, 0.2],
      frequency: [3, 3],
      phase: [4.0, 0],
    },
  ];

  // Night control points (same positions, different colors)
  const nightControlPoints: ControlPoint[] = [
    {
      color: NIGHT_COLORS.PRIMARY,
      basePosition: [0.5, 0.5],
      amplitude: [0.2, 0.2],
      frequency: [1.4, 1.0],
      phase: [0, 0],
    },
    {
      color: NIGHT_COLORS.SECONDARY,
      basePosition: [0.0, 1.0],
      amplitude: [0.4, 0.4],
      frequency: [0.8, 1.2],
      phase: [1.0, 0],
    },
    {
      color: NIGHT_COLORS.ACCENT,
      basePosition: [1.0, 1.0],
      amplitude: [0.4, 0.4],
      frequency: [0.1, 0.1],
      phase: [2.0, 0],
    },
    {
      color: NIGHT_COLORS.PRIMARY,
      basePosition: [0.0, 0.0],
      amplitude: [0.4, 0.4],
      frequency: [0.6, 1.4],
      phase: [3.0, 0],
    },
    {
      color: NIGHT_COLORS.ACCENT,
      basePosition: [1.0, 0.0],
      amplitude: [0.2, 0.2],
      frequency: [3, 3],
      phase: [4.0, 0],
    },
  ];

  // Combine day and night points or use provided ones
  const combinedPoints = controlPoints || [...dayControlPoints, ...nightControlPoints];

  // Ensure we don't exceed shader array limits (10 maximum)
  const safePoints = combinedPoints.slice(0, 10);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, viewport, size } = useThree();

  // Calculate the size needed to cover the entire screen at the given distance
  const getScreenCoverSize = () => {
    // Check if camera is perspective camera and has required properties
    const isPerspective = camera instanceof THREE.PerspectiveCamera;

    if (isPerspective) {
      // Get the camera FOV in radians
      const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);

      // Calculate the visible height at the given distance
      const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;

      // Calculate the visible width based on aspect ratio
      const visibleWidth = visibleHeight * (camera as THREE.PerspectiveCamera).aspect;

      // Add extra padding to ensure full coverage (50% larger)
      return {
        width: visibleWidth * 1.5,
        height: visibleHeight * 1.5,
      };
    } else {
      // For non-perspective cameras or fallback, use viewport size with a large multiplier
      return {
        width: viewport.width * 2,
        height: viewport.height * 2,
      };
    }
  };

  // Get initial sizes
  const { width, height } = getScreenCoverSize();

  // Update dimensions when camera properties change
  useEffect(() => {
    if (meshRef.current) {
      const { width, height } = getScreenCoverSize();
      meshRef.current.scale.set(width, height, 1);
    }
  }, [size.width, size.height, distance, camera]);

  // Get the current game time for day/night transitions
  const { totalTicks } = GameContext.useSelector(
    (state: { public: { time: { totalTicks: number } } }) => state.public.time
  );
  const hour = ticksToHour(totalTicks);

  // Animation state for smooth transitions
  const animState = useRef({
    currentBlendFactor: getTimeBlendFactor(hour),
    targetBlendFactor: getTimeBlendFactor(hour),
    prevHour: hour,
  });

  // Create and store a reference to the uniforms object
  const uniformsRef = useRef<Record<string, any>>();

  // Initialize the uniforms object once
  if (!uniformsRef.current) {
    // Create arrays for our uniform values
    const colorArray = new Array(10).fill(null).map(() => new THREE.Color(0, 0, 0));
    const positionArray = new Array(10).fill(null).map(() => new THREE.Vector2(0.5, 0.5));
    const alphaArray = new Array(10).fill(0);

    // Initialize with day and night points
    for (let i = 0; i < 10; i++) {
      // Day points (first 5)
      if (i < 5 && i < dayControlPoints.length) {
        colorArray[i] = new THREE.Color(dayControlPoints[i].color);
        positionArray[i] = new THREE.Vector2(
          dayControlPoints[i].basePosition[0],
          dayControlPoints[i].basePosition[1]
        );
        alphaArray[i] = 1.0; // Day points start visible
      }
      // Night points (second 5)
      else if (i < 10 && i - 5 < nightControlPoints.length) {
        const nightPointIndex = i - 5;
        colorArray[i] = new THREE.Color(nightControlPoints[nightPointIndex].color);
        positionArray[i] = new THREE.Vector2(
          nightControlPoints[nightPointIndex].basePosition[0],
          nightControlPoints[nightPointIndex].basePosition[1]
        );
        alphaArray[i] = 0.0; // Night points start invisible
      }
    }

    // Create the uniforms object with arrays
    const uniformsObj: Record<string, any> = {
      time: { value: 0 },
      numControlPoints: { value: 10 },
      colors: { value: colorArray },
      positions: { value: positionArray },
      alphas: { value: alphaArray },
    };

    uniformsRef.current = uniformsObj;
  }

  // Update animations on each frame
  useFrame((_, delta) => {
    if (!uniformsRef.current) return;

    // Update time uniform
    uniformsRef.current.time.value += delta;
    const currentTime = uniformsRef.current.time.value;

    // Check if hour has changed and update target blend factor
    if (hour !== animState.current.prevHour) {
      animState.current.targetBlendFactor = getTimeBlendFactor(hour);
      animState.current.prevHour = hour;
    }

    // Smooth animation of blend factor over the duration of one in-game hour
    // Calculate animation speed based on MILLISECONDS_PER_IN_GAME_HOUR
    // delta is in seconds, so we convert accordingly
    const secondsPerInGameHour = MILLISECONDS_PER_IN_GAME_HOUR / 1000;
    const animationSpeed = 1.0 / secondsPerInGameHour;

    animState.current.currentBlendFactor = THREE.MathUtils.lerp(
      animState.current.currentBlendFactor,
      animState.current.targetBlendFactor,
      Math.min(1, delta * animationSpeed)
    );

    // Current blend factor between day and night
    const dayNightFactor = animState.current.currentBlendFactor;

    // Update alpha values for day/night transition using our array
    for (let i = 0; i < 5; i++) {
      // Day points fade out as night approaches
      uniformsRef.current.alphas.value[i] = dayNightFactor;

      // Night points fade in as night approaches
      uniformsRef.current.alphas.value[i + 5] = 1.0 - dayNightFactor;
    }

    // Update positions for all control points
    for (let i = 0; i < 10; i++) {
      // Select the correct control point based on index
      const point =
        i < 5
          ? i < dayControlPoints.length
            ? dayControlPoints[i]
            : dayControlPoints[0]
          : i - 5 < nightControlPoints.length
            ? nightControlPoints[i - 5]
            : nightControlPoints[0];
      const baseX = point.basePosition[0];
      const baseY = point.basePosition[1];
      const amplitudeX = point.amplitude[0];
      const amplitudeY = point.amplitude[1];
      const frequencyX = point.frequency[0];
      const frequencyY = point.frequency[1];
      const phaseX = point.phase[0];
      const phaseY = point.phase[1];

      // Calculate offset using sin/cos
      const t = currentTime * SHIFT_SPEED;
      const offsetX = amplitudeX * Math.sin(t * frequencyX + phaseX);
      const offsetY = amplitudeY * Math.cos(t * frequencyY + phaseY);

      // Update position in our positions array
      uniformsRef.current.positions.value[i].set(baseX + offsetX, baseY + offsetY);
    }

    // Force material update if it exists
    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }
  });

  return (
    // Use Billboard to ensure the background always faces the camera
    <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
      <mesh ref={meshRef} renderOrder={-1000} position={[0, 0, 0]} scale={[width, height, 1]}>
        {/* Using a simple plane geometry that will be scaled to fill the view. In ThreeJS, normalized device coordinates are [-1, 1] for x and y, so the width and height are 2. */}
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniformsRef.current}
          depthWrite={false}
        />
      </mesh>
    </Billboard>
  );
}
