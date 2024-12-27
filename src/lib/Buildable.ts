import { HexCoordinates } from "./HexCoordinates";
import { CornerCoordinates } from "./CornerCoordinates";

export type BuildableType = "power_pole" | "coal_plant";

export abstract class Buildable {
  id: string;
  type: BuildableType;
  isGhost?: boolean;

  // Either coordinates or cornerCoordinates will be set, depending on type
  coordinates?: HexCoordinates;
  cornerCoordinates?: CornerCoordinates;

  constructor(id: string, type: BuildableType, isGhost?: boolean) {
    this.id = id;
    this.type = type;
    this.isGhost = isGhost;
  }

  abstract getWorldPoint(): [number, number, number];
}
