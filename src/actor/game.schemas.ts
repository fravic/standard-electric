import { z } from "zod";
import { BuildableSchema } from "@/lib/buildables/Buildable";
import { TerrainType, Population } from "@/lib/HexCell";
import { HexCoordinatesSchema } from "@/lib/coordinates/types";
import { HexGridSchema } from "@/lib/HexGrid";

export const GameClientEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SET_DEBUG"),
    value: z.boolean(),
  }),
  z.object({
    type: z.literal("JOIN_GAME"),
  }),
  z.object({
    type: z.literal("LEAVE_GAME"),
  }),
  z.object({
    type: z.literal("ADD_BUILDABLE"),
    buildable: BuildableSchema,
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
    type: z.literal("SET_HOVER_LOCATION"),
    playerId: z.string(),
    worldPoint: z.tuple([z.number(), z.number(), z.number()]).nullable(),
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
