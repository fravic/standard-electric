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
  coordinatesToString,
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
import { SurveyProgressIndicator } from "./SurveyProgressIndicator";
import { SurveyedHexPrisms } from "./SurveyedHexPrisms";
import { With } from "miniplex";
import { Entity, SurveyResultComponent } from "@/ecs/entity";
import { useWorld } from "../WorldContext";
import { createEntityFromBlueprint } from "@/ecs/factories";
import { findPossibleConnectionsWithWorld } from "@/lib/buildables/findPossibleConnections";
import { BuildableSystem } from "@/ecs/systems/BuildableSystem";

interface HexGridChunkProps {
  chunk: {
    xStart: number;
    zStart: number;
  };
  grid: HexGrid;
  onCellClick: (coordinates: HexCoordinates, nearestCorner: CornerCoordinates | null) => void;
  debug?: boolean;
  selectedHexCell?: HexCoordinates | null;
}

export const HexGridChunk = React.memo(function HexGridChunk({
  chunk,
  grid,
  onCellClick,
  debug = false,
  selectedHexCell,
}: HexGridChunkProps) {
  const userId = AuthContext.useSelector((state) => state.userId);
  const player = GameContext.useSelector((state) => state.public.players[userId!]);
  const gameState = GameContext.useSelector((state) => state);
  const world = useWorld();

  // Get current player's survey data and game time
  const currentTick = gameState.public.time.totalTicks;
  const surveyResultByHexCell = useMemo(() => {
    if (!userId) return {};
    const surveyResults = world.with("surveyResult");
    let surveyResultsByHexCell: Record<string, SurveyResultComponent> = {};
    for (const survey of surveyResults) {
      const coordString = coordinatesToString(survey.hexPosition!.coordinates);
      surveyResultsByHexCell[coordString] = survey.surveyResult;
    }
    return surveyResultsByHexCell;
  }, [world]);

  // Create a set of surveyed hex cells
  const surveyedHexCoords = useMemo(() => {
    const surveyed = new Set<string>();
    Object.entries(surveyResultByHexCell).forEach(([coordString, survey]) => {
      if (survey?.isComplete) {
        surveyed.add(coordString);
      }
    });
    return surveyed;
  }, [surveyResultByHexCell]);

  const buildMode = useSelector(clientStore, (state) => state.context.buildMode);
  const hoverLocation = useSelector(clientStore, (state) => state.context.hoverLocation);
  const hoveringHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.hoveringHexCoordinates
  );
  const entitiesById = GameContext.useSelector((state) => state.public.entitiesById);

  const coordinatesInChunk = useMemo(() => {
    const coordinates: HexCoordinates[] = [];
    for (let z = chunk.zStart; z < chunk.zStart + HexMetrics.chunkSizeZ; z++) {
      for (let x = chunk.xStart; x < chunk.xStart + HexMetrics.chunkSizeX; x++) {
        coordinates.push(createHexCoordinates(x, z));
      }
    }
    return coordinates;
  }, [chunk]);

  const buildingBlueprint = useMemo(() => {
    if (!buildMode || !player) return null;
    return entitiesById[buildMode.blueprintId] as With<Entity, "blueprint">;
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
          connectedToIds: findPossibleConnectionsWithWorld(world, nearestCorner, userId!),
          energyDistributedLastTickKwh: 0,
        },
      });
    } else {
      const coords = fromWorldPoint([point.x, point.y, point.z]);
      if (!coordinatesInChunk.some((c) => equals(c, coords))) {
        return null;
      }
      ghostEntity = createEntityFromBlueprint(buildingBlueprint, {
        hexPosition: {
          coordinates: coords,
        },
      });
    }

    ghostEntity.isGhost = { isGhost: true };

    const validationResult = BuildableSystem.isValidBuildableLocation(
      world,
      {
        hexGrid: grid,
        playerMoney: player.money,
        playerId: userId!,
        surveyedHexCells: surveyedHexCoords,
      },
      buildingBlueprint.id,
      ghostEntity
    );

    if (!validationResult.valid) {
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
    surveyedHexCoords,
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

  const handleCellUpdate = useCallback((coordinates: HexCoordinates, updates: Partial<HexCell>) => {
    if (updates.terrainType !== undefined) {
      updateHexTerrain(coordinates, updates.terrainType);
    }
    if (updates.population !== undefined) {
      updateHexPopulation(coordinates, updates.population);
    }
  }, []);

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

  // Get selected cell for highlighting
  const selectedCell = useMemo(() => {
    if (!selectedHexCell) return null;

    // Check if the selected cell is in this chunk
    const isInChunk = coordinatesInChunk.some((coord) => equals(coord, selectedHexCell));
    if (!isInChunk) return null;

    const cell = getCell(grid, selectedHexCell);
    return cell;
  }, [selectedHexCell, coordinatesInChunk, grid]);

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
        surveyedHexCoords={surveyedHexCoords}
      />
      <HexGridWater cells={cells} grid={grid} />

      {/* Add 3D prisms for surveyed cells */}
      <SurveyedHexPrisms cells={cells} surveyedHexCoords={surveyedHexCoords} />

      {highlightedCells.length > 0 && (
        <HighlightedHexCells
          cells={highlightedCells}
          color={[1, 1, 1]}
          opacity={0.02}
          height={0.02}
        />
      )}
      {selectedCell && (
        <HighlightedHexCells
          cells={[selectedCell]}
          color={[1, 1, 0]} // Yellow color
          opacity={0.14}
          height={0.02}
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
