import React from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { UI_COLORS } from "@/lib/palette";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { Buildable, PowerPlant } from "@/lib/buildables/schemas";
import { CommodityType, getMarketRates } from "@/lib/market/CommodityMarket";
import { isPowerPlant } from "@/lib/buildables/PowerPlant";
import { clientStore } from "@/lib/clientState";
import { equals } from "@/lib/coordinates/HexCoordinates";
import { useSelector } from "@xstate/store/react";

const styles = {
  container: {
    position: "fixed" as const,
    top: "70px",
    right: "10px",
    maxWidth: "350px",
    width: "100%",
    zIndex: 1000,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  title: {
    color: UI_COLORS.TEXT_LIGHT,
    margin: 0,
    fontSize: "1.2rem",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0.5rem",
  },
  label: {
    fontWeight: "bold" as const,
    opacity: 0.8,
  },
  fuelSection: {
    marginTop: "1rem",
    padding: "1rem",
    backgroundColor: UI_COLORS.PRIMARY_DARK,
    borderRadius: "8px",
  },
  fuelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  fuelTitle: {
    color: UI_COLORS.TEXT_LIGHT,
    margin: 0,
    fontSize: "1rem",
    textTransform: "capitalize" as const,
  },
  progressContainer: {
    height: "12px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: "6px",
    overflow: "hidden",
    marginBottom: "0.5rem",
  },
  progressBar: {
    height: "100%",
    backgroundColor: UI_COLORS.PRIMARY,
    transition: "width 0.3s ease",
  },
  buttonContainer: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "1rem",
  },
};

// PowerPlantDetails component to display power plant specific information
const PowerPlantDetails: React.FC = () => {
  // Always call all hooks at the top level, regardless of conditions
  const selectedHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.selectedHexCoordinates
  );

  const buildables = GameContext.useSelector(
    (state) => state.public.buildables ?? []
  );

  const userId = AuthContext.useSelector((state) => state.userId);
  const { commodityMarket, players } = GameContext.useSelector(
    (state) => state.public
  );
  const sendGameEvent = GameContext.useSend();

  // Find the buildable at the selected coordinates
  const buildable = selectedHexCoordinates
    ? buildables.find(
        (b) => b.coordinates && equals(b.coordinates, selectedHexCoordinates)
      )
    : undefined;

  // Early return with null rendering if conditions aren't met
  if (!buildable || !isPowerPlant(buildable)) {
    return null;
  }

  const powerPlant = buildable as PowerPlant;

  if (!powerPlant.playerId) {
    return null;
  }

  const isOwner = powerPlant.playerId === userId;
  const player = userId ? players[userId] : undefined;

  // Calculate fuel percentage with null checks
  const maxFuelStorage = powerPlant.maxFuelStorage || 0;
  const currentFuelStorage = powerPlant.currentFuelStorage || 0;
  const fuelPercentage =
    maxFuelStorage > 0 ? (currentFuelStorage / maxFuelStorage) * 100 : 0;

  // Get market rates for this fuel type
  const marketRates = getMarketRates(commodityMarket);
  const fuelType = powerPlant.fuelType as CommodityType;
  const fuelRates = fuelType ? marketRates[fuelType] : null;

  const handleBuyFuel = () => {
    if (!fuelType || !isOwner) return;

    sendGameEvent({
      type: "BUY_COMMODITY",
      fuelType,
      units: 1,
      powerPlantId: powerPlant.id,
    });
  };

  const handleSellFuel = () => {
    if (!fuelType || !isOwner || currentFuelStorage <= 0) return;

    sendGameEvent({
      type: "SELL_COMMODITY",
      fuelType,
      units: 1,
      powerPlantId: powerPlant.id,
    });
  };

  const canBuyFuel =
    isOwner &&
    fuelType &&
    fuelRates &&
    player &&
    player.money >= fuelRates.buyPrice &&
    currentFuelStorage < maxFuelStorage;

  const canSellFuel =
    isOwner && fuelType && fuelRates && currentFuelStorage > 0;

  return (
    <>
      <div style={styles.infoRow}>
        <span style={styles.label}>Power Generation:</span>
        <span>{powerPlant.powerGenerationKW} kW</span>
      </div>

      <div style={styles.infoRow}>
        <span style={styles.label}>Price per kWh:</span>
        <span>${powerPlant.pricePerKwh.toFixed(2)}</span>
      </div>

      <div style={styles.infoRow}>
        <span style={styles.label}>Owner:</span>
        <span>{players[powerPlant.playerId]?.name || "Unknown"}</span>
      </div>

      {fuelType && (
        <div style={styles.fuelSection}>
          <div style={styles.fuelHeader}>
            <h3 style={styles.fuelTitle}>{fuelType} Fuel</h3>
            {fuelRates && (
              <div>
                <small>
                  Buy: ${fuelRates.buyPrice.toFixed(2)} | Sell: $
                  {fuelRates.sellPrice.toFixed(2)}
                </small>
              </div>
            )}
          </div>

          <div style={styles.infoRow}>
            <span style={styles.label}>Fuel Storage:</span>
            <span>
              {currentFuelStorage.toFixed(1)} / {maxFuelStorage.toFixed(1)}
            </span>
          </div>

          <div style={styles.progressContainer}>
            <div
              style={{
                ...styles.progressBar,
                width: `${fuelPercentage}%`,
              }}
            />
          </div>

          <div style={styles.infoRow}>
            <span style={styles.label}>Consumption Rate:</span>
            <span>{powerPlant.fuelConsumptionPerKWh} per kWh</span>
          </div>

          {isOwner && (
            <div style={styles.buttonContainer}>
              <Button onClick={handleBuyFuel} disabled={!canBuyFuel} fullWidth>
                Buy Fuel
              </Button>
              <Button
                onClick={handleSellFuel}
                disabled={!canSellFuel}
                fullWidth
              >
                Sell Fuel
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Main HexDetails component
export const HexDetails: React.FC = () => {
  // Always call all hooks at the top level
  const selectedHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.selectedHexCoordinates
  );

  const buildables = GameContext.useSelector(
    (state) => state.public.buildables ?? []
  );

  // Early return if no hex is selected
  if (!selectedHexCoordinates) {
    return null;
  }

  const handleClose = () => {
    clientStore.send({
      type: "selectHex",
      coordinates: null,
    });
  };

  // Find the buildable at the selected coordinates
  const buildable = buildables.find(
    (b) => b.coordinates && equals(b.coordinates, selectedHexCoordinates)
  );

  // Get the title based on the buildable type
  let title = "Selected Hex";
  if (buildable && isPowerPlant(buildable) && (buildable as PowerPlant).name) {
    title = (buildable as PowerPlant).name;
  }

  return (
    <Card style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{title}</h2>
        <Button onClick={handleClose}>Close</Button>
      </div>

      <PowerPlantDetails />

      {/* If no power plant is found, we could add other hex details here */}
      {!buildable && (
        <div style={styles.infoRow}>
          <span>No buildable on this hex</span>
        </div>
      )}
    </Card>
  );
};
