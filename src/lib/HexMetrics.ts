export class HexMetrics {
  static readonly outerRadius = 1;
  static readonly innerRadius = HexMetrics.outerRadius * 0.866025404; // sqrt(3)/2
  static readonly solidFactor = 0.8;
  static readonly waterFactor = 0.6;
  static readonly elevationStep = 5;
  static readonly waterElevationOffset = -0.5;

  // Corners for pointy-top hexagon
  static readonly corners = [
    [0, 0, HexMetrics.outerRadius],
    [HexMetrics.innerRadius, 0, 0.5 * HexMetrics.outerRadius],
    [HexMetrics.innerRadius, 0, -0.5 * HexMetrics.outerRadius],
    [0, 0, -HexMetrics.outerRadius],
    [-HexMetrics.innerRadius, 0, -0.5 * HexMetrics.outerRadius],
    [-HexMetrics.innerRadius, 0, 0.5 * HexMetrics.outerRadius],
    [0, 0, HexMetrics.outerRadius], // Repeated first point for convenience
  ] as const;

  static getFirstCorner(direction: number): readonly [number, number, number] {
    return this.corners[direction];
  }

  static getSecondCorner(direction: number): readonly [number, number, number] {
    return this.corners[direction + 1];
  }
}
