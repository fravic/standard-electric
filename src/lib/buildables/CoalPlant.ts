import { HexCoordinates } from "../coordinates/HexCoordinates";
import { z } from "zod";
import { CoalPlantSchema } from "./schemas";

export type CoalPlant = z.infer<typeof CoalPlantSchema>;

export function createCoalPlant({
  id,
  coordinates,
  playerId,
  isGhost,
}: {
  id: string;
  coordinates: HexCoordinates;
  playerId: string;
  isGhost?: boolean;
}): CoalPlant {
  return {
    id,
    type: "coal_plant",
    playerId,
    isGhost,
    coordinates,
    powerGenerationKW: 100,
  };
}
