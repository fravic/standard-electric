import React, { useMemo } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { GameContext } from "@/actor/game.context";
import { CommodityType } from "@/lib/types";
import { useWorld } from "../WorldContext";
import { CommoditySystem } from "@/ecs/systems/CommoditySystem";
import { AuthContext } from "@/auth.context";
import { cn } from "@/lib/utils";

interface CommodityMarketModalProps {
  onClose: () => void;
}

// Helper function to get commodity icon
const getCommodityIcon = (type: CommodityType) => {
  switch (type) {
    case CommodityType.COAL:
      return "🪨";
    case CommodityType.OIL:
      return "🛢️";
    case CommodityType.GAS:
      return "💨";
    case CommodityType.URANIUM:
      return "☢️";
    default:
      return "📦";
  }
};

export const CommodityMarketModal: React.FC<CommodityMarketModalProps> = ({ onClose }) => {
  const { commodityMarket } = GameContext.useSelector((state) => state.public);
  const world = useWorld();
  const userId = AuthContext.useSelector((state) => state.userId);
  const marketRates = useMemo(() => {
    const commoditySystem = new CommoditySystem();
    commoditySystem.initialize(world, { playerId: userId!, market: commodityMarket });
    return commoditySystem.getMarketRates(commodityMarket);
  }, [world, userId, commodityMarket]);
  const activeFuelTypes = useMemo(() => {
    const fuelReqEntities = [...world.with("fuelRequirement")];
    const fuelStorageEntities = [...world.with("fuelStorage")];
    const fuelTypeSet = new Set(
      fuelReqEntities
        .map((e) => e.fuelRequirement?.fuelType)
        .filter(Boolean)
        .concat(fuelStorageEntities.map((e) => e.fuelStorage?.fuelType).filter(Boolean))
    );
    return Array.from(fuelTypeSet) as CommodityType[];
  }, [world]);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <Card className="max-w-[700px] w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-foreground m-0 text-2xl font-serif-extra">Commodity Market</h2>
          <Button onClick={onClose}>Close</Button>
        </div>

        {activeFuelTypes.length > 0 ? (
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 border-b-2 border-secondary-button text-foreground font-bold">
                  Commodity
                </th>
                <th className="text-left py-3 px-4 border-b-2 border-secondary-button text-foreground font-bold">
                  Buy Price
                </th>
                <th className="text-left py-3 px-4 border-b-2 border-secondary-button text-foreground font-bold">
                  Sell Price
                </th>
                <th className="text-left py-3 px-4 border-b-2 border-secondary-button text-foreground font-bold">
                  Price Range
                </th>
              </tr>
            </thead>
            <tbody>
              {activeFuelTypes.map((fuelType) => {
                const rates = marketRates[fuelType];
                const commodity = commodityMarket.commodities[fuelType];
                const config = commodity.config;
                const currentRate = commodity.currentExchangeRate;

                // Calculate position in price range (0-100%)
                const priceRange = config.maxExchangeRate - config.minExchangeRate;
                const positionPercent = ((currentRate - config.minExchangeRate) / priceRange) * 100;

                return (
                  <tr key={fuelType}>
                    <td className="py-3 px-4 border-b border-secondary-button text-foreground">
                      <div className="flex items-center gap-2 capitalize font-bold">
                        {getCommodityIcon(fuelType)} {fuelType}
                      </div>
                    </td>
                    <td className="py-3 px-4 border-b border-secondary-button text-foreground font-mono">
                      ${rates.buyPrice.toFixed(2)} / {config.unitSize}kg
                    </td>
                    <td className="py-3 px-4 border-b border-secondary-button text-foreground font-mono">
                      ${rates.sellPrice.toFixed(2)} / {config.unitSize}kg
                    </td>
                    <td className="py-3 px-4 border-b border-secondary-button text-foreground">
                      <div className="w-full h-2 bg-black/30 rounded overflow-hidden relative">
                        <div
                          className="absolute top-0 left-0 h-full bg-primary-button"
                          style={{
                            width: `${positionPercent}%`,
                          }}
                        />
                        <div
                          className="absolute top-[-3px] w-1 h-[14px] bg-secondary-button rounded"
                          style={{
                            left: `${positionPercent}%`,
                            transform: "translateX(-50%)",
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-foreground opacity-70 mt-1">
                        <span>${config.minExchangeRate}</span>
                        <span>${config.maxExchangeRate}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-foreground opacity-70">
            No active commodities found on the map.
          </div>
        )}
      </Card>
    </div>
  );
};
