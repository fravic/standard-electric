import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
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

// Fragment shader that creates a psychedelic shifting gradient effect
const fragmentShader = `
precision highp float;

uniform float time;
uniform vec3 colorCenter;
uniform vec3 colorTopLeft;
uniform vec3 colorTopRight;
uniform vec3 colorBottomLeft;
uniform vec3 colorBottomRight;

varying vec2 vUv;

// Function to calculate weighted blending based on distance
float weightedDistance(vec2 point1, vec2 point2) {
  return 1.0 / (pow(distance(point1, point2), 2.0) + 0.01);
}

void main() {
  // Define the base positions for our 5 points
  vec2 centerBase = vec2(0.5, 0.5);
  vec2 topLeftBase = vec2(0.0, 1.0);
  vec2 topRightBase = vec2(1.0, 1.0);
  vec2 bottomLeftBase = vec2(0.0, 0.0);
  vec2 bottomRightBase = vec2(1.0, 0.0);

  // Animate the points over time
  float t = time * 0.1;
  
  // Move points in small orbits
  vec2 centerPoint = centerBase + vec2(
    0.2 * sin(t * 0.7),
    0.2 * cos(t * 0.5)
  );
  
  vec2 topLeftPoint = topLeftBase + vec2(
    0.15 * sin(t * 0.4 + 1.0),
    -0.15 * cos(t * 0.6)
  );
  
  vec2 topRightPoint = topRightBase + vec2(
    -0.15 * sin(t * 0.5 + 2.0),
    -0.15 * cos(t * 0.3)
  );
  
  vec2 bottomLeftPoint = bottomLeftBase + vec2(
    0.15 * sin(t * 0.3 + 3.0),
    0.15 * cos(t * 0.7)
  );
  
  vec2 bottomRightPoint = bottomRightBase + vec2(
    -0.15 * sin(t * 0.6 + 4.0),
    0.15 * cos(t * 0.4)
  );
  
  // Calculate weights based on distance to each point
  float centerWeight = weightedDistance(vUv, centerPoint);
  float topLeftWeight = weightedDistance(vUv, topLeftPoint);
  float topRightWeight = weightedDistance(vUv, topRightPoint);
  float bottomLeftWeight = weightedDistance(vUv, bottomLeftPoint);
  float bottomRightWeight = weightedDistance(vUv, bottomRightPoint);
  
  // Normalize weights
  float totalWeight = centerWeight + topLeftWeight + topRightWeight + bottomLeftWeight + bottomRightWeight;
  centerWeight /= totalWeight;
  topLeftWeight /= totalWeight;
  topRightWeight /= totalWeight;
  bottomLeftWeight /= totalWeight;
  bottomRightWeight /= totalWeight;
  
  // Mix colors based on weights
  vec3 color = 
    colorCenter * centerWeight +
    colorTopLeft * topLeftWeight +
    colorTopRight * topRightWeight +
    colorBottomLeft * bottomLeftWeight +
    colorBottomRight * bottomRightWeight;
  
  // Add subtle pulsing
  float pulse = 0.5 * sin(time * 0.2);
  color = color * (1.0 + pulse);
  
  gl_FragColor = vec4(color, 1.0);
}
`;

type ShiftingBackgroundProps = {
  colorCenter?: string;
  colorTopLeft?: string;
  colorTopRight?: string;
  colorBottomLeft?: string;
  colorBottomRight?: string;
  distance?: number;
};

export function ShiftingBackground({
  colorCenter = "#4488FF", // Middle blue
  colorTopLeft = WATER_COLORS.DEEP,
  colorTopRight = WATER_COLORS.SHALLOW,
  colorBottomLeft = "#2233AA", // Dark blue
  colorBottomRight = WATER_COLORS.BACKGROUND,
  distance = 100, // Set a large distance to ensure it's behind everything
}: ShiftingBackgroundProps) {
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

  // Create uniforms for the shader
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      colorCenter: { value: new THREE.Color(colorCenter) },
      colorTopLeft: { value: new THREE.Color(colorTopLeft) },
      colorTopRight: { value: new THREE.Color(colorTopRight) },
      colorBottomLeft: { value: new THREE.Color(colorBottomLeft) },
      colorBottomRight: { value: new THREE.Color(colorBottomRight) },
    }),
    [colorCenter, colorTopLeft, colorTopRight, colorBottomLeft, colorBottomRight]
  );

  // Update the time uniform on each frame
  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value += delta;
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
          uniforms={uniforms}
          depthWrite={false}
        />
      </mesh>
    </Billboard>
  );
}
