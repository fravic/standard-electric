import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import { HexCell } from "../../lib/HexCell";
import { HexMetrics } from "../../lib/HexMetrics";

import waterVertexShader from "../../shaders/water.vert";
import waterFragmentShader from "../../shaders/water.frag";

interface HexGridWaterProps {
  chunk: HexCell[];
}

export function HexGridWater({ chunk }: HexGridWaterProps) {
  const { waterGeometry } = useMemo(() => {
    const waterVertices: number[] = [];
    const waterIndices: number[] = [];
    const waterUVs: number[] = [];

    chunk.forEach((cell, i) => {
      const center = cell.centerPoint();

      if (cell.isUnderwater) {
        const baseWaterVertex = waterVertices.length / 3;
        const waterY =
          (cell.waterLevel + HexMetrics.waterElevationOffset) *
          HexMetrics.elevationStep;

        waterVertices.push(center[0], waterY, center[2]);
        waterUVs.push(0.5, 0.5);

        for (let d = 0; d < 6; d++) {
          const corner = HexMetrics.getFirstCorner(d);
          waterVertices.push(
            center[0] + corner[0],
            waterY,
            center[2] + corner[2]
          );

          const angle = (d / 6) * Math.PI * 2;
          waterUVs.push(
            0.5 + Math.cos(angle) * 0.5,
            0.5 + Math.sin(angle) * 0.5
          );
        }

        for (let d = 0; d < 6; d++) {
          waterIndices.push(
            baseWaterVertex,
            baseWaterVertex + d + 1,
            baseWaterVertex + ((d + 1) % 6) + 1
          );
        }
      }
    });
    const waterGeometry = new THREE.BufferGeometry();
    waterGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(waterVertices, 3)
    );
    waterGeometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(waterUVs, 2)
    );
    waterGeometry.setIndex(waterIndices);
    waterGeometry.computeVertexNormals();

    return { waterGeometry };
  }, [chunk]);

  const waterMaterialRef = useRef<THREE.ShaderMaterial>(null);

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
          waterColor: { value: new THREE.Color(0xaaaaff) },
          cameraPosition: { value: new THREE.Vector3() },
        }}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
      />
    </mesh>
  );
}
