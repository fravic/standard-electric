import { z } from "zod";
import { BuildableSchema } from "@/lib/buildables/Buildable";
import { TerrainType, Population } from "@/lib/HexCell";
import { HexCoordinatesSchema } from "@/lib/coordinates/types";

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
    buildable: BuildableSchema.pick({
      type: true,
      coordinates: true,
      cornerCoordinates: true,
      id: true,
    }),
  }),
  z.object({
    type: z.literal("UPDATE_HEX_TERRAIN"),
    coordinates: HexCoordinatesSchema,
    terrainType: z.nativeEnum(TerrainType),
  }),
  z.object({
    type: z.literal("UPDATE_HEX_POPULATION"),
    coordinates: HexCoordinatesSchema,
    population: z.nativeEnum(Population),
  }),
  z.object({
    type: z.literal("UPDATE_HEX_CITY"),
    coordinates: HexCoordinatesSchema,
    cityName: z.string().nullable(),
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
]);

export const GameServiceEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SYNC"),
  }),
]);

export const GameInputSchema = z.object({
  id: z.string(),
});
