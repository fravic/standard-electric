import { z } from "zod";
import {
  HexCoordinatesSchema,
  CornerCoordinatesSchema,
} from "../coordinates/types";

export const BuildableSchema = z.object({
  id: z.string(),
  type: z.union([z.literal("power_pole"), z.literal("coal_plant")]),
  playerId: z.string(),
  isGhost: z.boolean().optional(),
  powerGenerationKW: z.number().optional(),
  coordinates: HexCoordinatesSchema.optional(),
  cornerCoordinates: CornerCoordinatesSchema.optional(),
});

export type BuildableType = "power_pole" | "coal_plant";
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
