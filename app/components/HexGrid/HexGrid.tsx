import React from "react";
import { useSelector } from "@xstate/store/react";
import { HexCoordinates } from "@/lib/coordinates/HexCoordinates";
import { HexGridChunk } from "./HexGridChunk";
import { GameContext } from "@/actor/game.context";
import { HexMetrics } from "@/lib/HexMetrics";
import { CornerCoordinates } from "@/lib/coordinates/CornerCoordinates";
import { clientStore } from "@/lib/clientState";
import { nanoid } from "nanoid";
import { isPowerPlantType } from "@/lib/buildables/PowerPlant";
interface HexGridProps {}

export function HexGrid({}: HexGridProps) {
  const hexGrid = GameContext.useSelector((state) => state.public.hexGrid);
  const isDebug = useSelector(clientStore, (state) => state.context.isDebug);
  const buildMode = useSelector(
    clientStore,
    (state) => state.context.buildMode
  );
  const sendGameEvent = GameContext.useSend();

  const chunkCountX = Math.ceil(hexGrid.width / HexMetrics.chunkSizeX);
  const chunkCountZ = Math.ceil(hexGrid.height / HexMetrics.chunkSizeZ);

  const handleCellClick = (
    coordinates: HexCoordinates,
    nearestCorner: CornerCoordinates | null
  ) => {
    if (buildMode && buildMode.type === "power_pole") {
      if (nearestCorner) {
        sendGameEvent({
          type: "ADD_BUILDABLE",
          buildable: {
            id: nanoid(),
            type: "power_pole",
            cornerCoordinates: nearestCorner,
          },
        });
      }
    } else if (buildMode && isPowerPlantType(buildMode.type)) {
      sendGameEvent({
        type: "ADD_BUILDABLE",
        buildable: {
          id: buildMode.blueprintId,
          type: buildMode.type,
          coordinates,
        },
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
