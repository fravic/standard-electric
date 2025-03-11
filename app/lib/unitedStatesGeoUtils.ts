import * as d3 from "d3-geo";
import { Feature, MultiPolygon } from "geojson";
import { feature } from "topojson-client";
import type {
  MapData,
  StateGeometryMultiPolygon,
  StateGeometryPolygon,
  StateTopology,
} from "./MapData";

const EXCLUDED_STATES = ["15", "02", "72"];
const PROJECTION_SCALE = 120;
const PROJECTION_TRANSLATE: [number, number] = [50, 35];

export async function loadUnitedStatesMapData(): Promise<MapData | null> {
  try {
    const response = await fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
    const topology = (await response.json()) as StateTopology;

    const geojson = feature(topology, topology.objects.states);
    if (!Array.isArray(geojson.features)) {
      throw new Error("Invalid GeoJSON: features is not an array");
    }

    return {
      polygon: geojson.features as Feature<MultiPolygon>[],
      projection: d3.geoAlbersUsa().scale(PROJECTION_SCALE).translate(PROJECTION_TRANSLATE),
      states: topology.objects.states.geometries.reduce(
        (acc, state) => {
          if (EXCLUDED_STATES.includes(state.id)) return acc;
          acc[state.id] = state;
          return acc;
        },
        {} as { [key: string]: StateGeometryMultiPolygon | StateGeometryPolygon }
      ),
    };
  } catch (error) {
    console.error("Failed to load US map data:", error);
    return null;
  }
}
