import { Vertex } from "./HexCoordinates";

export class HexMetrics {
  static readonly outerRadius = 1;
  static readonly innerRadius = HexMetrics.outerRadius * 0.866025404; // sqrt(3)/2
  static readonly solidFactor = 0.8;
  static readonly waterFactor = 0.6;
  static chunkSizeX: number = 5;
  static chunkSizeZ: number = 5;

  // Corners for pointy-top hexagon. Note these are in counter-clockwise order
  // for Three.JS rendering.
  static readonly corners = [
    [0, 0, HexMetrics.outerRadius],
    [HexMetrics.innerRadius, 0, 0.5 * HexMetrics.outerRadius],
    [HexMetrics.innerRadius, 0, -0.5 * HexMetrics.outerRadius],
    [0, 0, -HexMetrics.outerRadius],
    [-HexMetrics.innerRadius, 0, -0.5 * HexMetrics.outerRadius],
    [-HexMetrics.innerRadius, 0, 0.5 * HexMetrics.outerRadius],
    [0, 0, HexMetrics.outerRadius], // Repeated first point for convenience
  ] as const;

  static getFirstCorner(center: Vertex, direction: number): Vertex {
    return [
      center[0] + this.corners[direction % 6][0],
      center[1] + this.corners[direction % 6][1],
      center[2] + this.corners[direction % 6][2],
    ];
  }

  static getSecondCorner(center: Vertex, direction: number): Vertex {
    return [
      center[0] + this.corners[(direction + 1) % 6][0],
      center[1] + this.corners[(direction + 1) % 6][1],
      center[2] + this.corners[(direction + 1) % 6][2],
    ];
  }
}

// These match the indices of HexMetrics.corners
export enum HexDirection {
  SE = 0,
  E = 1,
  NE = 2,
  NW = 3,
  W = 4,
  SW = 5,
}
