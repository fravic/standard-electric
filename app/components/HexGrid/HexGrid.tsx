import React from "react";
import { HexCoordinates } from "@/lib/coordinates/HexCoordinates";
import { HexGridChunk } from "./HexGridChunk";
import { GameContext } from "@/actor/game.context";
import { HexMetrics } from "@/lib/HexMetrics";
import { CornerCoordinates } from "@/lib/coordinates/CornerCoordinates";
import { useClientStore } from "@/lib/clientState";

interface HexGridProps {}

export function HexGrid({}: HexGridProps) {
  const hexGrid = GameContext.useSelector((state) => state.public.hexGrid);
  const isDebug = useClientStore((state) => state.isDebug);
  const buildMode = useClientStore((state) => state.buildMode);
  const selectHex = useClientStore((state) => state.selectHex);
  const sendGameEvent = GameContext.useSend();

  const chunkCountX = Math.ceil(hexGrid.width / HexMetrics.chunkSizeX);
  const chunkCountZ = Math.ceil(hexGrid.height / HexMetrics.chunkSizeZ);

  const handleCellClick = (
    coordinates: HexCoordinates,
    nearestCorner: CornerCoordinates | null
  ) => {
    if (buildMode?.type === "power_pole") {
      if (nearestCorner) {
        sendGameEvent({
          type: "ADD_BUILDABLE",
          buildable: {
            type: "power_pole",
            cornerCoordinates: nearestCorner,
          },
        });
      }
    } else if (buildMode?.type === "coal_plant") {
      sendGameEvent({
        type: "ADD_BUILDABLE",
        buildable: {
          type: "coal_plant",
          coordinates,
        },
      });
    } else {
      selectHex(coordinates);
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
