import { immerable } from "immer";
import { HexCoordinates, Vertex } from "./HexCoordinates";
import { HexDirection, HexMetrics } from "./HexMetrics";
import { z } from "zod";

export enum CornerPosition {
  North,
  South,
}

export const CornerCoordinatesSchema = z.object({
  hex: z.object({
    x: z.number(),
    z: z.number(),
  }),
  position: z.nativeEnum(CornerPosition),
});

export type CornerCoordinatesData = z.infer<typeof CornerCoordinatesSchema>;

/**
 * Represents coordinates for a hex corner (vertex) in the grid.
 * Each corner is identified by a hex cell and whether it's the north
 * or south corner of that hex.
 */
export class CornerCoordinates {
  [immerable] = true;

  hex: HexCoordinates;
  position: CornerPosition;

  constructor(hex: HexCoordinates, position: CornerPosition) {
    this.hex = hex;
    this.position = position;
  }

  /**
   * Creates corner coordinates from a hex cell and direction. The corner
   * referred to is the clockwise corner of the edge in the specified direction.
   * https://www.redblobgames.com/grids/parts/#hexagons
   */
  static fromHexAndDirection(
    hex: HexCoordinates,
    direction: HexDirection
  ): CornerCoordinates {
    switch (direction) {
      case HexDirection.SE:
        return new CornerCoordinates(hex, CornerPosition.South);
      case HexDirection.E:
        return new CornerCoordinates(
          hex.getNeighbor(HexDirection.SE),
          CornerPosition.North
        );
      case HexDirection.NE:
        return new CornerCoordinates(
          hex.getNeighbor(HexDirection.NE),
          CornerPosition.South
        );
      case HexDirection.NW:
        return new CornerCoordinates(hex, CornerPosition.North);
      case HexDirection.W:
        return new CornerCoordinates(
          hex.getNeighbor(HexDirection.NW),
          CornerPosition.South
        );
      case HexDirection.SW:
        return new CornerCoordinates(
          hex.getNeighbor(HexDirection.SW),
          CornerPosition.North
        );
    }
  }

  /**
   * Returns the hex cell coordinates and direction that this corner belongs to.
   */
  toHexAndDirection(): { hex: HexCoordinates; direction: HexDirection } {
    // Convert back to a hex direction that points to this corner
    const direction =
      this.position === CornerPosition.North
        ? HexDirection.NE
        : HexDirection.SE;
    return { hex: this.hex, direction };
  }

  toWorldPoint(): Vertex {
    const worldPoint = this.hex.toWorldPoint();
    return [
      worldPoint[0],
      worldPoint[1],
      worldPoint[2] +
        (this.position === CornerPosition.North ? -1 : 1) *
          HexMetrics.outerRadius,
    ];
  }

  toString(): string {
    return `${this.hex.toString()}-${CornerPosition[this.position]}`;
  }

  equals(other: CornerCoordinates): boolean {
    return this.hex.equals(other.hex) && this.position === other.position;
  }

  adjacentTo(other: CornerCoordinates): boolean {
    if (this.position === CornerPosition.North) {
      const adjacentCorners = [
        // Towards SW
        new CornerCoordinates(
          this.hex.getNeighbor(HexDirection.NW),
          CornerPosition.South
        ),
        // Towards SE
        new CornerCoordinates(
          this.hex.getNeighbor(HexDirection.NE),
          CornerPosition.South
        ),
        // Towards N
        new CornerCoordinates(
          this.hex.getNeighbor(HexDirection.NE).getNeighbor(HexDirection.NW),
          CornerPosition.South
        ),
      ];
      return adjacentCorners.some((corner) => corner.equals(other));
    } else {
      const adjacentCorners = [
        // Towards NW
        new CornerCoordinates(
          this.hex.getNeighbor(HexDirection.SW),
          CornerPosition.North
        ),
        // Towards NE
        new CornerCoordinates(
          this.hex.getNeighbor(HexDirection.SE),
          CornerPosition.North
        ),
        // Towards S
        new CornerCoordinates(
          this.hex.getNeighbor(HexDirection.SW).getNeighbor(HexDirection.SE),
          CornerPosition.North
        ),
      ];
      return adjacentCorners.some((corner) => corner.equals(other));
    }
  }
}
