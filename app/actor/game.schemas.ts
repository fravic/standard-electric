import { z } from "zod";
import { BuildableSchema } from "@/lib/buildables/Buildable";

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
