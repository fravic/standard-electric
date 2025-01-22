import * as THREE from "three";
import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { useSelector } from "@xstate/store/react";

import { HexCell, TerrainType, Population } from "@/lib/HexCell";
import { CornerCoordinates, HexCoordinates } from "@/lib/coordinates/types";
import { createCornerCoordinates } from "@/lib/coordinates/CornerCoordinates";
import { HexGridTerrain } from "./HexGridTerrain";
import { HexGridWater } from "./HexGridWater";
import { HexGrid, getCell } from "@/lib/HexGrid";
import { GameContext } from "@/actor/game.context";
import { PLAYER_ID } from "@/lib/constants";
import {
  PowerPole,
  createPowerPole,
  findPossibleConnectionsForCoordinates,
} from "@/lib/buildables/PowerPole";
import { createCoalPlant } from "@/lib/buildables/CoalPlant";
import {
  createHexCoordinates,
  equals,
  fromWorldPoint,
  getNearestCornerInChunk,
} from "@/lib/coordinates/HexCoordinates";

import { Buildable } from "../Buildable";
import { PowerLines } from "../PowerSystem/PowerLines";
import { HexMetrics } from "@/lib/HexMetrics";
import { clientStore } from "@/lib/clientState";

interface HexGridChunkProps {
  chunk: {
    xStart: number;
    zStart: number;
  };
  grid: HexGrid;
  onCellClick: (
    coordinates: HexCoordinates,
    nearestCorner: CornerCoordinates | null
  ) => void;
  debug?: boolean;
}

export const HexGridChunk = React.memo(function HexGridChunk({
  chunk,
  grid,
  onCellClick,
  debug = false,
}: HexGridChunkProps) {
  const buildMode = useSelector(clientStore, (state) => state.context.buildMode);
  const hoverLocation = useSelector(clientStore, (state) => state.context.hoverLocation);
  const buildables = GameContext.useSelector(
    (state) => state.public.buildables ?? []
  );
  const sendGameEvent = GameContext.useSend();

  const validCoordinates = useMemo(() => {
    const coordinates: HexCoordinates[] = [];
    for (let z = chunk.zStart; z < chunk.zStart + HexMetrics.chunkSizeZ; z++) {
      for (
        let x = chunk.xStart;
        x < chunk.xStart + HexMetrics.chunkSizeX;
        x++
      ) {
        coordinates.push(createHexCoordinates(x, z));
      }
    }
    return coordinates;
  }, [chunk]);

  const ghostBuildable = useMemo(() => {
    if (!hoverLocation || !buildMode) return null;

    const point = new THREE.Vector3(
      hoverLocation.worldPoint[0],
      hoverLocation.worldPoint[1],
      hoverLocation.worldPoint[2]
    );

    if (buildMode.type === "power_pole") {
      const nearestCorner = getNearestCornerInChunk(point, validCoordinates);
      if (nearestCorner) {
        const otherPoles = buildables.filter(
          (b): b is PowerPole => b.type === "power_pole"
        );
        const ghostPole = createPowerPole({
          id: "ghost",
          cornerCoordinates: nearestCorner,
          playerId: PLAYER_ID,
          connectedToIds: findPossibleConnectionsForCoordinates(
            nearestCorner,
            otherPoles
          ),
          isGhost: true,
        });
        return ghostPole;
      }
    } else if (buildMode.type === "coal_plant") {
      const coords = fromWorldPoint([point.x, point.y, point.z]);
      if (validCoordinates.some((c) => equals(c, coords))) {
        return createCoalPlant({
          id: "ghost",
          coordinates: coords,
          playerId: PLAYER_ID,
          isGhost: true,
        });
      }
    }
    return null;
  }, [buildMode, validCoordinates, buildables, hoverLocation]);

  const handleHover = useCallback((event: ThreeEvent<PointerEvent>) => {
    const point = event.point;
    clientStore.send({ type: "setHoverLocation", worldPoint: [point.x, point.y, point.z] });
  }, []);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      const point = event.point.clone();
      const coords = fromWorldPoint([point.x, point.y, point.z]);
      const isValidCoord = validCoordinates.some((c) => equals(c, coords));

      if (!isValidCoord) return;

      const nearestCorner = getNearestCornerInChunk(point, validCoordinates);

      onCellClick(coords, nearestCorner);
    },
    [buildMode, validCoordinates, onCellClick]
  );

  const handleCellUpdate = useCallback(
    (coordinates: HexCoordinates, updates: Partial<HexCell>) => {
      if (updates.terrainType !== undefined) {
        sendGameEvent({
          type: "UPDATE_HEX_TERRAIN",
          coordinates,
          terrainType: updates.terrainType,
        });
      }
      if (updates.population !== undefined) {
        sendGameEvent({
          type: "UPDATE_HEX_POPULATION",
          coordinates,
          population: updates.population,
        });
      }
    },
    []
  );

  const cells = useMemo(() => {
    return validCoordinates
      .map((coordinates: HexCoordinates) => getCell(grid, coordinates))
      .filter((cell): cell is HexCell => cell !== null);
  }, [grid, validCoordinates]);

  // Filter buildables in this chunk
  const chunkBuildables = useMemo(() => {
    return buildables.filter((buildable) => {
      if (buildable.coordinates) {
        return validCoordinates.some((coord) =>
          equals(coord, buildable.coordinates as HexCoordinates)
        );
      }
      if (buildable.cornerCoordinates) {
        return validCoordinates.some((coord) =>
          equals(buildable.cornerCoordinates!.hex as HexCoordinates, coord)
        );
      }
      return false;
    });
  }, [buildables, validCoordinates]);

  return (
    <group>
      <HexGridTerrain
        cells={cells}
        onClick={handleClick}
        onUpdateCell={handleCellUpdate}
        onHover={handleHover}
        debug={debug}
      />
      <HexGridWater cells={cells} grid={grid} />
      <PowerLines chunkCells={cells.map((cell: HexCell) => cell.coordinates)} />
      {chunkBuildables.map((buildable) => (
        <Buildable key={buildable.id} buildable={buildable} />
      ))}
      {ghostBuildable && <Buildable buildable={ghostBuildable} />}
    </group>
  );
});
