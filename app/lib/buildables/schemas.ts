import { z } from "zod";
import {
  HexCoordinatesSchema,
  CornerCoordinatesSchema,
} from "../coordinates/types";

export const BuildableSchema = z.object({
  id: z.string(),
  type: z.union([z.literal("power_pole"), z.literal("coal_plant")]),
  isGhost: z.boolean().optional(),
  coordinates: HexCoordinatesSchema.optional(),
  cornerCoordinates: CornerCoordinatesSchema.optional(),
});

export const PowerPoleSchema = BuildableSchema.extend({
  type: z.literal("power_pole"),
  playerId: z.string(),
  cornerCoordinates: CornerCoordinatesSchema,
  connectedToIds: z.array(z.string()),
});

export const PowerPlantBlueprintSchema = BuildableSchema.extend({
  type: z.literal("coal_plant"),
  name: z.string(),
  powerGenerationKW: z.number(),
  startingPrice: z.number(),
  requiredState: z.string().optional(),
});

export const PowerPlantSchema = PowerPlantBlueprintSchema.extend({
  coordinates: HexCoordinatesSchema,
  playerId: z.string(),
  isGhost: z.boolean().optional(),
  pricePerKwh: z.number(),
});

export type PowerPole = z.infer<typeof PowerPoleSchema>;
export type PowerPlantBlueprint = z.infer<typeof PowerPlantBlueprintSchema>;
export type PowerPlant = z.infer<typeof PowerPlantSchema>;
export type Buildable = z.infer<typeof BuildableSchema>;
export type PowerPlantType = PowerPlant["type"];
export type BuiltBuildable = PowerPole | PowerPlant;
