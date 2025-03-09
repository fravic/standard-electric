import React from "react";

import { useSelector } from "@xstate/store/react";
import { HexCoordinates } from "@/lib/coordinates/HexCoordinates";
import { HexGridChunk } from "./HexGridChunk";
import { GameContext } from "@/actor/game.context";
import { HexMetrics } from "@/lib/HexMetrics";
import { CornerCoordinates } from "@/lib/coordinates/CornerCoordinates";
import { clientStore } from "@/lib/clientState";
import { AdditionalBlueprintOptions } from "@/ecs/factories";

interface HexGridProps {}

export function HexGrid({}: HexGridProps) {
  const hexGrid = GameContext.useSelector((state) => state.public.hexGrid);
  const isDebug = useSelector(clientStore, (state) => state.context.isDebug);
  const buildMode = useSelector(
    clientStore,
    (state) => state.context.buildMode
  );
  const entitiesById = GameContext.useSelector((state) => state.public.entitiesById);
  const sendGameEvent = GameContext.useSend();

  const chunkCountX = Math.ceil(hexGrid.width / HexMetrics.chunkSizeX);
  const chunkCountZ = Math.ceil(hexGrid.height / HexMetrics.chunkSizeZ);

  const handleCellClick = (
    coordinates: HexCoordinates,
    nearestCorner: CornerCoordinates | null
  ) => {
    if (buildMode) {
      const blueprintEntity = entitiesById[buildMode.blueprintId];
      if (!blueprintEntity) {
        throw new Error(`Blueprint ${buildMode.blueprintId} not found`);
      }
      const options: AdditionalBlueprintOptions = {
        cornerPosition: blueprintEntity.blueprint?.allowedPosition === "corner" && nearestCorner? {
          cornerCoordinates: nearestCorner
        } : undefined,
        hexPosition: blueprintEntity.blueprint?.allowedPosition === "hex" ? {
          coordinates,
        } : undefined,
      };
      sendGameEvent({
        type: "ADD_BUILDABLE",
        blueprintId: buildMode.blueprintId,
        options,
      });
    } else {
      clientStore.send({ type: "selectHex", coordinates });
    }
  };

  return (
    <>
      {Array.from({ length: chunkCountZ }, (_, z) =>
        Array.from({ length: chunkCountX }, (_, x) => (
          <HexGridChunk
            key={`chunk-${x}-${z}`}
            chunk={{
              xStart: x * HexMetrics.chunkSizeX,
              zStart: z * HexMetrics.chunkSizeZ,
            }}
            grid={hexGrid}
            onCellClick={handleCellClick}
            debug={isDebug}
          />
        ))
      )}
    </>
  );
}
