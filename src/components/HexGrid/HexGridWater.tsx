import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";

import waterVertexShader from "../../shaders/water.vert?raw";
import waterFragmentShader from "../../shaders/water.frag?raw";

import { HexCell } from "../../lib/HexCell";
import { HexDirection, HexMetrics } from "../../lib/HexMetrics";
import { HexMesh } from "../../lib/HexMesh";
import { HexGrid } from "../../lib/HexGrid";

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
      if (cell.isUnderwater) {
        const center = cell.waterCenterPoint();
        for (let d = 0; d < 6; d++) {
          hexMesh.addTriangleWithUVs(
            center,
            HexMetrics.getFirstCorner(center, d),
            HexMetrics.getSecondCorner(center, d),
            new THREE.Color(0xaaaaff),
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
        uniforms={{
          time: { value: 0 },
          deepColor: { value: new THREE.Color(0xc1e4ff) },
          shallowColor: { value: new THREE.Color(0xd3ecff) },
          waveNoiseTexture: {
            value: waveNoiseTexture,
          },
          waveDistortionTexture: {
            value: waveDistortionTexture,
          },
        }}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
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
  const neighborPrev = grid.getCell(cell.coordinates.getNeighbor(dPrev));
  const neighborNext = grid.getCell(cell.coordinates.getNeighbor(dNext));
  return (
    neighborPrev?.isUnderwater === false || neighborNext?.isUnderwater === false
  );
}
