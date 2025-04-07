import React, { useMemo } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { UI_COLORS } from "@/lib/palette";
import { GameContext } from "@/actor/game.context";
import { CommodityType } from "@/lib/types";
import { useWorld } from "../WorldContext";
import { CommoditySystem } from "@/ecs/systems/CommoditySystem";
import { AuthContext } from "@/auth.context";

interface CommodityMarketModalProps {
  onClose: () => void;
}

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  title: {
    color: UI_COLORS.TEXT_LIGHT,
    margin: 0,
    fontSize: "1.5rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    marginBottom: "1rem",
  },
  tableHeader: {
    textAlign: "left" as const,
    padding: "0.75rem 1rem",
    borderBottom: `2px solid ${UI_COLORS.PRIMARY_DARK}`,
    color: UI_COLORS.TEXT_LIGHT,
    fontWeight: "bold" as const,
  },
  tableCell: {
    padding: "0.75rem 1rem",
    borderBottom: `1px solid ${UI_COLORS.PRIMARY_DARK}`,
    color: UI_COLORS.TEXT_LIGHT,
  },
  commodityName: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    textTransform: "capitalize" as const,
    fontWeight: "bold" as const,
  },
  priceCell: {
    fontFamily: "monospace",
  },
  scaleContainer: {
    width: "100%",
    height: "8px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: "4px",
    overflow: "hidden",
    position: "relative" as const,
  },
  scaleTrack: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: UI_COLORS.PRIMARY,
  },
  scaleMarker: {
    position: "absolute" as const,
    top: "-3px",
    width: "4px",
    height: "14px",
    backgroundColor: "white",
    borderRadius: "2px",
    transform: "translateX(-50%)",
  },
  scaleLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.75rem",
    color: UI_COLORS.TEXT_LIGHT,
    opacity: 0.7,
    marginTop: "4px",
  },
  noData: {
    textAlign: "center" as const,
    padding: "2rem",
    color: UI_COLORS.TEXT_LIGHT,
    opacity: 0.7,
  },
};

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
    <div style={styles.overlay}>
      <Card className="max-w-[700px] w-full">
        <div style={styles.header}>
          <h2 style={styles.title}>Commodity Market</h2>
          <Button onClick={onClose}>Close</Button>
        </div>

        {activeFuelTypes.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Commodity</th>
                <th style={styles.tableHeader}>Buy Price</th>
                <th style={styles.tableHeader}>Sell Price</th>
                <th style={styles.tableHeader}>Price Range</th>
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
                    <td style={styles.tableCell}>
                      <div style={styles.commodityName}>
                        {getCommodityIcon(fuelType)} {fuelType}
                      </div>
                    </td>
                    <td style={{ ...styles.tableCell, ...styles.priceCell }}>
                      ${rates.buyPrice.toFixed(2)} / {config.unitSize}kg
                    </td>
                    <td style={{ ...styles.tableCell, ...styles.priceCell }}>
                      ${rates.sellPrice.toFixed(2)} / {config.unitSize}kg
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.scaleContainer}>
                        <div
                          style={{
                            ...styles.scaleTrack,
                            width: `${positionPercent}%`,
                          }}
                        />
                        <div
                          style={{
                            ...styles.scaleMarker,
                            left: `${positionPercent}%`,
                          }}
                        />
                      </div>
                      <div style={styles.scaleLabels}>
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
          <div style={styles.noData}>No active commodities found on the map.</div>
        )}
      </Card>
    </div>
  );
};
