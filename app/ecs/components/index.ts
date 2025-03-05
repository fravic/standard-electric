import { z } from "zod";
import {
  HexCoordinatesSchema,
  CornerCoordinatesSchema,
} from "../../lib/coordinates/types";
import { CommodityType } from "../../lib/market/CommodityMarket";

/**
 * Base Component
 * All components should extend from this base component schema
 */
export const ComponentSchema = z.object({
  entityId: z.string(),
});

export type Component = z.infer<typeof ComponentSchema>;

/**
 * Type Component
 * Defines what type of entity this is
 */
export const TypeComponentSchema = ComponentSchema.extend({
  type: z.union([z.literal("power_pole"), z.literal("coal_plant")]),
});

export type TypeComponent = z.infer<typeof TypeComponentSchema>;

/**
 * Position Component (Hex Grid)
 */
export const HexPositionComponentSchema = ComponentSchema.extend({
  coordinates: HexCoordinatesSchema,
});

export type HexPositionComponent = z.infer<typeof HexPositionComponentSchema>;

/**
 * Corner Position Component
 */
export const CornerPositionComponentSchema = ComponentSchema.extend({
  cornerCoordinates: CornerCoordinatesSchema,
});

export type CornerPositionComponent = z.infer<
  typeof CornerPositionComponentSchema
>;

/**
 * Owner Component
 */
export const OwnerComponentSchema = ComponentSchema.extend({
  playerId: z.string(),
});

export type OwnerComponent = z.infer<typeof OwnerComponentSchema>;

/**
 * Connection Component (for power poles)
 */
export const ConnectionComponentSchema = ComponentSchema.extend({
  connectedToIds: z.array(z.string()),
});

export type ConnectionComponent = z.infer<typeof ConnectionComponentSchema>;

/**
 * Power Generation Component
 */
export const PowerGenerationComponentSchema = ComponentSchema.extend({
  powerGenerationKW: z.number(),
  pricePerKwh: z.number(),
});

export type PowerGenerationComponent = z.infer<
  typeof PowerGenerationComponentSchema
>;

/**
 * Fuel Component
 */
export const FuelComponentSchema = ComponentSchema.extend({
  fuelType: z.nativeEnum(CommodityType).nullable().optional(),
  fuelConsumptionPerKWh: z.number().optional(),
  maxFuelStorage: z.number().optional(),
  currentFuelStorage: z.number().optional(),
});

export type FuelComponent = z.infer<typeof FuelComponentSchema>;

/**
 * Name Component
 */
export const NameComponentSchema = ComponentSchema.extend({
  name: z.string(),
});

export type NameComponent = z.infer<typeof NameComponentSchema>;

/**
 * Blueprint Component
 * Used for entities that serve as templates/blueprints
 */
export const BlueprintComponentSchema = ComponentSchema.extend({
  startingPrice: z.number(),
  requiredState: z.string().optional(),
});

export type BlueprintComponent = z.infer<typeof BlueprintComponentSchema>;
