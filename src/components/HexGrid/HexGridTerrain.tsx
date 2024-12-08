import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";

import { HexMetrics } from "../../lib/HexMetrics";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { HexCell } from "../../lib/HexCell";
import { HexMesh } from "../../lib/HexMesh";

interface HexGridTerrainProps {
  chunk: HexCell[];
  onClick: (coordinates: HexCoordinates) => void;
  debug?: boolean;
}

export function HexGridTerrain({
  chunk,
  onClick,
  debug = false,
}: HexGridTerrainProps) {
  const [clickPoint, setClickPoint] = React.useState<THREE.Vector3 | null>(
    null
  );

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
      setClickPoint(event.point.clone());
      const coords = HexCoordinates.fromWorldPoint(event.point.toArray());
      onClick(coords);
    },
    [onClick, debug]
  );

  return (
    <group>
      <mesh geometry={terrainGeometry} onClick={handleClick}>
        <meshStandardMaterial vertexColors />
      </mesh>

      {debug && clickPoint && (
        <mesh position={clickPoint}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}

      {debug &&
        chunk.map((cell) => (
          <Text
            key={cell.coordinates.toString()}
            position={[
              cell.centerPoint()[0],
              cell.centerPoint()[1] + 0.5,
              cell.centerPoint()[2],
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.3}
            color="black"
            anchorX="center"
            anchorY="middle"
          >
            {`${cell.coordinates.toStringCubic()}`}
          </Text>
        ))}
    </group>
  );
}
