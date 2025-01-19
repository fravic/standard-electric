import { z } from "zod";
import {
  HexCoordinatesSchema,
  CornerCoordinatesSchema,
} from "../coordinates/types";

export const BuildableSchema = z.object({
  id: z.string(),
  type: z.enum(["power_pole", "coal_plant"]),
  isGhost: z.boolean().optional(),
  playerId: z.string(),
  coordinates: HexCoordinatesSchema.optional(),
  cornerCoordinates: CornerCoordinatesSchema.optional(),
});

export const BuildableTypeEnum = z.enum(["power_pole", "coal_plant"]);
export type BuildableType = z.infer<typeof BuildableTypeEnum>;
export type Buildable = z.infer<typeof BuildableSchema>;

export const PowerPoleSchema = BuildableSchema.extend({
  type: z.literal("power_pole"),
  cornerCoordinates: CornerCoordinatesSchema,
  connectedToIds: z.array(z.string()),
});

export const CoalPlantSchema = BuildableSchema.extend({
  type: z.literal("coal_plant"),
  coordinates: HexCoordinatesSchema,
});
