import { useGameStore } from "../../store/gameStore";
import { PowerPole as PowerPoleModel } from "../../lib/PowerSystem";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { PowerPole } from "./PowerPole";

interface PowerLinesProps {
  chunkCells: HexCoordinates[];
}

export function PowerLines({ chunkCells }: PowerLinesProps) {
  const powerPoles = useGameStore((state) => state.powerPoles);

  // Filter power poles that belong to this chunk
  const chunkPowerPoles = powerPoles.filter((pole) =>
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
