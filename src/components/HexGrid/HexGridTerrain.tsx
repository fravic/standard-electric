import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { HexMetrics } from "../../lib/HexMetrics";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { HexCell } from "../../lib/HexCell";

interface HexGridTerrainProps {
  chunk: HexCell[];
  onClick: (coordinates: HexCoordinates) => void;
}

export function HexGridTerrain({ chunk, onClick }: HexGridTerrainProps) {
  const { terrainGeometry } = useMemo(() => {
    const terrainVertices: number[] = [];
    const terrainIndices: number[] = [];
    const terrainColors: number[] = [];

    chunk.forEach((cell, i) => {
      const center = cell.centerPoint();
      const baseTerrainVertex = terrainVertices.length / 3;
      const color = cell.color();

      terrainVertices.push(center[0], center[1], center[2]);
      terrainColors.push(color.r, color.g, color.b);

      for (let d = 0; d < 6; d++) {
        const corner = HexMetrics.getFirstCorner(d);
        terrainVertices.push(
          center[0] + corner[0],
          center[1] + corner[1],
          center[2] + corner[2]
        );
        terrainColors.push(color.r, color.g, color.b);
      }

      for (let d = 0; d < 6; d++) {
        terrainIndices.push(
          baseTerrainVertex,
          baseTerrainVertex + d + 1,
          baseTerrainVertex + ((d + 1) % 6) + 1
        );
      }
    });

    const terrainGeometry = new THREE.BufferGeometry();
    terrainGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(terrainVertices, 3)
    );
    terrainGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(terrainColors, 3)
    );
    terrainGeometry.setIndex(terrainIndices);
    terrainGeometry.computeVertexNormals();

    return { terrainGeometry };
  }, [chunk]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      const coords = HexCoordinates.fromPosition(event.point.toArray());
      onClick(coords);
    },
    [onClick]
  );

  return (
    <mesh geometry={terrainGeometry} onClick={handleClick}>
      <meshStandardMaterial vertexColors />
    </mesh>
  );
}
