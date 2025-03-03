import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { debounce } from "lodash";
import { useSelector } from "@xstate/store/react";

import {
  coordinatesToString,
  fromWorldPoint,
  HexCoordinates,
} from "@/lib/coordinates/HexCoordinates";
import {
  HexCell,
  Population,
  getColor,
  getColorWithExplorationStatus,
  getCenterPoint,
  isUnderwater,
} from "@/lib/HexCell";
import { HexMesh } from "@/lib/HexMesh";
import { HexMetrics } from "@/lib/HexMetrics";
import { clientStore } from "@/lib/clientState";
import { CityLabel } from "./CityLabel";
import { HexGridDecorations } from "./HexGridDecorations";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { SurveyResult } from "@/lib/surveys";

interface HexGridTerrainProps {
  cells: HexCell[];
  onClick: (event: ThreeEvent<MouseEvent | PointerEvent>) => void;
  onHover: (event: ThreeEvent<PointerEvent>) => void;
  onPointerLeave: () => void;
  onUpdateCell?: (
    coordinates: HexCoordinates,
    updates: Partial<HexCell>
  ) => void;
  debug?: boolean;
}

export const HexGridTerrain = React.memo(function HexGridTerrain({
  cells,
  onClick,
  onHover,
  onPointerLeave,
  onUpdateCell,
  debug = false,
}: HexGridTerrainProps) {
  const isPaintbrushMode = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.isPaintbrushMode
  );
  const selectedTerrainType = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.selectedTerrainType
  );
  const selectedPopulation = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.selectedPopulation
  );

  const userId = AuthContext.useSelector((state) => state.userId);
  const surveyResults = GameContext.useSelector((state) => {
    if (!userId) return undefined;
    return state.private.surveyResultByHexCell;
  });

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

  const paintCell = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (
        isPaintbrushMode &&
        (selectedTerrainType || selectedPopulation !== null) &&
        onUpdateCell
      ) {
        // Get intersection point from the event
        const point = event.point;
        const hexCoords = fromWorldPoint([point.x, point.y, point.z]);

        const updates: Partial<HexCell> = {};
        if (selectedTerrainType) {
          updates.terrainType = selectedTerrainType;
        }
        if (selectedPopulation !== null) {
          updates.population = selectedPopulation;
        }

        onUpdateCell(hexCoords, updates);
        event.stopPropagation();
      }
    },
    [isPaintbrushMode, selectedTerrainType, selectedPopulation, onUpdateCell]
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (
        isPaintbrushMode &&
        (selectedTerrainType || selectedPopulation !== null)
      ) {
        paintCell(event);
      } else {
        onClick(event);
      }
    },
    [
      onClick,
      paintCell,
      isPaintbrushMode,
      selectedTerrainType,
      selectedPopulation,
    ]
  );

  const { terrainGeometry } = useMemo(() => {
    const hexMesh = new HexMesh();
    cells.forEach((cell) => {
      const center = getCenterPoint(cell);
      // Use the new function to get color with exploration status
      const color = getColorWithExplorationStatus(cell, surveyResults);
      for (let d = 0; d < 6; d++) {
        if (!isUnderwater(cell)) {
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
  }, [cells, surveyResults]);

  return (
    <>
      <mesh
        geometry={terrainGeometry}
        onClick={handleClick}
        onPointerMove={debouncedOnHover}
        onPointerLeave={onPointerLeave}
      >
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          metalness={0.0}
          roughness={0.8}
        />
        {/* Debug Labels */}
        {debug &&
          cells.map((cell) => {
            const [x, y, z] = getCenterPoint(cell);
            return (
              <Text
                key={`debug-${coordinatesToString(cell.coordinates)}`}
                position={[x, y + 0.1, z]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.2}
                color="black"
              >
                {`${coordinatesToString(cell.coordinates)}${
                  cell.population !== Population.Unpopulated
                    ? `\n${Population[cell.population]}`
                    : ""
                }`}
              </Text>
            );
          })}
        {/* City Labels */}
        {cells.map((cell) => (
          <CityLabel
            key={`city-${coordinatesToString(cell.coordinates)}`}
            cell={cell}
          />
        ))}
      </mesh>
      <HexGridDecorations cells={cells} />
    </>
  );
});
