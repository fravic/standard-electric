import { HexGrid, getCell } from "../HexGrid";
import { PowerSystem } from "../power/PowerSystem";
import { Buildable, PowerPlantBlueprint } from "./schemas";
import { isPowerPlant } from "./PowerPlant";

/**
 * Validates if a buildable can be placed at the specified location
 * based on region requirements and other constraints.
 */
export function validateBuildableLocation(
  buildable: Pick<
    Buildable,
    "type" | "coordinates" | "cornerCoordinates" | "id"
  >,
  grid: HexGrid,
  allBuildables: Buildable[],
  playerId: string,
  playerBlueprints: Record<string, PowerPlantBlueprint>
): { valid: boolean; reason?: string } {
  // First, check region requirements

  // For power poles, check if the corner is in a valid region
  if (buildable.type === "power_pole" && buildable.cornerCoordinates) {
    const hexCell = getCell(grid, buildable.cornerCoordinates.hex);
    if (!hexCell?.regionName) {
      return { valid: false, reason: "Power poles must be placed in a region" };
    }

    // Now check grid connectivity
    const powerSystem = new PowerSystem(grid, allBuildables);
    const connectivityValidation = powerSystem.validateBuildablePlacement(
      "power_pole",
      playerId,
      undefined,
      buildable.cornerCoordinates
    );

    if (!connectivityValidation.valid) {
      return connectivityValidation;
    }

    return { valid: true };
  }

  // For power plants, check if the hex is in a valid region and matches the required state
  if (isPowerPlant(buildable) && buildable.coordinates) {
    const cell = getCell(grid, buildable.coordinates);

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
    const blueprint = playerBlueprints[buildable.id];

    if (
      blueprint?.requiredState &&
      cell.regionName !== blueprint.requiredState
    ) {
      return {
        valid: false,
        reason: `This power plant must be placed in ${blueprint.requiredState}`,
      };
    }

    // Now check grid connectivity
    const powerSystem = new PowerSystem(grid, allBuildables);
    const connectivityValidation = powerSystem.validateBuildablePlacement(
      buildable.type,
      playerId,
      buildable.coordinates,
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
