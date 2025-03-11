import { With, World } from "miniplex";
import { nanoid } from "nanoid";
import { z } from "zod";

import { Entity, CornerPositionComponentSchema, HexPositionComponentSchema } from "./entity";
import { CornerCoordinates, HexCoordinates } from "@/lib/coordinates/types";
import { CommodityType } from "@/lib/types";
import { coordinatesToString } from "@/lib/coordinates/HexCoordinates";

export function createWorldWithEntities(
  publicEntitiesById: Record<string, Entity>,
  privateEntitiesById: Record<string, Entity>
) {
  const world = new World<Entity>();
  Object.values(publicEntitiesById).forEach((entity) => world.add(entity));
  Object.values(privateEntitiesById).forEach((entity) => world.add(entity));
  return world;
}

/**
 * Given an entity with a blueprint, create another entity with the blueprint components.
 */
export const AdditionalBlueprintOptionsSchema = z.object({
  cornerPosition: CornerPositionComponentSchema.optional(),
  hexPosition: HexPositionComponentSchema.optional(),
  connections: z
    .object({
      connectedToIds: z.array(z.string()),
    })
    .optional(),
});

export type AdditionalBlueprintOptions = z.infer<typeof AdditionalBlueprintOptionsSchema>;

export function createEntityFromBlueprint(
  blueprintEntity: With<Entity, "blueprint">,
  options: AdditionalBlueprintOptions
): Entity {
  return {
    ...blueprintEntity.blueprint.components,
    ...options,
    owner: blueprintEntity.owner,
    name: blueprintEntity.blueprint.name,
    id: nanoid(),
  };
}

export function createPowerPoleBlueprint(playerId: string): With<Entity, "blueprint"> {
  return {
    id: nanoid(),
    name: "Power pole blueprint",
    blueprint: {
      name: "Power pole",
      allowedPosition: "corner",
      components: {
        connections: {
          connectedToIds: [],
        },
        renderable: {
          renderableComponentName: "PowerPole",
        },
      },
    },
    owner: {
      playerId,
    },
  };
}

export function createDefaultBlueprintsForPlayer(playerId: string): With<Entity, "blueprint">[] {
  return [createPowerPoleBlueprint(playerId)];
}

/**
 * Create a power pole entity
 */
export function createPowerPole(options: {
  id?: string;
  cornerCoordinates: CornerCoordinates;
  playerId: string;
  connectedToIds: string[];
  isGhost?: boolean;
}): Entity {
  return {
    id: options.id || nanoid(),
    name: "Power pole",
    cornerPosition: {
      cornerCoordinates: options.cornerCoordinates,
    },
    owner: {
      playerId: options.playerId,
    },
    connections: {
      connectedToIds: options.connectedToIds,
    },
    renderable: {
      renderableComponentName: "PowerPole",
    },
    ...(options.isGhost ? { isGhost: { isGhost: true } } : {}),
  };
}

/**
 * Create a generic power plant entity. Used in Storybook and tests.
 */
export function createPowerPlant(options: {
  id?: string;
  name: string;
  hexCoordinates: HexCoordinates;
  playerId: string;
  powerGenerationKW: number;
  pricePerKWh: number;
  fuelType?: CommodityType;
  fuelConsumptionPerKWh?: number;
  isGhost?: boolean;
  maxFuelStorage?: number;
  currentFuelStorage?: number;
}): Entity {
  return {
    id: options.id || nanoid(),
    name: options.name,
    hexPosition: {
      coordinates: options.hexCoordinates,
    },
    owner: {
      playerId: options.playerId,
    },
    ...(options.maxFuelStorage !== undefined && options.currentFuelStorage !== undefined
      ? {
          fuelStorage: {
            fuelType: options.fuelType,
            maxFuelStorage: options.maxFuelStorage,
            currentFuelStorage: options.currentFuelStorage,
          },
        }
      : {}),
    powerGeneration: {
      powerGenerationKW: options.powerGenerationKW,
      pricePerKWh: options.pricePerKWh,
    },
    fuelRequirement: {
      fuelType: options.fuelType,
      fuelConsumptionPerKWh: options.fuelConsumptionPerKWh || 0,
    },
    renderable: {
      renderableComponentName: "PowerPlant",
    },
    ...(options.isGhost ? { isGhost: { isGhost: true } } : {}),
  };
}

/**
 * Create a generic power plant blueprint entity. Used in Storybook and tests.
 */
export function createPowerPlantBlueprint(options: {
  id?: string;
  name: string;
  playerId: string;
  powerGenerationKW: number;
  startingPrice: number;
  fuelType?: CommodityType;
  fuelConsumptionPerKWh?: number;
  pricePerKWh?: number;
  requiredRegionName?: string;
}): With<Entity, "blueprint"> {
  return {
    id: options.id || nanoid(),
    name: `${options.name} blueprint`,
    blueprint: {
      name: options.name,
      allowedPosition: "hex",
      components: {
        renderable: {
          renderableComponentName: "PowerPlant",
        },
        powerGeneration: options.pricePerKWh
          ? {
              powerGenerationKW: options.powerGenerationKW,
              pricePerKWh: options.pricePerKWh,
            }
          : undefined,
        fuelRequirement: {
          fuelType: options.fuelType || null,
          fuelConsumptionPerKWh: options.fuelConsumptionPerKWh || 0,
        },
        requiredRegion: options.requiredRegionName
          ? { requiredRegionName: options.requiredRegionName }
          : undefined,
      },
    },
    owner: {
      playerId: options.playerId,
    },
    auctionable: {
      startingPrice: options.startingPrice,
    },
  };
}

export function createSurvey(options: {
  id?: string;
  hexCoordinates: HexCoordinates;
  surveyStartTick: number;
  isComplete: boolean;
  playerId: string;
  resource?: {
    resourceType: CommodityType;
    resourceAmount: number;
  };
}): Entity {
  return {
    id: options.id || nanoid(),
    name: `Survey for ${coordinatesToString(options.hexCoordinates)}`,
    hexPosition: {
      coordinates: options.hexCoordinates,
    },
    surveyResult: {
      surveyStartTick: options.surveyStartTick,
      isComplete: options.isComplete,
      resource: options.resource,
    },
    owner: {
      playerId: options.playerId,
    },
  };
}
