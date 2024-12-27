import * as THREE from "three";
import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";

import { HexCell, TerrainType } from "../../lib/HexCell";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { HexGridTerrain } from "./HexGridTerrain";
import { HexGridWater } from "./HexGridWater";
import { HexGrid } from "../../lib/HexGrid";
import { PowerLines } from "../PowerSystem/PowerLines";
import { useGameStore } from "../../store/gameStore";
import { PowerPole as PowerPoleModel } from "../../lib/PowerSystem";
import { PowerPole } from "../PowerSystem/PowerPole";
import { CornerCoordinates } from "../../lib/CornerCoordinates";
import { PLAYER_ID } from "../../store/constants";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { HexGridChunk as HexGridChunkType } from "../../lib/HexGridChunk";

interface HexGridChunkProps {
  chunk: HexGridChunkType;
  grid: HexGrid;
  onCellClick: (coordinates: HexCoordinates) => void;
  debug?: boolean;
}

function GhostPowerPole({ hoverCorner }: { hoverCorner: CornerCoordinates }) {
  const powerPoles = useGameStore((state) => state.powerPoles);
  const poleModel = useMemo(() => {
    const pole = new PowerPoleModel("ghost", hoverCorner, true);
    pole.createConnections(powerPoles);
    return pole;
  }, [hoverCorner, powerPoles]);
  return <PowerPole pole={poleModel} isGhost />;
}

export const HexGridChunk = React.memo(function HexGridChunk({
  chunk,
  grid,
  onCellClick,
  debug = false,
}: HexGridChunkProps) {
  const isBuildMode = useGameStore(
    (state) => state.players[PLAYER_ID].isBuildMode
  );
  const updateHexTerrain = useGameStore((state) => state.updateHexTerrain);

  const validCoordinates = useMemo(() => {
    return chunk.coordinates.filter((c): c is HexCoordinates => c !== null);
  }, [chunk.coordinates]);

  const hoverCorner = useStoreWithEqualityFn(
    useGameStore,
    (state) => {
      const hoverLocation = state.players[PLAYER_ID].hoverLocation;
      if (!hoverLocation) return null;
      return HexCoordinates.getNearestCornerInChunk(
        new THREE.Vector3(
          hoverLocation.worldPoint[0],
          hoverLocation.worldPoint[1],
          hoverLocation.worldPoint[2]
        ),
        validCoordinates
      );
    },
    (a, b) => (a && b ? a.equals(b) : a === b)
  );
  const addPowerPole = useGameStore((state) => state.addPowerPole);
  const setHoverLocation = useGameStore((state) => state.setHoverLocation);

  const handleHover = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const point = event.point;
      setHoverLocation(PLAYER_ID, [point.x, point.y, point.z]);
    },
    [setHoverLocation]
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      const point = event.point.clone();
      const nearestCorner = HexCoordinates.getNearestCornerInChunk(
        point,
        validCoordinates
      );
      if (nearestCorner) {
        if (isBuildMode) {
          addPowerPole(nearestCorner);
        }
        onCellClick(nearestCorner.hex);
      }
    },
    [addPowerPole, validCoordinates, isBuildMode, onCellClick]
  );

  const handleTerrainUpdate = useCallback(
    (coordinates: HexCoordinates, terrainType: TerrainType) => {
      updateHexTerrain(coordinates, terrainType);
    },
    [updateHexTerrain]
  );

  const cells = useMemo(() => {
    return validCoordinates
      .map((coordinates: HexCoordinates) => grid.getCell(coordinates))
      .filter((cell): cell is HexCell => cell !== null);
  }, [grid, validCoordinates]);

  return (
    <group>
      <HexGridTerrain
        cells={cells}
        onClick={handleClick}
        onHover={handleHover}
        onUpdateTerrain={handleTerrainUpdate}
        debug={debug}
      />
      <HexGridWater cells={cells} grid={grid} />
      <PowerLines chunkCells={cells.map((cell: HexCell) => cell.coordinates)} />
      {isBuildMode && hoverCorner && (
        <GhostPowerPole hoverCorner={hoverCorner} />
      )}
    </group>
  );
});
