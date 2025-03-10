import { z } from "zod";
import {
  HexCoordinatesSchema,
  CornerCoordinatesSchema,
} from "@/lib/coordinates/types";
import { CommodityType } from "@/lib/types";

/**
 * RenderableComponent
 * Gives an entity a renderable component name that can be used to render it
 */
export const RenderableComponentSchema = z.object({
  renderableComponentName: z.enum(["PowerPole", "PowerPlant"]),
});

export type RenderableComponent = z.infer<typeof RenderableComponentSchema>;

/**
 * HexPositionComponent
 * Gives an entity a position on a hex grid
 */
export const HexPositionComponentSchema = z.object({
  coordinates: HexCoordinatesSchema,
});

export type HexPositionComponent = z.infer<typeof HexPositionComponentSchema>;

/**
 * CornerPositionComponent
 * Gives an entity a corner position on a hex grid
 */
export const CornerPositionComponentSchema = z.object({
  cornerCoordinates: CornerCoordinatesSchema,
});

export type CornerPositionComponent = z.infer<
  typeof CornerPositionComponentSchema
>;

/**
 * OwnerComponent
 * Gives an entity a playerId as owner
 */
export const OwnerComponentSchema = z.object({
  playerId: z.string(),
});

export type OwnerComponent = z.infer<typeof OwnerComponentSchema>;

/**
 * CostComponent
 * Gives an entity a cost
 */
export const CostComponentSchema = z.object({
  amount: z.number(),
});

export type CostComponent = z.infer<typeof CostComponentSchema>;

/**
 * ConnectionsComponent
 * Gives an entity a list of entityIds that it is connected to
 */
export const ConnectionsComponentSchema = z.object({
  connectedToIds: z.array(z.string()),
});

export type ConnectionsComponent = z.infer<typeof ConnectionsComponentSchema>;

/**
 * PowerGenerationComponent
 * Gives an entity a power generation amount and a price per kWh
 */
export const PowerGenerationComponentSchema = z.object({
  powerGenerationKW: z.number(),
  pricePerKWh: z.number(),
});

export type PowerGenerationComponent = z.infer<
  typeof PowerGenerationComponentSchema
>;

/**
 * FuelRequirementComponent
 * Gives an entity properties that describe how much fuel it requires to operate
 */
export const FuelRequirementComponentSchema = z.object({
  fuelType: z.nativeEnum(CommodityType).nullable().optional(),
  fuelConsumptionPerKWh: z.number().optional(),
});

export type FuelRequirementComponent = z.infer<
  typeof FuelRequirementComponentSchema
>;

/**
 * FuelStorageComponent
 * Gives an entity a current fuel storage amount
 */
export const FuelStorageComponentSchema = z.object({
  fuelType: z.nativeEnum(CommodityType).nullable().optional(),
  currentFuelStorage: z.number(),
  maxFuelStorage: z.number(),
});

export type FuelStorageComponent = z.infer<typeof FuelStorageComponentSchema>;

/**
 * AuctionableComponent
 * Used for entities that can be auctioned off
 */
export const AuctionableComponentSchema = z.object({
  startingPrice: z.number(),
});

export type AuctionableComponent = z.infer<typeof AuctionableComponentSchema>;

/**
 * RequiredRegionComponent
 * Gives an entity a required region within which it must be placed
 */
export const RequiredRegionComponentSchema = z.object({
  requiredRegionName: z.string(),
});

export type RequiredRegionComponent = z.infer<
  typeof RequiredRegionComponentSchema
>;

/**
 * BlueprintComponent
 * Gives an entity a blueprint for a set of other components
 */
export const BlueprintComponentSchema = z.object({
  name: z.string(),
  buildsRemaining: z.number().optional(), // If undefined, infinite
  allowedPosition: z.enum(["corner", "hex"]),
  components: z.object({
    connections: ConnectionsComponentSchema.optional(),
    fuelRequirement: FuelRequirementComponentSchema.optional(),
    fuelStorage: FuelStorageComponentSchema.optional(),
    powerGeneration: PowerGenerationComponentSchema.optional(),
    renderable: RenderableComponentSchema.optional(),
    requiredRegion: RequiredRegionComponentSchema.optional(),
  }),
});

export type BlueprintComponent = z.infer<typeof BlueprintComponentSchema>;

/**
 * SurveyResult
 * Contains the result of a survey operation
 */
export const SurveyResultComponentSchema = z.object({
  surveyStartTick: z.number(),
  isComplete: z.boolean().optional(),
  resource: z.object({
    resourceType: z.nativeEnum(CommodityType),
    resourceAmount: z.number(),
  }).optional(),
});

export type SurveyResultComponent = z.infer<typeof SurveyResultComponentSchema>;

/**
 * IsGhostComponent
 * Ghosts are entities that have not yet been built/confirmed.
 */
export const IsGhostComponentSchema = z.object({
  isGhost: z.literal(true),
});

export type IsGhostComponent = z.infer<typeof IsGhostComponentSchema>;

/**
 * Entity
 * Properties on an Entity are "components". All components are optional.
 */
export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  auctionable: AuctionableComponentSchema.optional(),
  blueprint: BlueprintComponentSchema.optional(),
  connections: ConnectionsComponentSchema.optional(),
  cornerPosition: CornerPositionComponentSchema.optional(),
  cost: CostComponentSchema.optional(),
  fuelRequirement: FuelRequirementComponentSchema.optional(),
  fuelStorage: FuelStorageComponentSchema.optional(),
  hexPosition: HexPositionComponentSchema.optional(),
  owner: OwnerComponentSchema.optional(),
  powerGeneration: PowerGenerationComponentSchema.optional(),
  renderable: RenderableComponentSchema.optional(),
  requiredRegion: RequiredRegionComponentSchema.optional(),
  surveyResult: SurveyResultComponentSchema.optional(),
  isGhost: IsGhostComponentSchema.optional(),
});

export type Entity = z.infer<typeof EntitySchema>;
