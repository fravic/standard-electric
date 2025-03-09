import { World } from "miniplex";
import { equals, HexCoordinates } from "@/lib/coordinates/HexCoordinates";
import { Entity } from "./entity";

export function entityAtHexCoordinate(world: World<Entity>, hexCoordinates: HexCoordinates) {
  return world.with("hexPosition").where((entity) => equals(entity.hexPosition.coordinates, hexCoordinates)).first;
}