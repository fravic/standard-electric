import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { debounce } from "lodash";

import { HexCoordinates } from "../../lib/HexCoordinates";
import { HexCell, TerrainType } from "../../lib/HexCell";
import { HexMesh } from "../../lib/HexMesh";
import { HexMetrics } from "../../lib/HexMetrics";
import { useGameStore } from "../../store/gameStore";

interface HexGridTerrainProps {
  cells: HexCell[];
  onClick: (event: ThreeEvent<MouseEvent | PointerEvent>) => void;
  onHover: (event: ThreeEvent<PointerEvent>) => void;
  onUpdateTerrain?: (
    coordinates: HexCoordinates,
    terrainType: TerrainType
  ) => void;
  debug?: boolean;
}

export const HexGridTerrain = React.memo(function HexGridTerrain({
  cells,
  onClick,
  onHover,
  onUpdateTerrain,
  debug = false,
}: HexGridTerrainProps) {
  const isPaintbrushMode = useGameStore(
    (state) => state.mapBuilder.isPaintbrushMode
  );
  const selectedTerrainType = useGameStore(
    (state) => state.mapBuilder.selectedTerrainType
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

  const paintTerrain = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (isPaintbrushMode && selectedTerrainType && onUpdateTerrain) {
        // Get intersection point from the event
        const point = event.point;
        const hexCoords = HexCoordinates.fromWorldPoint([
          point.x,
          point.y,
          point.z,
        ]);
        onUpdateTerrain(hexCoords, selectedTerrainType);
        event.stopPropagation();
      }
    },
    [isPaintbrushMode, selectedTerrainType, onUpdateTerrain]
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (isPaintbrushMode && selectedTerrainType) {
        paintTerrain(event);
      } else {
        onClick(event);
      }
    },
    [onClick, paintTerrain, isPaintbrushMode, selectedTerrainType]
  );

  const { terrainGeometry } = useMemo(() => {
    const hexMesh = new HexMesh();
    cells.forEach((cell) => {
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
  }, [cells]);

  return (
    <mesh
      geometry={terrainGeometry}
      onClick={handleClick}
      onPointerMove={debouncedOnHover}
    >
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        metalness={0.0}
        roughness={0.8}
      />
      {debug &&
        cells.map((cell) => {
          const [x, y, z] = cell.centerPoint();
          return (
            <Text
              key={cell.coordinates.toString()}
              position={[x, y + 0.1, z]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.2}
              color="black"
            >
              {cell.coordinates.toString()}
            </Text>
          );
        })}
    </mesh>
  );
});
