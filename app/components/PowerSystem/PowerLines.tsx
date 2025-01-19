import React from "react";
import { createPowerPole, isPowerPole } from "@/lib/buildables/PowerPole";
import { HexCoordinates } from "@/lib/coordinates/HexCoordinates";
import { PowerPole } from "./PowerPole";
import { GameContext } from "@/actor/game.context";
import * as HexCoordinatesLib from "@/lib/coordinates/HexCoordinates";
import * as CornerCoordinatesLib from "@/lib/coordinates/CornerCoordinates";
interface PowerLinesProps {
  chunkCells: HexCoordinates[];
}

export function PowerLines({ chunkCells }: PowerLinesProps) {
  const powerPoles = GameContext.useSelector((state) =>
    state.public.buildables.filter(isPowerPole)
  );

  // Filter power poles that belong to this chunk
  const chunkPowerPoles = powerPoles
    .filter((b) => !b.isGhost && b.cornerCoordinates && b.playerId)
    .filter((pole) =>
      chunkCells.some(
        (cell) =>
          HexCoordinatesLib.coordinatesToString(cell) ===
          HexCoordinatesLib.coordinatesToString(pole.cornerCoordinates.hex)
      )
    );

  return (
    <group>
      {chunkPowerPoles.map((pole) => (
        <PowerPole
          key={`pole-${CornerCoordinatesLib.cornerToString(
            pole.cornerCoordinates
          )}`}
          pole={pole}
        />
      ))}
    </group>
  );
}
