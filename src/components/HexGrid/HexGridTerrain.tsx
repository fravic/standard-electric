import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { debounce } from "lodash";

import { HexCoordinates } from "../../lib/HexCoordinates";
import { HexCell } from "../../lib/HexCell";
import { HexMesh } from "../../lib/HexMesh";
import { HexMetrics } from "../../lib/HexMetrics";

interface HexGridTerrainProps {
  chunk: HexCell[];
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onHover: (event: ThreeEvent<PointerEvent>) => void;
  debug?: boolean;
}

export const HexGridTerrain = React.memo(function HexGridTerrain({
  chunk,
  onClick,
  onHover,
  debug = false,
}: HexGridTerrainProps) {
  const [clickPoint, setClickPoint] = React.useState<THREE.Vector3 | null>(
    null
  );

  const debouncedOnHover = useMemo(
    () => debounce(onHover, 50, { maxWait: 50 }),
    [onHover]
  );

  React.useEffect(() => {
    return () => {
      if (debouncedOnHover) {
        debouncedOnHover.cancel();
      }
    };
  }, [debouncedOnHover]);

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

  return (
    <group>
      <mesh
        geometry={terrainGeometry}
        onClick={onClick}
        onPointerMove={debouncedOnHover}
      >
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
});
