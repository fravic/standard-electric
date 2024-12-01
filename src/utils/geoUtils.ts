import * as d3 from "d3-geo";
import { Feature, MultiPolygon, Polygon } from "geojson";
import { feature } from "topojson-client";
import type { Topology, Objects, ArcIndexes } from "topojson-specification";

interface StateInfo {
  name: string;
  id: string;
  numericId: number;
}

interface StateProperties {
  name: string;
}

interface StateGeometryMultiPolygon extends MultiPolygon {
  type: "MultiPolygon";
  id: string;
  properties: StateProperties;
  arcs: ArcIndexes[][];
}

interface StateGeometryPolygon extends Polygon {
  type: "Polygon";
  id: string;
  properties: StateProperties;
  arcs: ArcIndexes[];
}

interface StateObjects extends Objects<StateProperties> {
  states: {
    type: "GeometryCollection";
    geometries: (StateGeometryMultiPolygon | StateGeometryPolygon)[];
  };
}

interface StateTopology extends Topology {
  objects: StateObjects;
}

let usShape: Feature<MultiPolygon>[] | null = null;
let projection: d3.GeoProjection | null = null;
let stateNames: { [key: string]: string } | null = null;
let stateIds: { [key: string]: number } | null = null;

const excludedStates = ["15", "02", "72"];

export async function initializeMapData(): Promise<
  Feature<MultiPolygon>[] | null
> {
  if (usShape) return usShape;

  try {
    const response = await fetch(
      "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
    );
    const topology = (await response.json()) as StateTopology;

    // Filter out excluded states before creating the feature
    topology.objects.states.geometries =
      topology.objects.states.geometries.filter(
        (state) => !excludedStates.includes(state.id)
      );

    const geojson = feature(topology, topology.objects.states);
    if (!Array.isArray(geojson.features)) {
      throw new Error("Invalid GeoJSON: features is not an array");
    }
    usShape = geojson.features as Feature<MultiPolygon>[];

    // Create state mappings
    stateNames = {};
    stateIds = {};
    let idCounter = 0;
    topology.objects.states.geometries.forEach((state) => {
      stateNames![state.id] = state.properties.name;
      stateIds![state.id] = idCounter++;
    });

    // Create and configure projection
    projection = d3.geoAlbersUsa().scale(1300).translate([500, 300]);

    return usShape;
  } catch (error) {
    console.error("Failed to load US map data:", error);
    return null;
  }
}

export function getStateInfo(x: number, y: number): StateInfo | null {
  if (!projection || !usShape) return null;

  try {
    const projectedPoint = projection.invert?.([x, y]);
    if (!projectedPoint) return null;
    const [lon, lat] = projectedPoint;

    // Find which state contains this point
    for (const state of usShape) {
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

        for (
          let i = 0, j = coordinates.length - 1;
          i < coordinates.length;
          j = i++
        ) {
          const [xi, yi] = coordinates[i];
          const [xj, yj] = coordinates[j];

          const intersect =
            yi > lat !== yj > lat &&
            lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

          if (intersect) inside = !inside;
        }

        if (
          inside &&
          state.id &&
          stateNames &&
          stateIds &&
          state.id in stateNames
        ) {
          return {
            name: stateNames[state.id],
            id: String(state.id),
            numericId: stateIds[state.id],
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.warn("Error finding state:", error);
    return null;
  }
}

export function isPointInUS(x: number, y: number): boolean {
  return getStateInfo(x, y) !== null;
}
