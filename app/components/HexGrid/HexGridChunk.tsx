import * as THREE from "three";
import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { useSelector } from "@xstate/store/react";

import { HexCell } from "@/lib/HexCell";
import { CornerCoordinates, HexCoordinates } from "@/lib/coordinates/types";
import { HexGridTerrain } from "./HexGridTerrain";
import { HexGridWater } from "./HexGridWater";
import { HexGrid, getCell } from "@/lib/HexGrid";
import { GameContext } from "@/actor/game.context";
import { GamePrivateContext } from "@/actor/game.types";
import {
  PowerPole,
  createPowerPole,
  findPossibleConnectionsForCoordinates,
} from "@/lib/buildables/PowerPole";
import {
  createHexCoordinates,
  equals,
  fromWorldPoint,
  getNearestCornerInChunk,
} from "@/lib/coordinates/HexCoordinates";

import { Buildable } from "../Buildable";
import { PowerLines } from "../PowerSystem/PowerLines";
import { HexMetrics } from "@/lib/HexMetrics";
import { clientStore, isPowerPlantBuildMode } from "@/lib/clientState";
import { AuthContext } from "@/auth.context";
import { HighlightedHexCells } from "./HighlightedHexCells";
import { useMapEditor } from "@/routes/mapEditor";
import { validateBuildableLocation } from "@/lib/buildables/validateBuildableLocation";
import { SurveyProgressIndicator } from "./SurveyProgressIndicator";

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
  const userId = AuthContext.useSelector((state) => state.userId);
  const player = GameContext.useSelector(
    (state) => state.public.players[userId!]
  );
  const gameState = GameContext.useSelector((state) => state);

  // Get current player's survey data and game time
  const currentTick = gameState.public.time.totalTicks;
  const surveyResultByHexCell = useMemo(() => {
    if (!userId) return {};
    // Access the survey results directly from the private context
    return gameState.private.surveyResultByHexCell || {};
  }, [gameState.private]);

  // Create a set of surveyed hex cells
  const surveyedHexCells = useMemo(() => {
    const surveyed = new Set<string>();
    Object.entries(surveyResultByHexCell).forEach(([coordString, survey]) => {
      if (survey?.isComplete) {
        surveyed.add(coordString);
      }
    });
    return surveyed;
  }, [surveyResultByHexCell]);

  const buildMode = useSelector(
    clientStore,
    (state) => state.context.buildMode
  );
  const hoverLocation = useSelector(
    clientStore,
    (state) => state.context.hoverLocation
  );
  const hoveringHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.hoveringHexCoordinates
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

  const ghostBuildable = useMemo(() => {
    if (!hoverLocation || !buildMode || !player) return null;

    const point = new THREE.Vector3(
      hoverLocation.worldPoint[0],
      hoverLocation.worldPoint[1],
      hoverLocation.worldPoint[2]
    );

    if (buildMode.type === "power_pole") {
      const nearestCorner = getNearestCornerInChunk(point, validCoordinates);
      if (nearestCorner) {
        const ghostPoleData = {
          id: "ghost",
          type: "power_pole" as const,
          cornerCoordinates: nearestCorner,
        };

        const validation = validateBuildableLocation({
          buildable: ghostPoleData,
          grid,
          allBuildables: gameState.public.buildables,
          playerId: userId!,
          playerBlueprints: player.blueprintsById,
          surveyedHexCells,
        });

        if (!validation.valid) {
          return null;
        }

        const otherPoles = buildables.filter(
          (b): b is PowerPole => b.type === "power_pole"
        );

        const ghostPole = createPowerPole({
          id: "ghost",
          cornerCoordinates: nearestCorner,
          playerId: userId!,
          connectedToIds: findPossibleConnectionsForCoordinates(
            nearestCorner,
            otherPoles
          ),
          isGhost: true,
        });
        return ghostPole;
      }
    }

    if (buildMode && isPowerPlantBuildMode(buildMode)) {
      const coords = fromWorldPoint([point.x, point.y, point.z]);
      const isValidCoord = validCoordinates.some((c) => equals(c, coords));
      const blueprint = player.blueprintsById[buildMode.blueprintId];

      if (isValidCoord && blueprint) {
        const ghostBuildableData = {
          id: buildMode.blueprintId,
          type: "coal_plant" as const,
          coordinates: coords,
        };

        const validation = validateBuildableLocation({
          buildable: ghostBuildableData,
          grid,
          allBuildables: gameState.public.buildables,
          playerId: userId!,
          playerBlueprints: player.blueprintsById,
          surveyedHexCells,
        });

        if (!validation.valid) {
          return null;
        }

        return {
          id: "ghost",
          type: "coal_plant" as const,
          coordinates: coords,
          playerId: userId!,
          isGhost: true,
          name: blueprint.name,
          powerGenerationKW: blueprint.powerGenerationKW,
          pricePerKwh: 0.1,
          startingPrice: blueprint.startingPrice,
          requiredState: blueprint.requiredState,
        };
      }
    }

    return null;
  }, [
    buildMode,
    validCoordinates,
    buildables,
    hoverLocation,
    player,
    userId,
    grid,
    gameState,
    surveyedHexCells,
  ]);

  const handleHover = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const point = event.point;
      const coords = fromWorldPoint([point.x, point.y, point.z]);
      const isValidCoord = validCoordinates.some((c) => equals(c, coords));

      clientStore.send({
        type: "setHoverLocation",
        worldPoint: [point.x, point.y, point.z],
      });

      if (isValidCoord) {
        clientStore.send({
          type: "setHoveringHex",
          coordinates: coords,
        });
      }
    },
    [validCoordinates]
  );

  const handlePointerLeave = useCallback(() => {
    clientStore.send({
      type: "setHoveringHex",
      coordinates: null,
    });
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

  const { updateHexPopulation, updateHexTerrain } = useMapEditor();

  const handleCellUpdate = useCallback(
    (coordinates: HexCoordinates, updates: Partial<HexCell>) => {
      if (updates.terrainType !== undefined) {
        updateHexTerrain(coordinates, updates.terrainType);
      }
      if (updates.population !== undefined) {
        updateHexPopulation(coordinates, updates.population);
      }
    },
    []
  );

  const cells = useMemo(() => {
    return validCoordinates
      .map((coordinates: HexCoordinates) => getCell(grid, coordinates))
      .filter((cell): cell is HexCell => cell !== null);
  }, [grid, validCoordinates]);

  // Get cells to highlight based on hovering state
  const highlightedCells = useMemo(() => {
    if (!hoveringHexCoordinates) return [];

    const hoveringCell = getCell(grid, hoveringHexCoordinates);
    if (!hoveringCell?.regionName) return [];

    return cells.filter((cell) => cell.regionName === hoveringCell.regionName);
  }, [cells, grid, hoveringHexCoordinates]);

  // Get cells to highlight based on required state for power plant build mode
  const requiredStateHighlightedCells = useMemo(() => {
    if (!buildMode || !isPowerPlantBuildMode(buildMode) || !player) return [];

    const blueprint = player.blueprintsById[buildMode.blueprintId];
    if (!blueprint || !blueprint.requiredState) return [];

    return cells.filter((cell) => cell.regionName === blueprint.requiredState);
  }, [cells, buildMode, player]);

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
        onPointerLeave={handlePointerLeave}
        debug={debug}
      />
      <HexGridWater cells={cells} grid={grid} />
      {highlightedCells.length > 0 && (
        <HighlightedHexCells
          cells={highlightedCells}
          color={[1, 1, 1]}
          opacity={0.02}
          height={0.05}
        />
      )}
      {requiredStateHighlightedCells.length > 0 && (
        <HighlightedHexCells
          cells={requiredStateHighlightedCells}
          color={[0.2, 0.8, 0.2]}
          opacity={0.05}
          height={0.1}
        />
      )}
      <PowerLines chunkCells={cells.map((cell: HexCell) => cell.coordinates)} />
      {chunkBuildables.map((buildable) => (
        <Buildable key={buildable.id} buildable={buildable} />
      ))}
      {ghostBuildable && <Buildable buildable={ghostBuildable} />}
      <SurveyProgressIndicator
        cells={cells}
        surveyResultByHexCell={surveyResultByHexCell}
        currentTick={currentTick}
      />
    </group>
  );
});
