import { HexGrid, getCell } from "../HexGrid";
import { PowerSystem } from "../power/PowerSystem";
import { PowerPlantBlueprint } from "./schemas";
import { getAdjacentHexes } from "../coordinates/CornerCoordinates";
import {
  coordinatesToString,
  HexCoordinates,
} from "../coordinates/HexCoordinates";
import { World } from "miniplex";
import { Entity } from "@/ecs/entity";

/**
 * Validates if a buildable can be placed at the specified location
 * based on region requirements, survey status, and other constraints.
 */
export function validateBuildableLocation({
  buildable,
  grid,
  world,
  playerId,
  surveyedHexCells,
}: {
  buildable: Entity;
  grid: HexGrid;
  world: World<Entity>;
  playerId: string;
  surveyedHexCells?: Set<string>; // Set of hex cell coordinates that have been surveyed
}): { valid: boolean; reason?: string } {
  // First, check if the location is surveyed (if surveyedHexCells is provided)
  if (surveyedHexCells) {
    if (buildable.hexPosition?.coordinates) {
      // For buildables placed on hex cells (like power plants)
      const coordString = coordinatesToString(buildable.hexPosition.coordinates);
      if (!surveyedHexCells.has(coordString)) {
        return { valid: false, reason: "This location has not been surveyed" };
      }
    } else if (buildable.cornerPosition?.cornerCoordinates) {
      // For buildables placed on corners (like power poles)
      // Check if any of the adjacent hexes are surveyed
      const adjacentHexes = getAdjacentHexes(buildable.cornerPosition.cornerCoordinates);
      const anySurveyed = adjacentHexes.some((hex) =>
        surveyedHexCells.has(coordinatesToString(hex))
      );

      if (!anySurveyed) {
        return { valid: false, reason: "This location has not been surveyed" };
      }
    }
  }

  // Next, check region requirements

  // For power poles, check if the corner is in a valid region
  if (buildable.cornerPosition?.cornerCoordinates) {
    const hexCell = getCell(grid, buildable.cornerPosition.cornerCoordinates.hex);
    if (!hexCell?.regionName) {
      return { valid: false, reason: "Power poles must be placed in a region" };
    }

    // Now check grid connectivity
    const powerSystem = new PowerSystem(grid, world);
    const connectivityValidation = powerSystem.validateBuildablePlacement(
      "powerPole",
      playerId,
      undefined,
      buildable.cornerPosition.cornerCoordinates
    );

    if (!connectivityValidation.valid) {
      return connectivityValidation;
    }

    return { valid: true };
  }

  // For power plants, check if the hex is in a valid region and matches the required state
  if (buildable.hexPosition?.coordinates && buildable.powerGeneration) {
    const cell = getCell(grid, buildable.hexPosition.coordinates);

    // Check if cell exists and has a region
    if (!cell) {
      return { valid: false, reason: "Invalid hex coordinate" };
    }

    if (!cell.regionName) {
      return {
        valid: false,
        reason: "Power plants must be placed in a region",
      };
    }

    // Check if the region matches the required state (if specified)
    const requiredRegion = buildable.requiredRegion;

    if (
      requiredRegion &&
      cell.regionName !== requiredRegion.requiredRegionName
    ) {
      return {
        valid: false,
        reason: `This power plant must be placed in ${requiredRegion.requiredRegionName}`,
      };
    }

    // Now check grid connectivity
    const powerSystem = new PowerSystem(grid, world);
    const connectivityValidation = powerSystem.validateBuildablePlacement(
      "powerPlant",
      playerId,
      buildable.hexPosition.coordinates,
      undefined
    );

    if (!connectivityValidation.valid) {
      return connectivityValidation;
    }

    return { valid: true };
  }

  return {
    valid: false,
    reason: "Invalid buildable type or missing coordinates",
  };
}
