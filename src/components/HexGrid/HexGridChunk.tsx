import { HexCell } from "../../lib/HexCell";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { HexGridTerrain } from "./HexGridTerrain";
import { HexGridWater } from "./HexGridWater";
import { HexGrid } from "../../lib/HexGrid";

interface HexGridChunkProps {
  chunk: HexCell[];
  grid: HexGrid;
  onCellClick: (coordinates: HexCoordinates) => void;
  debug?: boolean;
}

export function HexGridChunk({
  chunk,
  grid,
  onCellClick,
  debug = false,
}: HexGridChunkProps) {
  return (
    <group>
      <HexGridTerrain chunk={chunk} onClick={onCellClick} debug={debug} />
      <HexGridWater chunk={chunk} grid={grid} />
    </group>
  );
}
