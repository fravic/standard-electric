import { z } from "zod";
import { immerable } from "immer";

import { HexCoordinates, Vertex } from "./HexCoordinates";
import { HexDirection } from "./HexMetrics";
import {
  CornerCoordinates,
  CornerCoordinatesSchema,
} from "./CornerCoordinates";

export const PowerPoleSchema = z.object({
  id: z.string(),
  cornerCoordinates: CornerCoordinatesSchema,
  connectedToIds: z.array(z.string()),
});

export type PowerPoleData = z.infer<typeof PowerPoleSchema>;

export class PowerPole {
  [immerable] = true;

  id: string;
  cornerCoordinates: CornerCoordinates;
  connectedToIds: string[] = [];

  constructor(id: string, cornerCoordinates: CornerCoordinates) {
    this.id = id;
    this.cornerCoordinates = cornerCoordinates;
  }

  static fromHexAndDirection(
    id: string,
    coordinates: HexCoordinates,
    direction: HexDirection
  ): PowerPole {
    return new PowerPole(
      id,
      CornerCoordinates.fromHexAndDirection(coordinates, direction)
    );
  }

  getWorldPoint(): Vertex {
    return this.cornerCoordinates.toWorldPoint();
  }

  public createConnections(existingPoles: PowerPole[]) {
    // For each existing pole, check if it's at an adjacent corner
    // TODO: Make this more efficient
    for (const otherPole of existingPoles) {
      if (otherPole.id === this.id) continue;

      if (this.cornerCoordinates.adjacentTo(otherPole.cornerCoordinates)) {
        this.connectedToIds.push(otherPole.id);
        otherPole.connectedToIds.push(this.id);
      }
    }
  }
}
