import { HexDirection, HexMetrics } from "../HexMetrics";
import * as THREE from "three";
import {
  HexCoordinates,
  HexCoordinatesSchema,
  CornerCoordinates,
} from "./types";
import * as CornerCoordinatesService from "./CornerCoordinates";

export { HexCoordinatesSchema };
export type { HexCoordinates };

export function createHexCoordinates(x: number, z: number): HexCoordinates {
  return { x, z };
}

export function getQ(coordinates: HexCoordinates): number {
  return coordinates.x - (coordinates.z - (coordinates.z & 1)) / 2;
}

export function getR(coordinates: HexCoordinates): number {
  return coordinates.z;
}

export function getS(coordinates: HexCoordinates): number {
  // Q + R + S = 0, so we can just infer S
  return -getQ(coordinates) - getR(coordinates);
}

export function fromCubeCoordinates(
  q: number,
  r: number,
  s: number
): HexCoordinates {
  const x = q + (r - (r & 1)) / 2;
  const z = r;
  return createHexCoordinates(x, z);
}

export function fromWorldPoint(
  position: [number, number, number]
): HexCoordinates {
  // Convert from world point (ignoring y elevation) to hex cube coordinates
  let q = position[0] / (HexMetrics.innerRadius * 2);
  let r = position[2] / (HexMetrics.outerRadius * 1.5);

  // Account for the odd-r offset
  const offset = position[2] / (HexMetrics.outerRadius * 3);
  q -= offset;

  let iQ = Math.round(q);
  let iR = Math.round(r);
  let iS = Math.round(-q - r);

  if (iQ + iR + iS !== 0) {
    // Fix rounding errors
    let dQ = Math.abs(q - iQ);
    let dR = Math.abs(r - iR);
    let dS = Math.abs(-q - r - iS);

    if (dQ > dR && dQ > dS) {
      iQ = -iR - iS;
    } else if (dR > dS) {
      iR = -iQ - iS;
    }
  }

  return fromCubeCoordinates(iQ, iR, iS);
}

export function toWorldPoint(
  coordinates: HexCoordinates
): [number, number, number] {
  const q = getQ(coordinates);
  const r = getR(coordinates);
  const x = (q + r * 0.5) * (HexMetrics.innerRadius * 2);
  const z = r * (HexMetrics.outerRadius * 1.5);
  return [x, 0, z];
}

export function getNeighbor(
  coordinates: HexCoordinates,
  direction: HexDirection
): HexCoordinates {
  if (direction < 0) {
    direction = direction + 6;
  }
  direction = (direction % 6) as HexDirection;
  const q = getQ(coordinates);
  const r = getR(coordinates);
  const s = getS(coordinates);

  switch (direction) {
    case HexDirection.NE:
      return fromCubeCoordinates(q + 1, r - 1, s);
    case HexDirection.E:
      return fromCubeCoordinates(q + 1, r, s - 1);
    case HexDirection.SE:
      return fromCubeCoordinates(q, r + 1, s - 1);
    case HexDirection.SW:
      return fromCubeCoordinates(q - 1, r + 1, s);
    case HexDirection.W:
      return fromCubeCoordinates(q - 1, r, s + 1);
    case HexDirection.NW:
      return fromCubeCoordinates(q, r - 1, s + 1);
  }
}

export function coordinatesToString(coordinates: HexCoordinates): string {
  return `${coordinates.x},${coordinates.z}`;
}

export function coordinatesToStringCubic(coordinates: HexCoordinates): string {
  return `${getQ(coordinates)},${getR(coordinates)},${getS(coordinates)}`;
}

export function equals(a: HexCoordinates, b: HexCoordinates): boolean {
  return a.x === b.x && a.z === b.z;
}

export function getNearestCornerInChunk(
  point: THREE.Vector3,
  chunkCoordinates: HexCoordinates[]
): CornerCoordinates | null {
  const cell = fromWorldPoint([point.x, point.y, point.z]);
  const matchingCoordinates = chunkCoordinates.find(
    (c) => coordinatesToString(c) === coordinatesToString(cell)
  );

  if (matchingCoordinates) {
    let nearestDirection: HexDirection | null = null;
    let minDistance = Infinity;

    const cellCenter = toWorldPoint(matchingCoordinates);
    for (let d = 0; d < 6; d++) {
      const vertex = HexMetrics.getFirstCorner(cellCenter, d);
      const dx = vertex[0] - point.x;
      const dy = vertex[1] - point.y;
      const dz = vertex[2] - point.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < minDistance) {
        minDistance = distance;
        nearestDirection = d as HexDirection;
      }
    }

    if (nearestDirection !== null) {
      return CornerCoordinatesService.fromHexAndDirection(
        cell,
        nearestDirection
      );
    }
  }
  return null;
}
