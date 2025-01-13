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
    type: z.literal("SELECT_HEX"),
    coordinates: HexCoordinatesSchema,
  }),
  z.object({
    type: z.literal("ADD_BUILDABLE"),
    buildable: BuildableSchema.pick({
      type: true,
      coordinates: true,
      cornerCoordinates: true,
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
    type: z.literal("SET_BUILD_MODE"),
    buildMode: BuildableSchema.pick({
      type: true,
    }).nullable(),
  }),
  z.object({
    type: z.literal("SET_PAINTBRUSH_MODE"),
    paintbrushMode: z
      .object({
        terrainType: z.nativeEnum(TerrainType).nullable(),
        population: z.nativeEnum(Population).nullable(),
      })
      .nullable(),
  }),

  // TODO
  z.object({
    type: z.literal("JOIN_GAME"),
  }),
  z.object({
    type: z.literal("LEAVE_GAME"),
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
