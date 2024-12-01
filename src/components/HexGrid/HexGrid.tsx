import React from "react";
import { useGameStore } from "../../store/gameStore";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { HexGridChunk } from "./HexGridChunk";

interface HexGridProps {}

export function HexGrid({}: HexGridProps) {
  const hexGrid = useGameStore((state) => state.hexGrid);

  const handleCellClick = (coordinates: HexCoordinates) => {
    const cell = hexGrid.cellsByHexCoordinates[coordinates.toString()];
    console.log(
      "Clicked cell at coordinates",
      coordinates.X,
      coordinates.Y,
      coordinates.Z,
      "for state",
      cell?.stateInfo?.name
    );
  };

  return (
    <>
      {hexGrid.chunks.map((chunk, index) => {
        const chunkZ = Math.floor(index / hexGrid.chunkCountX);
        const chunkX = index % hexGrid.chunkCountX;
        return (
          <HexGridChunk
            key={`chunk-${chunkX}-${chunkZ}`}
            chunk={chunk.cells}
            chunkX={chunkX}
            chunkZ={chunkZ}
            onCellClick={handleCellClick}
          />
        );
      })}
    </>
  );
}
