import { BuildableSchema } from "./Buildable";
import {
  HexCoordinates,
  HexCoordinatesSchema,
} from "../coordinates/HexCoordinates";
import { z } from "zod";

export const CoalPlantSchema = BuildableSchema.extend({
  type: z.literal("coal_plant"),
  coordinates: HexCoordinatesSchema,
});

export type CoalPlant = z.infer<typeof CoalPlantSchema>;

export function createCoalPlant(
  id: string,
  coordinates: HexCoordinates,
  playerId: string,
  isGhost?: boolean
): CoalPlant {
  return {
    id,
    type: "coal_plant",
    playerId,
    isGhost,
    coordinates,
  };
}
