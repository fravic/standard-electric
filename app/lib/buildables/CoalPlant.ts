import { HexCoordinates } from "../coordinates/HexCoordinates";
import { z } from "zod";
import { Buildable, CoalPlantSchema } from "./schemas";

export type CoalPlant = z.infer<typeof CoalPlantSchema>;

export function isCoalPlant(buildable: Buildable): buildable is CoalPlant {
  return buildable.type === "coal_plant";
}

export function createCoalPlant({
  id,
  coordinates,
  playerId,
  isGhost,
  powerGenerationKW = 100,
  pricePerKwh = 0.1,
}: {
  id: string;
  coordinates: HexCoordinates;
  playerId: string;
  isGhost?: boolean;
  powerGenerationKW?: number;
  pricePerKwh?: number;
}): CoalPlant {
  return {
    id,
    type: "coal_plant",
    playerId,
    isGhost,
    coordinates,
    powerGenerationKW,
    pricePerKwh,
  };
}
