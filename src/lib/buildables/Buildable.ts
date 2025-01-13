import { toWorldPoint } from "../coordinates/HexCoordinates";
import { getCornerWorldPoint } from "../coordinates/CornerCoordinates";
import { z } from "zod";
import {
  HexCoordinatesSchema,
  CornerCoordinatesSchema,
} from "../coordinates/types";

export type BuildableType = "power_pole" | "coal_plant";

export const BuildableSchema = z.object({
  id: z.string(),
  type: z.enum(["power_pole", "coal_plant"]),
  isGhost: z.boolean().optional(),
  playerId: z.string(),
  coordinates: HexCoordinatesSchema.optional(),
  cornerCoordinates: CornerCoordinatesSchema.optional(),
});

export type Buildable = z.infer<typeof BuildableSchema>;

export function createBuildable(
  id: string,
  type: BuildableType,
  playerId: string,
  isGhost?: boolean
): Buildable {
  return {
    id,
    type,
    playerId,
    isGhost,
  };
}

export function getBuildableWorldPoint(
  buildable: Buildable
): [number, number, number] {
  if (buildable.type === "power_pole" && buildable.cornerCoordinates) {
    const point = getCornerWorldPoint(buildable.cornerCoordinates);
    return [point[0], 0, point[2]];
  } else if (buildable.type === "coal_plant" && buildable.coordinates) {
    const point = toWorldPoint(buildable.coordinates);
    return [point[0], 0.5, point[2]];
  }
  throw new Error(
    `Invalid buildable type or missing coordinates: ${buildable.type}`
  );
}
