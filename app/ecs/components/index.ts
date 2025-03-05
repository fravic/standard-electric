import { z } from "zod";
import {
  HexCoordinatesSchema,
  CornerCoordinatesSchema,
} from "@/lib/coordinates/types";
import { CommodityType } from "@/lib/market/CommodityMarket";
import { HexGridSchema } from "@/lib/HexGrid";

/**
 * BaseComponent
 * Other components extend this. It just has an entityId.
 */
export const BaseComponentSchema = z.object({
  entityId: z.string(),
});

export type BaseComponent = z.infer<typeof BaseComponentSchema>;

/**
 * RenderableComponent
 * Gives an entity a renderable component name that can be used to render it
 */
export const RenderableComponentSchema = BaseComponentSchema.extend({
  type: z.literal("RENDERABLE"),
  renderableComponentName: z.string(),
});

export type RenderableComponent = z.infer<typeof RenderableComponentSchema>;

/**
 * HexGridComponent
 * Gives an entity a hex grid
 */
export const HexGridComponentSchema = BaseComponentSchema.extend({
  type: z.literal("HEX_GRID"),
  hexGrid: HexGridSchema,
});

export type HexGridComponent = z.infer<typeof HexGridComponentSchema>;

/**
 * HexPositionComponent
 * Gives an entity a position on a hex grid
 */
export const HexPositionComponentSchema = BaseComponentSchema.extend({
  type: z.literal("HEX_POSITION"),
  coordinates: HexCoordinatesSchema,
});

export type HexPositionComponent = z.infer<typeof HexPositionComponentSchema>;

/**
 * CornerPositionComponent
 * Gives an entity a corner position on a hex grid
 */
export const CornerPositionComponentSchema = BaseComponentSchema.extend({
  type: z.literal("CORNER_POSITION"),
  cornerCoordinates: CornerCoordinatesSchema,
});

export type CornerPositionComponent = z.infer<
  typeof CornerPositionComponentSchema
>;

/**
 * OwnerComponent
 * Gives an entity a playerId as owner
 */
export const OwnerComponentSchema = BaseComponentSchema.extend({
  type: z.literal("OWNER"),
  playerId: z.string(),
});

export type OwnerComponent = z.infer<typeof OwnerComponentSchema>;

/**
 * ConnectionComponent
 * Gives an entity a list of entityIds that it is connected to
 */
export const ConnectionComponentSchema = BaseComponentSchema.extend({
  type: z.literal("CONNECTION"),
  connectedToIds: z.array(z.string()),
});

export type ConnectionComponent = z.infer<typeof ConnectionComponentSchema>;

/**
 * PowerGenerationComponent
 * Gives an entity a power generation amount and a price per kWh
 */
export const PowerGenerationComponentSchema = BaseComponentSchema.extend({
  type: z.literal("POWER_GENERATION"),
  powerGenerationKW: z.number(),
  pricePerKwh: z.number(),
});

export type PowerGenerationComponent = z.infer<
  typeof PowerGenerationComponentSchema
>;

/**
 * FuelRequirementComponent
 * Gives an entity properties that describe how much fuel it requires to operate
 */
export const FuelRequirementComponentSchema = BaseComponentSchema.extend({
  type: z.literal("FUEL_REQUIREMENT"),
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
export const FuelStorageComponentSchema = BaseComponentSchema.extend({
  type: z.literal("FUEL_STORAGE"),
  currentFuelStorage: z.number(),
  maxFuelStorage: z.number(),
});

export type FuelStorageComponent = z.infer<typeof FuelStorageComponentSchema>;

/**
 * AuctionableComponent
 * Used for entities that can be auctioned off
 */
export const AuctionableComponentSchema = BaseComponentSchema.extend({
  type: z.literal("AUCTIONABLE"),
  startingPrice: z.number(),
});

export type AuctionableComponent = z.infer<typeof AuctionableComponentSchema>;

export type BlueprintComponent = z.infer<typeof BlueprintComponentSchema>;

/**
 * RequiredStateComponent
 * Gives an entity a required region within which it must be placed
 */
export const RequiredStateComponentSchema = BaseComponentSchema.extend({
  type: z.literal("REQUIRED_STATE"),
  requiredRegionName: z.string(),
});

export type RequiredStateComponent = z.infer<
  typeof RequiredStateComponentSchema
>;

/**
 * BlueprintComponent
 * Gives an entity a blueprint for a set of other components
 */
export const BlueprintComponentSchema = BaseComponentSchema.extend({
  type: z.literal("BLUEPRINT"),
  components: z.array(
    z.union([
      PowerGenerationComponentSchema,
      FuelRequirementComponentSchema,
      FuelStorageComponentSchema,
      RequiredStateComponentSchema,
    ])
  ),
});

/**
 * Component
 * A type that encompasses all possible components
 */
export const ComponentSchema = z.discriminatedUnion("type", [
  AuctionableComponentSchema,
  BlueprintComponentSchema,
  ConnectionComponentSchema,
  CornerPositionComponentSchema,
  FuelRequirementComponentSchema,
  FuelStorageComponentSchema,
  HexGridComponentSchema,
  HexPositionComponentSchema,
  OwnerComponentSchema,
  PowerGenerationComponentSchema,
  RenderableComponentSchema,
  RequiredStateComponentSchema,
]);

export type Component = z.infer<typeof ComponentSchema>;
export type ComponentType = z.infer<typeof ComponentSchema>["type"];
