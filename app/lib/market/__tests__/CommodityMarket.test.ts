import {
  initializeCommodityMarket,
  buyCommodity,
  sellCommodity,
  calculateBuyPrice,
  calculateSellPrice,
  getMarketRates,
  CommodityType,
  CommodityMarketState,
  buyFuelForPowerPlant,
  sellFuelFromPowerPlant,
} from "../CommodityMarket";
import { Entity } from "@/ecs/entity";

describe("CommodityMarket", () => {
  let market: CommodityMarketState;

  beforeEach(() => {
    market = initializeCommodityMarket();
  });

  describe("initializeCommodityMarket", () => {
    it("should initialize a market with default values", () => {
      expect(market.commodities[CommodityType.COAL].currentExchangeRate).toBe(
        10
      );
      expect(market.commodities[CommodityType.OIL].currentExchangeRate).toBe(
        20
      );
      expect(market.commodities[CommodityType.GAS].currentExchangeRate).toBe(
        15
      );
      expect(
        market.commodities[CommodityType.URANIUM].currentExchangeRate
      ).toBe(50);
    });
  });

  describe("calculateBuyPrice", () => {
    it("should calculate the buy price with fee", () => {
      const price = calculateBuyPrice(market, CommodityType.COAL, 2);
      // Base price: 10, Fee: 30%, Units: 2
      // 10 * 1.3 * 2 = 26
      expect(price).toBe(26);
    });
  });

  describe("calculateSellPrice", () => {
    it("should calculate the sell price with fee deduction", () => {
      const price = calculateSellPrice(market, CommodityType.COAL, 2);
      // Base price: 10, Fee: 30%, Units: 2
      // 10 * 0.7 * 2 = 14
      expect(price).toBe(14);
    });
  });

  describe("buyCommodity", () => {
    it("should update market rates when buying commodities", () => {
      const initialRate =
        market.commodities[CommodityType.COAL].currentExchangeRate;
      const { updatedMarket, totalCost, fuelAmount } = buyCommodity(
        market,
        CommodityType.COAL,
        5
      );

      // Check that the exchange rate increased
      expect(
        updatedMarket.commodities[CommodityType.COAL].currentExchangeRate
      ).toBeGreaterThan(initialRate);

      // Check that the cost is calculated correctly
      expect(totalCost).toBe(calculateBuyPrice(market, CommodityType.COAL, 5));

      // Check that the fuel amount is calculated correctly (coal unit size is 10)
      expect(fuelAmount).toBe(5 * 10);
    });

    it("should not exceed maximum exchange rate", () => {
      // Set the exchange rate close to the maximum
      market.commodities[CommodityType.COAL].currentExchangeRate =
        market.commodities[CommodityType.COAL].config.maxExchangeRate - 0.1;

      const { updatedMarket } = buyCommodity(market, CommodityType.COAL, 10);

      // Check that the exchange rate is capped at the maximum
      expect(
        updatedMarket.commodities[CommodityType.COAL].currentExchangeRate
      ).toBe(market.commodities[CommodityType.COAL].config.maxExchangeRate);
    });
  });

  describe("sellCommodity", () => {
    it("should update market rates when selling commodities", () => {
      const initialRate =
        market.commodities[CommodityType.COAL].currentExchangeRate;
      const { updatedMarket, totalProfit, fuelAmount } = sellCommodity(
        market,
        CommodityType.COAL,
        5
      );

      // Check that the exchange rate decreased
      expect(
        updatedMarket.commodities[CommodityType.COAL].currentExchangeRate
      ).toBeLessThan(initialRate);

      // Check that the profit is calculated correctly
      expect(totalProfit).toBe(
        calculateSellPrice(market, CommodityType.COAL, 5)
      );

      // Check that the fuel amount is calculated correctly (coal unit size is 10)
      expect(fuelAmount).toBe(5 * 10);
    });

    it("should not go below minimum exchange rate", () => {
      // Set the exchange rate close to the minimum
      market.commodities[CommodityType.COAL].currentExchangeRate =
        market.commodities[CommodityType.COAL].config.minExchangeRate + 0.1;

      const { updatedMarket } = sellCommodity(market, CommodityType.COAL, 10);

      // Check that the exchange rate is capped at the minimum
      expect(
        updatedMarket.commodities[CommodityType.COAL].currentExchangeRate
      ).toBe(market.commodities[CommodityType.COAL].config.minExchangeRate);
    });
  });

  describe("getMarketRates", () => {
    it("should return current buy and sell prices for all commodities", () => {
      const rates = getMarketRates(market);

      expect(rates[CommodityType.COAL].buyPrice).toBe(
        market.commodities[CommodityType.COAL].currentExchangeRate * 1.3
      );
      expect(rates[CommodityType.COAL].sellPrice).toBe(
        market.commodities[CommodityType.COAL].currentExchangeRate * 0.7
      );
      expect(rates[CommodityType.COAL].unitSize).toBe(
        market.commodities[CommodityType.COAL].config.unitSize
      );

      expect(rates[CommodityType.OIL].buyPrice).toBe(
        market.commodities[CommodityType.OIL].currentExchangeRate * 1.3
      );
      expect(rates[CommodityType.OIL].sellPrice).toBe(
        market.commodities[CommodityType.OIL].currentExchangeRate * 0.7
      );
      expect(rates[CommodityType.OIL].unitSize).toBe(
        market.commodities[CommodityType.OIL].config.unitSize
      );
    });
  });

  describe("market simulation", () => {
    it("should simulate supply and demand with multiple transactions", () => {
      // Initial state
      const initialCoalRate =
        market.commodities[CommodityType.COAL].currentExchangeRate;

      // Buy 10 units of coal (increases price)
      let buyResult = buyCommodity(market, CommodityType.COAL, 10);
      market = buyResult.updatedMarket;

      // Price should increase
      expect(
        market.commodities[CommodityType.COAL].currentExchangeRate
      ).toBeGreaterThan(initialCoalRate);

      // Sell 5 units of coal (decreases price)
      let sellResult = sellCommodity(market, CommodityType.COAL, 5);
      market = sellResult.updatedMarket;

      // Price should decrease but still be higher than initial
      expect(
        market.commodities[CommodityType.COAL].currentExchangeRate
      ).toBeLessThan(
        initialCoalRate +
          10 * market.commodities[CommodityType.COAL].config.priceIncrement
      );
      expect(
        market.commodities[CommodityType.COAL].currentExchangeRate
      ).toBeGreaterThan(initialCoalRate);

      // Sell a lot more coal to drive the price down
      sellResult = sellCommodity(market, CommodityType.COAL, 50);
      market = sellResult.updatedMarket;

      // Price should be lower than initial now
      expect(
        market.commodities[CommodityType.COAL].currentExchangeRate
      ).toBeLessThan(initialCoalRate);
    });
  });

  describe("buyFuelForPowerPlant", () => {
    it("should successfully buy fuel when all conditions are met", () => {
      const powerPlant: Entity = {
        id: "test-power-plant-1",
        fuelRequirement: {
          fuelType: CommodityType.COAL,
          fuelConsumptionPerKWh: 0.5
        },
        fuelStorage: {
          fuelType: CommodityType.COAL,
          maxFuelStorage: 100,
          currentFuelStorage: 0,
        }
      };
      const playerMoney = 1000;
      const units = 5;

      const result = buyFuelForPowerPlant({
        market,
        powerPlant,
        fuelType: CommodityType.COAL,
        units,
        playerMoney,
      });

      expect(result.success).toBe(true);
      expect(result.actualCost).toBe(
        calculateBuyPrice(market, CommodityType.COAL, units)
      );
      expect(result.actualFuelAdded).toBe(
        units * market.commodities[CommodityType.COAL].config.unitSize
      );
      expect(
        result.updatedMarket.commodities[CommodityType.COAL].currentExchangeRate
      ).toBeGreaterThan(
        market.commodities[CommodityType.COAL].currentExchangeRate
      );
    });

    it("should fail when there is no available storage", () => {
      const powerPlant: Entity = {
        id: "test-power-plant-2",
        fuelRequirement: {
          fuelType: CommodityType.COAL,
          fuelConsumptionPerKWh: 0.5
        },
        fuelStorage: {
          fuelType: CommodityType.COAL,
          maxFuelStorage: 50,
          currentFuelStorage: 50, // Full storage
        }
      };
      const playerMoney = 1000;
      const units = 5;

      const result = buyFuelForPowerPlant({
        market,
        powerPlant,
        fuelType: CommodityType.COAL,
        units,
        playerMoney,
      });

      expect(result.success).toBe(false);
      expect(result.actualCost).toBe(0);
      expect(result.actualFuelAdded).toBe(0);
      expect(result.updatedMarket).toEqual(market); // Market should remain unchanged
    });

    it("should fail when player doesn't have enough money", () => {
      const powerPlant: Entity = {
        id: "test-power-plant-3",
        fuelRequirement: {
          fuelType: CommodityType.COAL,
          fuelConsumptionPerKWh: 0.5
        },
        fuelStorage: {
          fuelType: CommodityType.COAL,
          maxFuelStorage: 100,
          currentFuelStorage: 0,
        }
      };
      const playerMoney = 0;
      const units = 5;

      const result = buyFuelForPowerPlant({
        market,
        powerPlant,
        fuelType: CommodityType.COAL,
        units,
        playerMoney,
      });

      expect(result.success).toBe(false);
      expect(result.actualCost).toBe(0);
      expect(result.actualFuelAdded).toBe(0);
      expect(result.updatedMarket).toEqual(market); // Market should remain unchanged
    });

    it("should limit fuel added based on available storage", () => {
      const powerPlant: Entity = {
        id: "test-power-plant-4",
        fuelRequirement: {
          fuelType: CommodityType.COAL,
          fuelConsumptionPerKWh: 0.5
        },
        fuelStorage: {
          fuelType: CommodityType.COAL,
          maxFuelStorage: 50,
          currentFuelStorage: 30, // Only 20 units of storage left
        }
      };
      const playerMoney = 1000;
      const units = 5; // Trying to buy 5 units (50 fuel)

      const result = buyFuelForPowerPlant({
        market,
        powerPlant,
        fuelType: CommodityType.COAL,
        units,
        playerMoney,
      });

      expect(result.success).toBe(true);
      expect(result.actualFuelAdded).toBe(20); // Should be limited to available storage
      expect(result.actualCost).toBeLessThan(
        calculateBuyPrice(market, CommodityType.COAL, units)
      ); // Cost should be proportionally reduced
    });

    it("should fail when power plant fuel type doesn't match", () => {
      const powerPlant: Entity = {
        id: "test-power-plant-5",
        fuelRequirement: {
          fuelType: CommodityType.OIL,
          fuelConsumptionPerKWh: 0.5
        },
        fuelStorage: {
          fuelType: CommodityType.OIL,
          maxFuelStorage: 100,
          currentFuelStorage: 0,
        }
      };
      const playerMoney = 1000;
      const units = 5;

      const result = buyFuelForPowerPlant({
        market,
        powerPlant,
        fuelType: CommodityType.COAL,
        units,
        playerMoney,
      });

      expect(result.success).toBe(false);
      expect(result.actualCost).toBe(0);
      expect(result.actualFuelAdded).toBe(0);
      expect(result.updatedMarket).toEqual(market); // Market should remain unchanged
    });
  });

  describe("sellFuelFromPowerPlant", () => {
    it("should successfully sell fuel when all conditions are met", () => {
      const powerPlant: Entity = {
        id: "test-power-plant-6",
        fuelStorage: {
          fuelType: CommodityType.COAL,
          currentFuelStorage: 100,
          maxFuelStorage: 200
        }
      };
      const units = 5;

      const result = sellFuelFromPowerPlant({
        market,
        powerPlant,
        fuelType: CommodityType.COAL,
        units,
      });

      expect(result.success).toBe(true);
      expect(result.totalProfit).toBe(
        calculateSellPrice(market, CommodityType.COAL, units)
      );
      expect(result.actualFuelRemoved).toBe(
        units * market.commodities[CommodityType.COAL].config.unitSize
      );
      expect(
        result.updatedMarket.commodities[CommodityType.COAL].currentExchangeRate
      ).toBeLessThan(
        market.commodities[CommodityType.COAL].currentExchangeRate
      );
    });

    it("should fail when there is no available fuel", () => {
      const powerPlant: Entity = {
        id: "test-power-plant-7",
        fuelStorage: {
          fuelType: CommodityType.COAL,
          currentFuelStorage: 0,
          maxFuelStorage: 100
        }
      };
      const units = 5;

      const result = sellFuelFromPowerPlant({
        market,
        powerPlant,
        fuelType: CommodityType.COAL,
        units,
      });

      expect(result.success).toBe(false);
      expect(result.totalProfit).toBe(0);
      expect(result.actualFuelRemoved).toBe(0);
      expect(result.updatedMarket).toEqual(market); // Market should remain unchanged
    });

    it("should adjust units sold based on available fuel", () => {
      const powerPlant: Entity = {
        id: "test-power-plant-8",
        fuelStorage: {
          fuelType: CommodityType.COAL,
          currentFuelStorage: 25, // Only enough for 2.5 units of coal (10 per unit)
          maxFuelStorage: 100
        }
      };
      const units = 5; // Trying to sell 5 units

      const result = sellFuelFromPowerPlant({
        market,
        powerPlant,
        fuelType: CommodityType.COAL,
        units,
      });

      expect(result.success).toBe(true);
      expect(result.actualFuelRemoved).toBe(20); // Should sell 2 full units (20 fuel)
      expect(result.totalProfit).toBe(
        calculateSellPrice(market, CommodityType.COAL, 2)
      ); // Profit for 2 units
    });

    it("should fail when available fuel is less than one unit", () => {
      const powerPlant: Entity = {
        id: "test-power-plant-9",
        fuelStorage: {
          fuelType: CommodityType.COAL,
          currentFuelStorage: 5, // Less than one unit of coal (10 per unit)
          maxFuelStorage: 100
        }
      };
      const units = 1;

      const result = sellFuelFromPowerPlant({
        market,
        powerPlant,
        fuelType: CommodityType.COAL,
        units,
      });

      expect(result.success).toBe(false);
      expect(result.totalProfit).toBe(0);
      expect(result.actualFuelRemoved).toBe(0);
      expect(result.updatedMarket).toEqual(market); // Market should remain unchanged
    });

    it("should fail when power plant fuel type doesn't match", () => {
      const powerPlant: Entity = {
        id: "test-power-plant-10",
        fuelStorage: {
          fuelType: CommodityType.OIL,
          currentFuelStorage: 100,
          maxFuelStorage: 200
        }
      };
      const units = 5;

      const result = sellFuelFromPowerPlant({
        market,
        powerPlant,
        fuelType: CommodityType.COAL,
        units,
      });

      expect(result.success).toBe(false);
      expect(result.totalProfit).toBe(0);
      expect(result.actualFuelRemoved).toBe(0);
      expect(result.updatedMarket).toEqual(market); // Market should remain unchanged
    });
  });
});
