import { produce } from "immer";

export enum CommodityType {
  COAL = "coal",
  OIL = "oil",
  GAS = "gas",
  URANIUM = "uranium",
}

export interface CommodityConfig {
  baseExchangeRate: number; // Base price per unit
  unitSize: number; // Size of one trading unit (e.g., 10kg)
  tradingFee: number; // Fee percentage (e.g., 0.3 for 30%)
  priceIncrement: number; // How much the price changes per unit traded
  minExchangeRate: number; // Minimum possible exchange rate
  maxExchangeRate: number; // Maximum possible exchange rate
}

export interface CommodityMarketState {
  commodities: Record<
    CommodityType,
    {
      currentExchangeRate: number;
      config: CommodityConfig;
    }
  >;
}

// Default configuration for commodities
export const DEFAULT_COMMODITY_CONFIGS: Record<CommodityType, CommodityConfig> =
  {
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

// Initialize a new market state with default values
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

// Calculate the buy price (including fee)
export function calculateBuyPrice(
  market: CommodityMarketState,
  fuelType: CommodityType,
  units: number
): number {
  const commodity = market.commodities[fuelType];
  const { currentExchangeRate, config } = commodity;
  const priceWithFee = currentExchangeRate * (1 + config.tradingFee);
  return priceWithFee * units;
}

// Calculate the sell price (after fee deduction)
export function calculateSellPrice(
  market: CommodityMarketState,
  fuelType: CommodityType,
  units: number
): number {
  const commodity = market.commodities[fuelType];
  const { currentExchangeRate, config } = commodity;
  const priceAfterFee = currentExchangeRate * (1 - config.tradingFee);
  return priceAfterFee * units;
}

// Buy commodity from the market
export function buyCommodity(
  market: CommodityMarketState,
  fuelType: CommodityType,
  units: number
): {
  updatedMarket: CommodityMarketState;
  totalCost: number;
  fuelAmount: number;
} {
  const totalCost = calculateBuyPrice(market, fuelType, units);
  const fuelAmount = units * market.commodities[fuelType].config.unitSize;

  // Update the market state
  const updatedMarket = produce(market, (draft) => {
    const commodity = draft.commodities[fuelType];

    // Increase the exchange rate based on units bought
    commodity.currentExchangeRate = Math.min(
      commodity.currentExchangeRate + commodity.config.priceIncrement * units,
      commodity.config.maxExchangeRate
    );
  });

  return { updatedMarket, totalCost, fuelAmount };
}

// Sell commodity to the market
export function sellCommodity(
  market: CommodityMarketState,
  fuelType: CommodityType,
  units: number
): {
  updatedMarket: CommodityMarketState;
  totalProfit: number;
  fuelAmount: number;
} {
  const totalProfit = calculateSellPrice(market, fuelType, units);
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

  return { updatedMarket, totalProfit, fuelAmount };
}

// Get the current market rates for all commodities
export function getMarketRates(market: CommodityMarketState): Record<
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
 * Buys fuel for a power plant, handling storage capacity limits
 */
export function buyFuelForPowerPlant({
  market,
  powerPlant,
  fuelType,
  units,
  playerMoney,
}: {
  market: CommodityMarketState;
  powerPlant: {
    fuelType?: CommodityType | null;
    maxFuelStorage?: number;
    currentFuelStorage?: number;
  };
  fuelType: CommodityType;
  units: number;
  playerMoney: number;
}): {
  updatedMarket: CommodityMarketState;
  actualCost: number;
  actualFuelAdded: number;
  success: boolean;
} {
  // Check if the power plant can use this fuel type
  if (powerPlant.fuelType !== fuelType) {
    return {
      updatedMarket: market,
      actualCost: 0,
      actualFuelAdded: 0,
      success: false,
    };
  }

  // Calculate available space in the fuel storage
  const maxStorage = powerPlant.maxFuelStorage || 0;
  const currentStorage = powerPlant.currentFuelStorage || 0;
  const availableStorage = maxStorage - currentStorage;

  // If there's no storage available, return early
  if (availableStorage <= 0) {
    return {
      updatedMarket: market,
      actualCost: 0,
      actualFuelAdded: 0,
      success: false,
    };
  }

  // Calculate how much fuel we can buy from the market
  const { updatedMarket, totalCost, fuelAmount } = buyCommodity(
    market,
    fuelType,
    units
  );

  // Check if player has enough money
  if (playerMoney < totalCost) {
    return {
      updatedMarket: market,
      actualCost: 0,
      actualFuelAdded: 0,
      success: false,
    };
  }

  // Calculate how much fuel we can actually store (might be limited by storage capacity)
  const actualFuelToAdd = Math.min(availableStorage, fuelAmount);

  // If we can't store any fuel, don't proceed with the purchase
  if (actualFuelToAdd <= 0) {
    return {
      updatedMarket: market,
      actualCost: 0,
      actualFuelAdded: 0,
      success: false,
    };
  }

  // Calculate the actual cost based on how much fuel we're adding
  const actualCost = (actualFuelToAdd / fuelAmount) * totalCost;

  return {
    updatedMarket,
    actualCost,
    actualFuelAdded: actualFuelToAdd,
    success: true,
  };
}

/**
 * Sells fuel from a power plant
 */
export function sellFuelFromPowerPlant({
  market,
  powerPlant,
  fuelType,
  units,
}: {
  market: CommodityMarketState;
  powerPlant: {
    fuelType?: CommodityType | null;
    currentFuelStorage?: number;
  };
  fuelType: CommodityType;
  units: number;
}): {
  updatedMarket: CommodityMarketState;
  totalProfit: number;
  actualFuelRemoved: number;
  success: boolean;
} {
  // Check if the power plant can use this fuel type
  if (powerPlant.fuelType !== fuelType) {
    return {
      updatedMarket: market,
      totalProfit: 0,
      actualFuelRemoved: 0,
      success: false,
    };
  }

  const availableFuel = powerPlant.currentFuelStorage || 0;

  // Calculate how much fuel would be sold
  const unitSize = market.commodities[fuelType].config.unitSize;
  const fuelToSell = units * unitSize;

  // Check if there's enough fuel to sell
  if (fuelToSell > availableFuel) {
    // Adjust units to match available fuel
    units = Math.floor(availableFuel / unitSize);

    // If no full units can be sold, return early
    if (units <= 0) {
      return {
        updatedMarket: market,
        totalProfit: 0,
        actualFuelRemoved: 0,
        success: false,
      };
    }
  }

  // Sell the fuel
  const result = sellCommodity(market, fuelType, units);

  return {
    updatedMarket: result.updatedMarket,
    totalProfit: result.totalProfit,
    actualFuelRemoved: result.fuelAmount,
    success: true,
  };
}
