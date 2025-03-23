import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { Billboard } from "@react-three/drei";
import { WATER_COLORS } from "@/lib/palette";

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

// Individual uniforms for each color and position to avoid array issues
uniform vec3 color0;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;
uniform vec3 color6;
uniform vec3 color7;
uniform vec3 color8;
uniform vec3 color9;

uniform vec2 position0;
uniform vec2 position1;
uniform vec2 position2;
uniform vec2 position3;
uniform vec2 position4;
uniform vec2 position5;
uniform vec2 position6;
uniform vec2 position7;
uniform vec2 position8;
uniform vec2 position9;

varying vec2 vUv;

// Function to calculate weighted blending based on distance
float weightedDistance(vec2 point1, vec2 point2) {
  return 1.0 / (pow(distance(point1, point2), 2.0) + 0.01);
}

void main() {
  // Calculate weights for each position
  float totalWeight = 0.0;
  float weights[10];
  
  // Manual handling for each position to avoid array access issues
  if (numControlPoints > 0) weights[0] = weightedDistance(vUv, position0);
  if (numControlPoints > 1) weights[1] = weightedDistance(vUv, position1);
  if (numControlPoints > 2) weights[2] = weightedDistance(vUv, position2);
  if (numControlPoints > 3) weights[3] = weightedDistance(vUv, position3);
  if (numControlPoints > 4) weights[4] = weightedDistance(vUv, position4);
  if (numControlPoints > 5) weights[5] = weightedDistance(vUv, position5);
  if (numControlPoints > 6) weights[6] = weightedDistance(vUv, position6);
  if (numControlPoints > 7) weights[7] = weightedDistance(vUv, position7);
  if (numControlPoints > 8) weights[8] = weightedDistance(vUv, position8);
  if (numControlPoints > 9) weights[9] = weightedDistance(vUv, position9);
  
  // Calculate total weight
  for (int i = 0; i < 10; i++) {
    if (i >= numControlPoints) break;
    totalWeight += weights[i];
  }
  
  // Blend colors with normalized weights
  vec3 color = vec3(0.0);
  if (numControlPoints > 0) color += color0 * (weights[0] / totalWeight);
  if (numControlPoints > 1) color += color1 * (weights[1] / totalWeight);
  if (numControlPoints > 2) color += color2 * (weights[2] / totalWeight);
  if (numControlPoints > 3) color += color3 * (weights[3] / totalWeight);
  if (numControlPoints > 4) color += color4 * (weights[4] / totalWeight);
  if (numControlPoints > 5) color += color5 * (weights[5] / totalWeight);
  if (numControlPoints > 6) color += color6 * (weights[6] / totalWeight);
  if (numControlPoints > 7) color += color7 * (weights[7] / totalWeight);
  if (numControlPoints > 8) color += color8 * (weights[8] / totalWeight);
  if (numControlPoints > 9) color += color9 * (weights[9] / totalWeight);
 
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

const TIME_SCALE = 0.2; // Lower makes the background move slower

export function ShiftingBackground({
  controlPoints,
  distance = 100, // Set a large distance to ensure it's behind everything
}: ShiftingBackgroundProps) {
  // Default control points if none provided
  const defaultControlPoints: ControlPoint[] = [
    { color: "#4488FF", basePosition: [0.5, 0.5], amplitude: [0.2, 0.2], frequency: [1.4, 1.0], phase: [0, 0] },
    { color: WATER_COLORS.DEEP, basePosition: [0.0, 1.0], amplitude: [0.4, 0.4], frequency: [0.8, 1.2], phase: [1.0, 0] },
    { color: WATER_COLORS.SHALLOW, basePosition: [1.0, 1.0], amplitude: [4, 4], frequency: [0.1, 0.1], phase: [2.0, 0] },
    { color: "#2233AA", basePosition: [0.0, 0.0], amplitude: [0.4, 0.4], frequency: [0.6, 1.4], phase: [3.0, 0] },
    { color: WATER_COLORS.SHALLOW, basePosition: [1.0, 0.0], amplitude: [0.2, 0.2], frequency: [3, 3], phase: [4.0, 0] },
  ];
  
  // Use provided control points or default ones
  const points = controlPoints || defaultControlPoints;
  
  // Ensure we don't exceed shader array limits (10 maximum)
  const safePoints = points.slice(0, 10);
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

  // Create and store a reference to the uniforms object that will be shared with the material
  const uniformsRef = useRef<Record<string, any>>();
  
  // Initialize the uniforms object once
  if (!uniformsRef.current) {
    const uniformsObj: Record<string, any> = {
      time: { value: 0 },
      numControlPoints: { value: safePoints.length },
    };
    
    // Create individual uniforms for each color and position
    for (let i = 0; i < 10; i++) {
      // Default color (black) and position (center) if not provided
      const defaultColor = new THREE.Color("#000000");
      const defaultPosition = new THREE.Vector2(0.5, 0.5);
      
      // Use actual values where available
      if (i < safePoints.length) {
        uniformsObj[`color${i}`] = { value: new THREE.Color(safePoints[i].color) };
        uniformsObj[`position${i}`] = { 
          value: new THREE.Vector2(
            safePoints[i].basePosition[0], 
            safePoints[i].basePosition[1]
          ) 
        };
      } else {
        // Initialize unused slots with defaults
        uniformsObj[`color${i}`] = { value: defaultColor };
        uniformsObj[`position${i}`] = { value: defaultPosition };
      }
    }
    
    uniformsRef.current = uniformsObj;
  }

  // Update the time uniform and positions on each frame
  useFrame((_, delta) => {
    if (!uniformsRef.current) return;
    
    // Update time uniform directly on our uniformsRef
    uniformsRef.current.time.value += delta;
    const currentTime = uniformsRef.current.time.value;
    
    // Calculate new positions for each control point
    for (let i = 0; i < safePoints.length; i++) {
      const point = safePoints[i];
      const baseX = point.basePosition[0];
      const baseY = point.basePosition[1];
      const amplitudeX = point.amplitude[0];
      const amplitudeY = point.amplitude[1];
      const frequencyX = point.frequency[0];
      const frequencyY = point.frequency[1];
      const phaseX = point.phase[0];
      const phaseY = point.phase[1];
      
      // Calculate offset using sin/cos for smooth orbits
      const t = currentTime * TIME_SCALE;
      const offsetX = amplitudeX * Math.sin(t * frequencyX + phaseX);
      const offsetY = amplitudeY * Math.cos(t * frequencyY + phaseY);
      
      // Update position uniform directly on our uniformsRef
      const positionUniform = uniformsRef.current[`position${i}`];
      if (positionUniform) {
        positionUniform.value = new THREE.Vector2(baseX + offsetX, baseY + offsetY);
      }
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
