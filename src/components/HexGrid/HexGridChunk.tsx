import * as THREE from "three";
import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";

import { HexCell, TerrainType, Population } from "@/lib/HexCell";
import { HexCoordinates } from "@/lib/coordinates/types";
import { createCornerCoordinates } from "@/lib/coordinates/CornerCoordinates";
import { HexGridTerrain } from "./HexGridTerrain";
import { HexGridWater } from "./HexGridWater";
import { HexGrid, getCell } from "@/lib/HexGrid";
import { GameContext } from "@/actor/game.context";
import { PLAYER_ID } from "@/lib/constants";
import {
  PowerPole,
  createPowerPole,
  createPowerPoleConnections,
} from "@/lib/buildables/PowerPole";
import { createCoalPlant } from "@/lib/buildables/CoalPlant";
import {
  createHexCoordinates,
  equals,
  fromWorldPoint,
  getNearestCornerInChunk,
} from "@/lib/coordinates/HexCoordinates";
import { GameEvent } from "@/actor/game.types";

import { Buildable } from "../Buildable";
import { PowerLines } from "../PowerSystem/PowerLines";
import { HexMetrics } from "@/lib/HexMetrics";

interface HexGridChunkProps {
  chunk: {
    xStart: number;
    zStart: number;
  };
  grid: HexGrid;
  onCellClick: (coordinates: HexCoordinates) => void;
  debug?: boolean;
}

export const HexGridChunk = React.memo(function HexGridChunk({
  chunk,
  grid,
  onCellClick,
  debug = false,
}: HexGridChunkProps) {
  const buildMode = GameContext.useSelector(
    (state) => state.public.players[PLAYER_ID].buildMode
  );
  const buildables = GameContext.useSelector(
    (state) => state.public.buildables ?? []
  );

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

  /*

  const ghostBuildable = useMemo(() => {
    const hoverLocation = GameContext.useSelector(
      (state) => state.public.players[PLAYER_ID].hoverLocation
    );
    if (!hoverLocation || !buildMode) return null;

    const point = new THREE.Vector3(
      hoverLocation.worldPoint[0],
      hoverLocation.worldPoint[1],
      hoverLocation.worldPoint[2]
    );

    if (buildMode.type === "power_pole") {
      const nearestCorner = getNearestCornerInChunk(
        point,
        validCoordinates,
        createCornerCoordinates
      );
      if (nearestCorner) {
        const ghostPole = createPowerPole(
          "ghost",
          nearestCorner,
          PLAYER_ID,
          true
        );
        // Create connections with existing power poles
        const otherPoles = buildables.filter(
          (b): b is PowerPole => b.type === "power_pole"
        );
        createPowerPoleConnections(ghostPole, otherPoles);
        return ghostPole;
      }
    } else if (buildMode.type === "coal_plant") {
      const coords = fromWorldPoint([point.x, point.y, point.z]);
      if (validCoordinates.some((c) => equals(c, coords))) {
        return createCoalPlant("ghost", coords, PLAYER_ID, true);
      }
    }
    return null;
  }, [buildMode, validCoordinates, buildables]);

  const handleHover = useCallback((event: ThreeEvent<PointerEvent>) => {
    const point = event.point;
    GameContext.send<GameEvent>({
      type: "SET_HOVER_LOCATION",
      playerId: PLAYER_ID,
      worldPoint: [point.x, point.y, point.z],
    });
  }, []);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      const point = event.point.clone();
      const coords = fromWorldPoint([point.x, point.y, point.z]);
      const isValidCoord = validCoordinates.some((c) => equals(c, coords));

      if (!isValidCoord) return;

      if (buildMode?.type === "power_pole") {
        const nearestCorner = getNearestCornerInChunk(
          point,
          validCoordinates,
          createCornerCoordinates
        );
        if (nearestCorner) {
          GameContext.send<GameEvent>({
            type: "ADD_BUILDABLE",
            buildable: {
              type: "power_pole",
              cornerCoordinates: nearestCorner,
              playerId: PLAYER_ID,
            },
          });
        }
      } else if (buildMode?.type === "coal_plant") {
        GameContext.send<GameEvent>({
          type: "ADD_BUILDABLE",
          buildable: {
            type: "coal_plant",
            coordinates: coords,
            playerId: PLAYER_ID,
          },
        });
      } else {
        onCellClick(coords);
      }
    },
    [buildMode, validCoordinates, onCellClick]
  );

  const handleCellUpdate = useCallback(
    (coordinates: HexCoordinates, updates: Partial<HexCell>) => {
      if (updates.terrainType !== undefined) {
        GameContext.send<GameEvent>({
          type: "UPDATE_HEX_TERRAIN",
          coordinates,
          terrainType: updates.terrainType,
        });
      }
      if (updates.population !== undefined) {
        GameContext.send<GameEvent>({
          type: "UPDATE_HEX_POPULATION",
          coordinates,
          population: updates.population,
        });
      }
    },
    []
  );
  */

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
        // onClick={handleClick}
        // onHover={handleHover}
        // onUpdateCell={handleCellUpdate}
        onClick={() => {}}
        onHover={() => {}}
        onUpdateCell={() => {}}
        debug={debug}
      />
      <HexGridWater cells={cells} grid={grid} />
      <PowerLines chunkCells={cells.map((cell: HexCell) => cell.coordinates)} />
      {chunkBuildables.map((buildable) => (
        <Buildable key={buildable.id} buildable={buildable} />
      ))}
      {/* ghostBuildable && <Buildable buildable={ghostBuildable} /> */}
    </group>
  );
});
