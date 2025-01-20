import { getNeighbor, toWorldPoint } from "./HexCoordinates";
import { HexDirection, HexMetrics } from "../HexMetrics";
import { HexCoordinates, CornerCoordinates, CornerPosition } from "./types";

export type { CornerCoordinates };

export function createCornerCoordinates(
  hex: HexCoordinates,
  position: CornerPosition
): CornerCoordinates {
  return { hex, position };
}

/**
 * Creates corner coordinates from a hex cell and direction. The corner
 * referred to is the clockwise corner of the edge in the specified direction.
 * https://www.redblobgames.com/grids/parts/#hexagons
 */
export function fromHexAndDirection(
  hex: HexCoordinates,
  direction: HexDirection
): CornerCoordinates {
  switch (direction) {
    case HexDirection.SE:
      return createCornerCoordinates(hex, CornerPosition.South);
    case HexDirection.E:
      return createCornerCoordinates(
        getNeighbor(hex, HexDirection.SE),
        CornerPosition.North
      );
    case HexDirection.NE:
      return createCornerCoordinates(
        getNeighbor(hex, HexDirection.NE),
        CornerPosition.South
      );
    case HexDirection.NW:
      return createCornerCoordinates(hex, CornerPosition.North);
    case HexDirection.W:
      return createCornerCoordinates(
        getNeighbor(hex, HexDirection.NW),
        CornerPosition.South
      );
    case HexDirection.SW:
      return createCornerCoordinates(
        getNeighbor(hex, HexDirection.SW),
        CornerPosition.North
      );
  }
}

/**
 * Returns the hex cell coordinates and direction that this corner belongs to.
 */
export function toHexAndDirection(corner: CornerCoordinates): {
  hex: HexCoordinates;
  direction: HexDirection;
} {
  // Convert back to a hex direction that points to this corner
  const direction =
    corner.position === CornerPosition.North
      ? HexDirection.NE
      : HexDirection.SE;
  return { hex: corner.hex, direction };
}

export function getCornerWorldPoint(
  corner: CornerCoordinates
): [number, number, number] {
  const worldPoint = toWorldPoint(corner.hex);
  return [
    worldPoint[0],
    worldPoint[1],
    worldPoint[2] +
      (corner.position === CornerPosition.North ? -1 : 1) *
        HexMetrics.outerRadius,
  ];
}

export function cornerToString(corner: CornerCoordinates): string {
  return `${corner.hex.x},${corner.hex.z}-${CornerPosition[corner.position]}`;
}

export function cornersEqual(
  a: CornerCoordinates,
  b: CornerCoordinates
): boolean {
  return (
    a.hex.x === b.hex.x && a.hex.z === b.hex.z && a.position === b.position
  );
}

/**
 * Returns true if the two corners are adjacent, false otherwise.
 */
export function cornersAdjacent(
  a: CornerCoordinates,
  b: CornerCoordinates
): boolean {
  if (a.position === CornerPosition.North) {
    const adjacentCorners = [
      // Towards SW
      createCornerCoordinates(
        getNeighbor(a.hex, HexDirection.NW),
        CornerPosition.South
      ),
      // Towards SE
      createCornerCoordinates(
        getNeighbor(a.hex, HexDirection.NE),
        CornerPosition.South
      ),
      // Towards N
      createCornerCoordinates(
        getNeighbor(getNeighbor(a.hex, HexDirection.NE), HexDirection.NW),
        CornerPosition.South
      ),
    ];
    return adjacentCorners.some((corner) => cornersEqual(corner, b));
  } else {
    const adjacentCorners = [
      // Towards NW
      createCornerCoordinates(
        getNeighbor(a.hex, HexDirection.SW),
        CornerPosition.North
      ),
      // Towards NE
      createCornerCoordinates(
        getNeighbor(a.hex, HexDirection.SE),
        CornerPosition.North
      ),
      // Towards S
      createCornerCoordinates(
        getNeighbor(getNeighbor(a.hex, HexDirection.SW), HexDirection.SE),
        CornerPosition.North
      ),
    ];
    return adjacentCorners.some((corner) => cornersEqual(corner, b));
  }
}

/**
 * Returns all hex coordinates that share this corner.
 * For any corner, there are always three hexes that share it.
 */
export function getAdjacentHexes(corner: CornerCoordinates): HexCoordinates[] {
  if (corner.position === CornerPosition.North) {
    return [
      corner.hex,
      getNeighbor(corner.hex, HexDirection.NW),
      getNeighbor(corner.hex, HexDirection.NE),
    ];
  } else {
    return [
      corner.hex,
      getNeighbor(corner.hex, HexDirection.SW),
      getNeighbor(corner.hex, HexDirection.SE),
    ];
  }
}
