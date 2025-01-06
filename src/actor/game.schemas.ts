import { z } from "zod";

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
]);

export const GameServiceEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SYNC"),
  }),
]);

export const GameInputSchema = z.object({
  id: z.string(),
});
