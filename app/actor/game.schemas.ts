import { z } from "zod";
import { CommodityType } from "@/lib/market/CommodityMarket";
import { HexCoordinatesSchema } from "@/lib/coordinates/types";
import { AdditionalBlueprintOptionsSchema } from "@/ecs/factories";

export const GameClientEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("JOIN_GAME"),
    name: z.string(),
  }),
  z.object({
    type: z.literal("START_GAME"),
  }),
  z.object({
    type: z.literal("ADD_BUILDABLE"),
    blueprintId: z.string(),
    options: AdditionalBlueprintOptionsSchema,
  }),
  z.object({
    type: z.literal("TICK"),
  }),
  z.object({
    type: z.literal("PAUSE"),
  }),
  z.object({
    type: z.literal("UNPAUSE"),
  }),
  z.object({
    type: z.literal("INITIATE_BID"),
    blueprintId: z.string(),
  }),
  z.object({
    type: z.literal("PASS_AUCTION"),
  }),
  z.object({
    type: z.literal("AUCTION_PLACE_BID"),
    amount: z.number(),
  }),
  z.object({
    type: z.literal("AUCTION_PASS_BID"),
  }),
  z.object({
    type: z.literal("BUY_COMMODITY"),
    fuelType: z.nativeEnum(CommodityType),
    units: z.number().positive(),
    powerPlantId: z.string(),
  }),
  z.object({
    type: z.literal("SELL_COMMODITY"),
    powerPlantId: z.string(),
    fuelType: z.nativeEnum(CommodityType),
    units: z.number().positive(),
  }),
  z.object({
    type: z.literal("SURVEY_HEX_TILE"),
    coordinates: HexCoordinatesSchema,
  }),
]);

export const GameServiceEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SYNC"),
  }),
]);

export const GameInputSchema = z.object({
  id: z.string(),
  randomSeed: z.number(),
});
