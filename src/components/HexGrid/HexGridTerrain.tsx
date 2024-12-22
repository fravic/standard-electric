import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";

import { HexDirection, HexMetrics } from "../../lib/HexMetrics";
import { HexCoordinates, Vertex } from "../../lib/HexCoordinates";
import { HexCell } from "../../lib/HexCell";
import { HexMesh } from "../../lib/HexMesh";
import { useGameStore } from "../../store/gameStore";

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
  const addPowerPole = useGameStore((state) => state.addPowerPole);

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
      const point = event.point.clone();
      setClickPoint(point);

      if (event.shiftKey) {
        // When shift is held, place a power pole at the nearest vertex
        const cell = HexCoordinates.fromWorldPoint(point.toArray());
        const cellCenter = chunk
          .find((c) => c.coordinates.toString() === cell.toString())
          ?.centerPoint();

        if (cellCenter) {
          // Find the nearest vertex
          let nearestDirection: HexDirection | null = null;
          let minDistance = Infinity;

          for (let d = 0; d < 6; d++) {
            const vertex = HexMetrics.getFirstCorner(cellCenter, d);
            const dx = vertex[0] - point.x;
            const dy = vertex[1] - point.y;
            const dz = vertex[2] - point.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < minDistance) {
              minDistance = distance;
              nearestDirection = d as HexDirection;
            }
          }

          if (nearestDirection !== null) {
            addPowerPole(cell, nearestDirection);
          }
        }
      } else {
        // Normal click behavior
        const coords = HexCoordinates.fromWorldPoint(point.toArray());
        onClick(coords);
      }
    },
    [onClick, debug, chunk, addPowerPole]
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
              cell.centerPoint()[1] + 0.3,
              cell.centerPoint()[2],
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.3}
            color="black"
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.3}
          >
            {`${cell.coordinates.toString()}`}
          </Text>
        ))}
    </group>
  );
}
