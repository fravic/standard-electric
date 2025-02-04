import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { WATER_COLORS } from "@/lib/palette";

const waterVertexShader = `
#include <common>
#include <lights_pars_begin>

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>

    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

const waterFragmentShader = `
#include <common>
#include <lights_pars_begin>

precision highp float;

uniform float time;
uniform vec3 deepColor;
uniform vec3 shallowColor;
uniform sampler2D waveNoiseTexture;
uniform sampler2D waveDistortionTexture;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

#define WAVE_SCALE vec2(0.01, 0.02)
#define WAVE_SPEED vec2(0.001, 0.004)
#define WAVE_DISTORTION_SCALE vec2(0.02, 0.2)
#define WAVE_DISTORTION_SPEED vec2(0.007, 0.014)
#define WAVE_NOISE_CUTOFF 0.75
#define WAVE_DISTORTION_STRENGTH 0.2
#define WAVE_COLOR_STRENGTH 0.4
#define LIGHTING_INTENSITY 0.8  // How much the lighting affects the water
#define MIN_BRIGHTNESS 0.4      // Minimum brightness of water even in darkness

// Anti-aliasing
#define SMOOTHSTEP_AA 0.01

// How far away from the shoreline is the foam visible?
#define FOAM_DISTANCE 0.3

void main() {
    // Mix colors based on depth
    float waterDepth = 1.0 - vUv.y * vUv.y;
    vec3 color = shallowColor;
    color = mix(color, deepColor, waterDepth);

    // Sample noise
    vec2 tilingDistortionUv = abs(fract(vPosition.xz * WAVE_DISTORTION_SCALE + time * WAVE_DISTORTION_SPEED) * 2.0 - 1.0);
    vec2 distortSample = texture2D(waveDistortionTexture, tilingDistortionUv).rg * WAVE_DISTORTION_STRENGTH;

    vec2 tilingNoiseUv = abs(fract(vPosition.xz * WAVE_SCALE + time * WAVE_SPEED) * 2.0 - 1.0);
    vec2 distortedUv = vec2(
      tilingNoiseUv.x + distortSample.x, 
      tilingNoiseUv.y + distortSample.y
    );
    float waveNoise = texture2D(waveNoiseTexture, distortedUv).r;
    float waveNoiseCutoff = clamp(waterDepth / FOAM_DISTANCE, 0.0, 1.0) * WAVE_NOISE_CUTOFF;
    waveNoise = smoothstep(waveNoiseCutoff - SMOOTHSTEP_AA, waveNoiseCutoff + SMOOTHSTEP_AA, waveNoise);
    color = color + waveNoise * WAVE_COLOR_STRENGTH;
    
    // Calculate lighting using Three.js built-in light uniforms
    vec3 lighting = vec3(0.0);
    
    // Ambient light (reduced intensity)
    lighting += ambientLightColor * 0.7;
    
    // Directional light (reduced intensity)
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(directionalLights[0].direction);
    float diffuse = max(dot(normal, lightDir), 0.0);
    lighting += directionalLights[0].color * diffuse * 0.6;
    
    // Mix between base color and lit color
    vec3 litColor = color * lighting;
    color = mix(color * MIN_BRIGHTNESS, litColor, LIGHTING_INTENSITY);
    
    gl_FragColor = vec4(color, 1.0);
}
`;

import {
  getCenterPoint,
  HexCell,
  isUnderwater,
  TerrainType,
} from "../../lib/HexCell";
import { HexDirection, HexMetrics } from "../../lib/HexMetrics";
import { HexMesh } from "../../lib/HexMesh";
import { getCell, HexGrid } from "../../lib/HexGrid";
import { getNeighbor } from "@/lib/coordinates/HexCoordinates";

interface HexGridWaterProps {
  cells: HexCell[];
  grid: HexGrid;
}

export const HexGridWater = React.memo(function HexGridWater({
  cells,
  grid,
}: HexGridWaterProps) {
  const { waterGeometry } = useMemo(() => {
    const hexMesh = new HexMesh();
    cells.forEach((cell) => {
      if (isUnderwater(cell)) {
        const center = getCenterPoint(cell);
        for (let d = 0; d < 6; d++) {
          hexMesh.addTriangleWithUVs(
            center,
            HexMetrics.getFirstCorner(center, d),
            HexMetrics.getSecondCorner(center, d),
            new THREE.Color(WATER_COLORS.DEEP),
            [0, 0],
            // UVs depend on whether the cell is on the shoreline or not. 1 is
            // shoreline, 0 is deep water.
            cornerIsShoreline(grid, cell, d - 1, d) ? [1, 1] : [0, 0],
            cornerIsShoreline(grid, cell, d, d + 1) ? [1, 1] : [0, 0]
          );
        }
      }
    });

    const waterGeometry = new THREE.BufferGeometry();
    waterGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(hexMesh.vertices, 3)
    );
    waterGeometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(hexMesh.uvs, 2)
    );
    waterGeometry.setIndex(hexMesh.indices);
    waterGeometry.computeVertexNormals();

    return { waterGeometry };
  }, [cells, grid]);

  const waterMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const [waveNoiseTexture, waveDistortionTexture] = useTexture([
    "/textures/water_wave_noise.png",
    "/textures/water_wave_distortion.png",
  ]);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      deepColor: { value: new THREE.Color(WATER_COLORS.DEEP) },
      shallowColor: { value: new THREE.Color(WATER_COLORS.SHALLOW) },
      waveNoiseTexture: { value: waveNoiseTexture },
      waveDistortionTexture: { value: waveDistortionTexture },
      ...THREE.UniformsLib.lights, // Include Three.js light uniforms
    }),
    [waveNoiseTexture, waveDistortionTexture]
  );

  useFrame((state) => {
    if (waterMaterialRef.current) {
      waterMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh geometry={waterGeometry}>
      <shaderMaterial
        ref={waterMaterialRef}
        transparent
        uniforms={uniforms}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        lights // Enable Three.js light handling
      />
    </mesh>
  );
});

// Return whether the corner between dPrev and dNext should be UV'd as a
// shoreline.
function cornerIsShoreline(
  grid: HexGrid,
  cell: HexCell,
  dPrev: HexDirection,
  dNext: HexDirection
): boolean {
  const neighborPrev = getCell(grid, getNeighbor(cell.coordinates, dPrev));
  const neighborNext = getCell(grid, getNeighbor(cell.coordinates, dNext));
  return (
    ((neighborPrev && !isUnderwater(neighborPrev)) ||
      (neighborNext && !isUnderwater(neighborNext))) ??
    false
  );
}
