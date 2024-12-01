import * as d3 from "d3-geo";
import { feature } from "topojson-client";

// Projection configuration
const PROJECTION_CONFIG = {
  SCALE: 1300,
  TRANSLATE_X: 500,
  TRANSLATE_Y: 300,
  BOUNDS: {
    x0: 0,
    y0: 0,
    x1: 1000,
    y1: 600,
  },
};

// State IDs to exclude
const EXCLUDED_STATES = {
  HAWAII: "15",
  ALASKA: "02",
  PUERTO_RICO: "72",
};

let usShape = null;
let projection = null;
let stateNames = null;
let stateIds = null;

export async function initializeMapData() {
  if (usShape) return usShape;

  try {
    const response = await fetch(
      "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
    );
    const topology = await response.json();

    // Filter out excluded states before creating the feature
    topology.objects.states.geometries =
      topology.objects.states.geometries.filter(
        (state) => !Object.values(EXCLUDED_STATES).includes(state.id)
      );

    const geojson = feature(topology, topology.objects.states);
    usShape = geojson.features;

    // Create state mappings
    stateNames = {};
    stateIds = {};
    let idCounter = 0;
    topology.objects.states.geometries.forEach((state) => {
      stateNames[state.id] = state.properties.name;
      stateIds[state.id] = idCounter++;
    });

    // Create and configure projection
    projection = d3
      .geoAlbersUsa()
      .scale(PROJECTION_CONFIG.SCALE)
      .translate([
        PROJECTION_CONFIG.TRANSLATE_X,
        PROJECTION_CONFIG.TRANSLATE_Y,
      ]);

    return usShape;
  } catch (error) {
    console.error("Failed to load US map data:", error);
    return null;
  }
}

export function getStateInfo(x, y) {
  if (!projection || !usShape) return null;

  try {
    // Check if the point is within our viewport bounds
    const { x0, y0, x1, y1 } = PROJECTION_CONFIG.BOUNDS;
    if (x < x0 || x > x1 || y < y0 || y > y1) return null;

    const [lon, lat] = projection.invert([x, y]);
    if (!lon || !lat) return null;

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
        const coordinates = polygon[0]; // Get the outer ring of the polygon

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

        if (inside) {
          return {
            name: stateNames[state.id],
            id: state.id,
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

export function isPointInUS(x, y) {
  return getStateInfo(x, y) !== null;
}
