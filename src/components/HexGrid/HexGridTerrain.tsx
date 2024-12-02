import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { HexMetrics } from "../../lib/HexMetrics";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { HexCell } from "../../lib/HexCell";
import { HexMesh } from "../../lib/HexMesh";

interface HexGridTerrainProps {
  chunk: HexCell[];
  onClick: (coordinates: HexCoordinates) => void;
}

export function HexGridTerrain({ chunk, onClick }: HexGridTerrainProps) {
  const { terrainGeometry } = useMemo(() => {
    const hexMesh = new HexMesh();
    chunk.forEach((cell, i) => {
      const center = cell.centerPoint();
      const color = cell.color();
      for (let d = 0; d < 6; d++) {
        if (!cell.isUnderwater) {
          hexMesh.addTriangle(
            center,
            HexMetrics.getFirstCorner(center, d),
            HexMetrics.getSecondCorner(center, d),
            color
          );
        }
      }
    });

    const terrainGeometry = new THREE.BufferGeometry();
    terrainGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(hexMesh.vertices, 3)
    );
    terrainGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(hexMesh.colors, 3)
    );
    terrainGeometry.setIndex(hexMesh.indices);
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
