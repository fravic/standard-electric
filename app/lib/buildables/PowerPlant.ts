import { HexCoordinates } from "../coordinates/types";
import {
  Buildable,
  PowerPlant,
  PowerPlantBlueprint,
  PowerPlantType,
} from "./schemas";

const TYPE_IS_POWER_PLANT: Record<Buildable["type"], boolean> = {
  power_pole: false,
  coal_plant: true,
};

export function isPowerPlant(buildable: Buildable): buildable is PowerPlant {
  return TYPE_IS_POWER_PLANT[buildable.type];
}

export function isPowerPlantType(
  type: Buildable["type"]
): type is PowerPlantType {
  return TYPE_IS_POWER_PLANT[type];
}

interface CreatePowerPlantParams {
  id: string;
  coordinates: HexCoordinates;
  playerId: string;
  blueprint: PowerPlantBlueprint;
  pricePerKwh?: number;
  isGhost?: boolean;
}

export function createPowerPlant({
  id,
  coordinates,
  playerId,
  blueprint,
  pricePerKwh = 0.1,
  isGhost = false,
}: CreatePowerPlantParams): PowerPlant {
  return {
    id,
    coordinates,
    playerId,
    isGhost,
    type: blueprint.type,
    name: blueprint.name,
    powerGenerationKW: blueprint.powerGenerationKW,
    pricePerKwh,
    startingPrice: blueprint.startingPrice,
    requiredState: blueprint.requiredState,
  };
}
