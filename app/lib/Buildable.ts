import { HexCoordinates } from "./HexCoordinates";
import { CornerCoordinates } from "./CornerCoordinates";
import { immerable } from "immer";

export type BuildableType = "power_pole" | "coal_plant";

export abstract class Buildable {
  [immerable] = true;

  id: string;
  type: BuildableType;
  isGhost?: boolean;
  playerId: string;

  // Either coordinates or cornerCoordinates will be set, depending on type
  coordinates?: HexCoordinates;
  cornerCoordinates?: CornerCoordinates;

  constructor(
    id: string,
    type: BuildableType,
    playerId: string,
    isGhost?: boolean
  ) {
    this.id = id;
    this.type = type;
    this.playerId = playerId;
    this.isGhost = isGhost;
  }

  abstract getWorldPoint(): [number, number, number];
}
