import { z } from "zod";
import { CommodityType } from "../market/CommodityMarket";

export const PowerPlantBlueprintSchema = z.object({
  id: z.string(),
  type: z.literal("coal_plant"),
  name: z.string(),
  powerGenerationKW: z.number(),
  startingPrice: z.number(),
  requiredState: z.string().optional(),
  fuelType: z.nativeEnum(CommodityType).nullable().optional(),
  fuelConsumptionPerKWh: z.number().optional(),
  maxFuelStorage: z.number().optional(),
});

export const PowerPlantBlueprintsSchema = z.array(PowerPlantBlueprintSchema);
export type PowerPlantBlueprint = z.infer<typeof PowerPlantBlueprintSchema>;
