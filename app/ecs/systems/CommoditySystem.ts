import { World } from "miniplex";
import { Draft, produce } from "immer";
import { Entity } from "../entity";
import { System, SystemContext, SystemResult } from "./System";
import { GameContext } from "@/actor/game.types";
import { CommodityType } from "@/lib/types";
import { powerPlantsForPlayer } from "../queries";

/**
 * Configuration for each commodity type
 */
export interface CommodityConfig {
  baseExchangeRate: number; // Base price per unit
  unitSize: number; // Size of one trading unit (e.g., 10kg)
  tradingFee: number; // Fee percentage (e.g., 0.3 for 30%)
  priceIncrement: number; // How much the price changes per unit traded
  minExchangeRate: number; // Minimum possible exchange rate
  maxExchangeRate: number; // Maximum possible exchange rate
}

/**
 * The structure of the commodity market state
 */
export interface CommodityMarketState {
  commodities: Record<
    CommodityType,
    {
      currentExchangeRate: number;
      config: CommodityConfig;
    }
  >;
}

/**
 * Default configuration for commodities
 */
export const DEFAULT_COMMODITY_CONFIGS: Record<CommodityType, CommodityConfig> = {
  [CommodityType.COAL]: {
    baseExchangeRate: 10, // $10 per unit
    unitSize: 10, // 10kg per unit
    tradingFee: 0.3, // 30% fee
    priceIncrement: 0.2, // $0.2 price change per unit traded
    minExchangeRate: 5, // Minimum price of $5
    maxExchangeRate: 30, // Maximum price of $30
  },
  [CommodityType.OIL]: {
    baseExchangeRate: 20,
    unitSize: 5,
    tradingFee: 0.3,
    priceIncrement: 0.3,
    minExchangeRate: 10,
    maxExchangeRate: 50,
  },
  [CommodityType.GAS]: {
    baseExchangeRate: 15,
    unitSize: 8,
    tradingFee: 0.3,
    priceIncrement: 0.25,
    minExchangeRate: 8,
    maxExchangeRate: 40,
  },
  [CommodityType.URANIUM]: {
    baseExchangeRate: 50,
    unitSize: 1,
    tradingFee: 0.3,
    priceIncrement: 0.5,
    minExchangeRate: 25,
    maxExchangeRate: 100,
  },
};

/**
 * Context for the CommoditySystem
 */
export interface CommodityContext extends SystemContext {
  playerId: string;
  market: CommodityMarketState;
}

/**
 * Result from CommoditySystem operations
 */
export interface CommoditySystemResult extends SystemResult {
  updatedMarket?: CommodityMarketState;
  powerPlantId?: string;
  fuelDelta?: number; // Positive for buying, negative for selling
  moneyDelta?: number; // Negative for buying, positive for selling
}

/**
 * Initialize a new market state with default values
 */
export function initializeCommodityMarket(): CommodityMarketState {
  return {
    commodities: {
      [CommodityType.COAL]: {
        currentExchangeRate:
          DEFAULT_COMMODITY_CONFIGS[CommodityType.COAL].baseExchangeRate,
        config: DEFAULT_COMMODITY_CONFIGS[CommodityType.COAL],
      },
      [CommodityType.OIL]: {
        currentExchangeRate:
          DEFAULT_COMMODITY_CONFIGS[CommodityType.OIL].baseExchangeRate,
        config: DEFAULT_COMMODITY_CONFIGS[CommodityType.OIL],
      },
      [CommodityType.GAS]: {
        currentExchangeRate:
          DEFAULT_COMMODITY_CONFIGS[CommodityType.GAS].baseExchangeRate,
        config: DEFAULT_COMMODITY_CONFIGS[CommodityType.GAS],
      },
      [CommodityType.URANIUM]: {
        currentExchangeRate:
          DEFAULT_COMMODITY_CONFIGS[CommodityType.URANIUM].baseExchangeRate,
        config: DEFAULT_COMMODITY_CONFIGS[CommodityType.URANIUM],
      },
    },
  };
}

/**
 * CommoditySystem handles all commodity market operations including buying and selling fuel
 */
export class CommoditySystem implements System<CommodityContext, CommoditySystemResult> {
  private world: World<Entity> | null = null;
  private context: CommodityContext | null = null;

  /**
   * Initialize the system with world and context
   */
  initialize(world: World<Entity>, context: CommodityContext): void {
    this.world = world;
    this.context = context;
  }

  /**
   * Calculate the buy price (including fee)
   */
  private calculateBuyPrice(
    market: CommodityMarketState,
    fuelType: CommodityType,
    units: number
  ): number {
    const commodity = market.commodities[fuelType];
    const { currentExchangeRate, config } = commodity;
    const priceWithFee = currentExchangeRate * (1 + config.tradingFee);
    return priceWithFee * units;
  }

  /**
   * Calculate the sell price (after fee deduction)
   */
  private calculateSellPrice(
    market: CommodityMarketState,
    fuelType: CommodityType,
    units: number
  ): number {
    const commodity = market.commodities[fuelType];
    const { currentExchangeRate, config } = commodity;
    const priceAfterFee = currentExchangeRate * (1 - config.tradingFee);
    return priceAfterFee * units;
  }

  /**
   * Get the current market rates for all commodities
   */
  getMarketRates(market: CommodityMarketState): Record<
    CommodityType,
    {
      buyPrice: number;
      sellPrice: number;
      unitSize: number;
    }
  > {
    const rates: Record<
      CommodityType,
      {
        buyPrice: number;
        sellPrice: number;
        unitSize: number;
      }
    > = {} as any;

    Object.entries(market.commodities).forEach(([type, commodity]) => {
      const fuelType = type as CommodityType;
      rates[fuelType] = {
        buyPrice:
          commodity.currentExchangeRate * (1 + commodity.config.tradingFee),
        sellPrice:
          commodity.currentExchangeRate * (1 - commodity.config.tradingFee),
        unitSize: commodity.config.unitSize,
      };
    });

    return rates;
  }

  /**
   * Buy fuel for a power plant
   */
  buyCommodity(
    market: CommodityMarketState,
    powerPlantId: string,
    fuelType: CommodityType,
    units: number,
    playerMoney: number
  ): CommoditySystemResult {
    if (!this.world) {
      return { success: false };
    }

    // Find the power plant entity
    const powerPlant = powerPlantsForPlayer(this.world, this.context!.playerId).where(entity => entity.id === powerPlantId).first;
    if (!powerPlant) {
      return { success: false };
    }
    
    // Check if the power plant can store this fuel type
    if (powerPlant.fuelStorage?.fuelType !== fuelType) {
      return { success: false };
    }

    // Check if fuelStorage exists, and use default values if not
    const maxStorage = powerPlant.fuelStorage!.maxFuelStorage;
    const currentStorage = powerPlant.fuelStorage!.currentFuelStorage;
    const availableStorage = maxStorage - currentStorage;

    // If there's no storage available, return early
    if (availableStorage <= 0) {
      return { success: false };
    }

    // Calculate total cost and fuel amount
    const totalCost = this.calculateBuyPrice(market, fuelType, units);
    const fuelAmount = units * market.commodities[fuelType].config.unitSize;

    // Check if player has enough money
    if (playerMoney < totalCost) {
      return { success: false };
    }

    // Calculate how much fuel we can actually store (might be limited by storage capacity)
    const actualFuelToAdd = Math.min(availableStorage, fuelAmount);

    // If we can't store any fuel, don't proceed with the purchase
    if (actualFuelToAdd <= 0) {
      return { success: false };
    }

    // Calculate the actual cost based on how much fuel we're adding
    const actualCost = (actualFuelToAdd / fuelAmount) * totalCost;

    // Update the market state
    const updatedMarket = produce(market, (draft) => {
      const commodity = draft.commodities[fuelType];

      // Increase the exchange rate based on units bought
      commodity.currentExchangeRate = Math.min(
        commodity.currentExchangeRate + commodity.config.priceIncrement * units,
        commodity.config.maxExchangeRate
      );
    });

    return {
      success: true,
      updatedMarket,
      powerPlantId,
      fuelDelta: actualFuelToAdd,
      moneyDelta: -actualCost, // Negative as money is spent
    };
  }

  /**
   * Sell fuel from a power plant
   */
  sellCommodity(
    market: CommodityMarketState,
    powerPlantId: string,
    fuelType: CommodityType,
    units: number
  ): CommoditySystemResult {
    if (!this.world) {
      return { success: false };
    }

    // Find the power plant entity
    const powerPlant = this.world.entities.find(entity => entity.id === powerPlantId);
    if (!powerPlant) {
      return { success: false };
    }
    
    // Check if the power plant has this fuel type
    if (!powerPlant.fuelStorage || powerPlant.fuelStorage.fuelType !== fuelType) {
      return { success: false };
    }

    const availableFuel = powerPlant.fuelStorage.currentFuelStorage || 0;

    // Calculate how much fuel would be sold
    const unitSize = market.commodities[fuelType].config.unitSize;
    const fuelToSell = units * unitSize;

    // Check if there's enough fuel to sell
    if (fuelToSell > availableFuel) {
      // Adjust units to match available fuel
      units = Math.floor(availableFuel / unitSize);

      // If no full units can be sold, return early
      if (units <= 0) {
        return { success: false };
      }
    }

    // Calculate total profit
    const totalProfit = this.calculateSellPrice(market, fuelType, units);
    const fuelAmount = units * market.commodities[fuelType].config.unitSize;

    // Update the market state
    const updatedMarket = produce(market, (draft) => {
      const commodity = draft.commodities[fuelType];

      // Decrease the exchange rate based on units sold
      commodity.currentExchangeRate = Math.max(
        commodity.currentExchangeRate - commodity.config.priceIncrement * units,
        commodity.config.minExchangeRate
      );
    });

    return {
      success: true,
      updatedMarket,
      powerPlantId,
      fuelDelta: -fuelAmount, // Negative as fuel is removed
      moneyDelta: totalProfit, // Positive as money is gained
    };
  }

  /**
   * Update the system based on the provided context
   */
  update(world: World<Entity>, context: CommodityContext): CommoditySystemResult {
    return { success: false };
  }

  /**
   * Apply mutations based on the operation result
   */
  mutate(result: CommoditySystemResult, contextDraft: Draft<GameContext>): void {
    if (!result.success || !this.context) {
      return;
    }

    const { playerId } = this.context;
    const { powerPlantId, fuelDelta, moneyDelta, updatedMarket } = result;

    // Update the market state
    if (updatedMarket) {
      contextDraft.public.commodityMarket = updatedMarket;
    }

    // Update player's money
    if (moneyDelta) {
      contextDraft.public.players[playerId].money += moneyDelta;
    }

    // Update power plant's fuel storage
    if (powerPlantId && fuelDelta !== undefined) {
      const powerPlant = contextDraft.public.entitiesById[powerPlantId];
      if (powerPlant) {
        // If fuelStorage doesn't exist, initialize it
        const existingFuelStorage = powerPlant.fuelStorage || { maxFuelStorage: 100, currentFuelStorage: 0 };
        contextDraft.public.entitiesById[powerPlantId] = {
          ...contextDraft.public.entitiesById[powerPlantId],
          fuelStorage: {
            ...existingFuelStorage,
            currentFuelStorage: (existingFuelStorage.currentFuelStorage || 0) + fuelDelta,
          },
        };
      }
    }
  }
}
