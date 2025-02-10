import { z } from "zod";

export const HexCoordinatesSchema = z.object({
  x: z.number(),
  z: z.number(),
});

export type HexCoordinates = z.infer<typeof HexCoordinatesSchema>;

export enum CornerPosition {
  North,
  South,
}

export const CornerCoordinatesSchema = z.object({
  hex: HexCoordinatesSchema,
  position: z.nativeEnum(CornerPosition),
});

export type CornerCoordinates = {
  hex: HexCoordinates;
  position: CornerPosition;
};
