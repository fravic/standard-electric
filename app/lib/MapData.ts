import * as d3 from "d3-geo";
import { Feature, MultiPolygon, Polygon } from "geojson";
import type { Topology, Objects, ArcIndexes } from "topojson-specification";

export interface StateProperties {
  name: string;
}

export interface StateGeometryMultiPolygon extends MultiPolygon {
  type: "MultiPolygon";
  id: string;
  properties: StateProperties;
  arcs: ArcIndexes[][];
}

export interface StateGeometryPolygon extends Polygon {
  type: "Polygon";
  id: string;
  properties: StateProperties;
  arcs: ArcIndexes[];
}

export interface StateObjects extends Objects<StateProperties> {
  states: {
    type: "GeometryCollection";
    geometries: (StateGeometryMultiPolygon | StateGeometryPolygon)[];
  };
}

export interface StateTopology extends Topology {
  objects: StateObjects;
}

export interface MapData {
  polygon: Feature<MultiPolygon>[];
  projection: d3.GeoProjection;
  states: { [key: string]: StateGeometryMultiPolygon | StateGeometryPolygon };
}

const PROJECTION_SCALE = [1, 0.7];

export function getStateNameAtCoordinates(
  mapData: MapData,

  // These coordinates should be percentages of the map between 0 and 100
  x: number,
  y: number
): string | null {
  if (!mapData.projection || !mapData.polygon) return null;

  try {
    const projectedPoint = mapData.projection.invert?.([
      x * PROJECTION_SCALE[0],
      y * PROJECTION_SCALE[1],
    ]);
    if (!projectedPoint) return null;
    const [lon, lat] = projectedPoint;

    // Find which state contains this point
    for (const state of mapData.polygon) {
      if (!state.geometry?.coordinates) continue;

      // Handle both Polygon and MultiPolygon geometries
      const polygons =
        state.geometry.type === "MultiPolygon"
          ? state.geometry.coordinates
          : [state.geometry.coordinates];

      // Check each polygon in the state
      for (const polygon of polygons) {
        const coordinates = polygon[0] as [number, number][]; // Get the outer ring of the polygon
        let inside = false;

        for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
          const [xi, yi] = coordinates[i];
          const [xj, yj] = coordinates[j];

          const intersect =
            yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

          if (intersect) inside = !inside;
        }

        if (inside && state.id && mapData.states && state.id in mapData.states) {
          return mapData.states[state.id].properties.name;
        }
      }
    }
    return null;
  } catch (error) {
    console.warn("Error finding state:", error);
    return null;
  }
}
