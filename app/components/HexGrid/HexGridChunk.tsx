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
import {
  createHexCoordinates,
  equals,
  fromWorldPoint,
  getNearestCornerInChunk,
} from "@/lib/coordinates/HexCoordinates";

import { EntityRenderable } from "../EntityRenderable";
import { HexMetrics } from "@/lib/HexMetrics";
import { clientStore } from "@/lib/clientState";
import { AuthContext } from "@/auth.context";
import { HighlightedHexCells } from "./HighlightedHexCells";
import { useMapEditor } from "@/routes/mapEditor";
import { validateBuildableLocation } from "@/lib/buildables/validateBuildableLocation";
import { SurveyProgressIndicator } from "./SurveyProgressIndicator";
import { With } from "miniplex";
import { Entity } from "@/ecs/entity";
import { useWorld } from "../WorldContext";
import { createEntityFromBlueprint } from "@/ecs/factories";
import { findPossibleConnectionsWithWorld } from "@/lib/buildables/findPossibleConnections";

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
  const entitiesById = GameContext.useSelector(
    (state) => state.public.entitiesById
  );
  const world = useWorld();

  const coordinatesInChunk = useMemo(() => {
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

  const buildingBlueprint = useMemo(() => {
    if (!buildMode || !player) return null;
    return entitiesById[buildMode.blueprintId] as With<Entity, 'blueprint'>;
  }, [buildMode, entitiesById, player]);

  const ghostBuildable = useMemo(() => {
    if (!hoverLocation) return null;

    const point = new THREE.Vector3(
      hoverLocation.worldPoint[0],
      hoverLocation.worldPoint[1],
      hoverLocation.worldPoint[2]
    );

    if (!buildingBlueprint) return null;

    let ghostEntity: Entity;
    if (buildingBlueprint.blueprint.allowedPosition === "corner") {
      const nearestCorner = getNearestCornerInChunk(point, coordinatesInChunk);
      if (!nearestCorner) {
        return null;
      }
      ghostEntity = createEntityFromBlueprint(buildingBlueprint, {
        cornerPosition: {
          cornerCoordinates: nearestCorner,
        },
        connections: {
          connectedToIds: findPossibleConnectionsWithWorld(
            world,
            nearestCorner,
            userId!
          ),
        },
      });
    } else {
      const coords = fromWorldPoint([point.x, point.y, point.z]);
      if (!coordinatesInChunk.some(c => equals(c, coords))) {
        return null;
      }
      ghostEntity = createEntityFromBlueprint(buildingBlueprint, {
        hexPosition: {
          coordinates: coords,
        },
      });
    }
  
    const validation = validateBuildableLocation({
      buildable: ghostEntity,
      grid,
      world,
      playerId: userId!,
      surveyedHexCells,
    });
    console.log(validation);
    if (!validation.valid) {
      return null;
    }

    return ghostEntity;
  }, [
    buildMode,
    coordinatesInChunk,
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
      const isValidCoord = coordinatesInChunk.some((c) => equals(c, coords));

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
    [coordinatesInChunk]
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
      const isValidCoord = coordinatesInChunk.some((c) => equals(c, coords));

      if (!isValidCoord) return;

      const nearestCorner = getNearestCornerInChunk(point, coordinatesInChunk);

      onCellClick(coords, nearestCorner);
    },
    [coordinatesInChunk, onCellClick]
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
    return coordinatesInChunk
      .map((coordinates: HexCoordinates) => getCell(grid, coordinates))
      .filter((cell): cell is HexCell => cell !== null);
  }, [grid, coordinatesInChunk]);

  // Get cells to highlight based on hovering state
  const highlightedCells = useMemo(() => {
    if (!hoveringHexCoordinates) return [];

    const hoveringCell = getCell(grid, hoveringHexCoordinates);
    if (!hoveringCell?.regionName) return [];

    return cells.filter((cell) => cell.regionName === hoveringCell.regionName);
  }, [cells, grid, hoveringHexCoordinates]);

  // Get cells to highlight based on required state for power plant build mode
  const requiredStateHighlightedCells = useMemo(() => {
    const requiredRegion = buildingBlueprint?.blueprint.components.requiredRegion;
    if (!requiredRegion) return [];

    return cells.filter((cell) => cell.regionName === requiredRegion.requiredRegionName);
  }, [cells, buildingBlueprint]);

  // Get renderable entities in this chunk
  const chunkEntities = useMemo(() => {
    const hexCoordEntities = world.with("hexPosition", "renderable").where((entity) => {
      return coordinatesInChunk.some((coord) => equals(coord, entity.hexPosition.coordinates));
    });
    const cornerCoordEntities = world.with("cornerPosition", "renderable").where((entity) => {
      return coordinatesInChunk.some((coord) =>
        equals(coord, entity.cornerPosition.cornerCoordinates!.hex as HexCoordinates)
      );
    });
    return [...hexCoordEntities, ...cornerCoordEntities];
  }, [coordinatesInChunk, world]);

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
      {chunkEntities.map((entity) => (
        <EntityRenderable key={entity.id} entity={entity} />
      ))}
      {ghostBuildable && <EntityRenderable entity={ghostBuildable} />}
      <SurveyProgressIndicator
        cells={cells}
        surveyResultByHexCell={surveyResultByHexCell}
        currentTick={currentTick}
      />
    </group>
  );
});
