import {
  initializeCommodityMarket,
  buyCommodity,
  sellCommodity,
  calculateBuyPrice,
  calculateSellPrice,
  getMarketRates,
  CommodityType,
  CommodityMarketState,
} from "../CommodityMarket";

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
});
