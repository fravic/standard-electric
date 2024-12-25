import React from "react";
import { useGameStore } from "../../store/gameStore";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { HexGridChunk } from "./HexGridChunk";

interface HexGridProps {}

export function HexGrid({}: HexGridProps) {
  const hexGrid = useGameStore((state) => state.hexGrid);
  const isDebug = useGameStore((state) => state.isDebug);
  const selectHex = useGameStore((state) => state.selectHex);

  const handleCellClick = (coordinates: HexCoordinates) => {
    selectHex(coordinates);
  };

  return (
    <>
      {hexGrid.chunks.map((chunk, index) => {
        const chunkZ = Math.floor(index / hexGrid.chunkCountX);
        const chunkX = index % hexGrid.chunkCountX;
        return (
          <HexGridChunk
            key={`chunk-${chunkX}-${chunkZ}`}
            chunk={chunk}
            grid={hexGrid}
            onCellClick={handleCellClick}
            debug={isDebug}
          />
        );
      })}
    </>
  );
}
