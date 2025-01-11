import { useGameStore } from "../../store/gameStore";
import { PowerPole as PowerPoleModel } from "../../lib/PowerSystem";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { PowerPole } from "./PowerPole";

interface PowerLinesProps {
  chunkCells: HexCoordinates[];
}

export function PowerLines({ chunkCells }: PowerLinesProps) {
  const buildables = useGameStore((state) => state.buildables);

  // Filter power poles that belong to this chunk
  const chunkPowerPoles = buildables
    .filter((b) => b.type === "power_pole" && !b.isGhost && b.cornerCoordinates)
    .map((b) => new PowerPoleModel(b.id, b.cornerCoordinates!, false))
    .filter((pole) =>
      chunkCells.some(
        (cell) => cell.toString() === pole.cornerCoordinates.hex.toString()
      )
    );

  return (
    <group>
      {chunkPowerPoles.map((pole) => (
        <PowerPole
          key={`pole-${pole.cornerCoordinates.toString()}`}
          pole={pole}
        />
      ))}
    </group>
  );
}
