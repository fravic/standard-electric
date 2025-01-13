import React from "react";
import { createPowerPole } from "@/lib/buildables/PowerPole";
import { HexCoordinates } from "@/lib/coordinates/HexCoordinates";
import { PowerPole } from "./PowerPole";
import { GameContext } from "@/actor/game.context";

interface PowerLinesProps {
  chunkCells: HexCoordinates[];
}

export function PowerLines({ chunkCells }: PowerLinesProps) {
  const buildables = GameContext.useSelector(
    (state) => state.public.buildables
  );

  // Filter power poles that belong to this chunk
  const chunkPowerPoles = buildables
    .filter((b) => b.type === "power_pole" && !b.isGhost && b.cornerCoordinates)
    .map((b) => createPowerPole(b.id, b.cornerCoordinates!, b.playerId!, false))
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
