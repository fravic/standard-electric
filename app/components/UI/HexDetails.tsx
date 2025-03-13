import React, { useMemo } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { UI_COLORS } from "@/lib/palette";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { clientStore } from "@/lib/clientState";
import { coordinatesToString, equals } from "@/lib/coordinates/HexCoordinates";
import { useSelector } from "@xstate/store/react";
import { SURVEY_DURATION_TICKS, SurveySystem } from "@/ecs/systems/SurveySystem";
import { useWorld } from "../WorldContext";
import { entityAtHexCoordinate } from "@/ecs/queries";
import { CommodityType } from "@/lib/types";
import { CommoditySystem } from "@/ecs/systems/CommoditySystem";
import { Entity } from "@/ecs/entity";

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
  resourceSection: {
    marginTop: "1rem",
    padding: "1rem",
    backgroundColor: UI_COLORS.PRIMARY_DARK,
    borderRadius: "8px",
  },
  resourceTitle: {
    color: UI_COLORS.TEXT_LIGHT,
    margin: 0,
    fontSize: "1.2rem",
    marginBottom: "0.5rem",
    textTransform: "capitalize" as const,
  },
  entityContainer: {
    marginBottom: "1.5rem",
    padding: "1rem",
    borderRadius: "8px",
  },
  entityTitle: {
    color: UI_COLORS.TEXT_LIGHT,
    margin: 0,
    fontSize: "1.1rem",
    marginBottom: "0.75rem",
  },
};

// New component to handle power plants and their commodity market logic
const PowerPlantDetails: React.FC<{ entity: Entity }> = ({ entity }) => {
  const userId = AuthContext.useSelector((state) => state.userId);
  const { commodityMarket, players } = GameContext.useSelector((state) => state.public);
  const sendGameEvent = GameContext.useSend();
  const world = useWorld();

  // Calculate market rates
  const marketRates = useMemo(() => {
    if (!userId) return undefined;
    const commoditySystem = new CommoditySystem();
    commoditySystem.initialize(world, { playerId: userId, market: commodityMarket });
    return commoditySystem.getMarketRates(commodityMarket);
  }, [world, userId, commodityMarket]);

  if (!entity.powerGeneration) return null;

  const isOwner = entity.owner?.playerId === userId;
  const player = userId ? players[userId] : undefined;

  // Calculate fuel percentage with null checks
  const maxFuelStorage = entity.fuelStorage?.maxFuelStorage || 0;
  const currentFuelStorage = entity.fuelStorage?.currentFuelStorage || 0;
  const fuelPercentage = maxFuelStorage > 0 ? (currentFuelStorage / maxFuelStorage) * 100 : 0;

  const fuelType = entity.fuelRequirement?.fuelType as CommodityType;
  const fuelRates = fuelType && marketRates ? marketRates[fuelType] : null;

  const handleBuyFuel = () => {
    if (!fuelType || !isOwner) return;

    sendGameEvent({
      type: "BUY_COMMODITY",
      fuelType,
      units: 1,
      powerPlantId: entity.id,
    });
  };

  const handleSellFuel = () => {
    if (!fuelType || !isOwner || currentFuelStorage <= 0) return;

    sendGameEvent({
      type: "SELL_COMMODITY",
      fuelType,
      units: 1,
      powerPlantId: entity.id,
    });
  };

  const canBuyFuel =
    isOwner &&
    fuelType &&
    fuelRates &&
    player &&
    player.money >= fuelRates.buyPrice &&
    currentFuelStorage < maxFuelStorage;

  const canSellFuel = isOwner && fuelType && fuelRates && currentFuelStorage > 0;

  return (
    <>
      <div style={styles.infoRow}>
        <span style={styles.label}>Power Generation:</span>
        <span>{entity.powerGeneration.powerGenerationKW} kW</span>
      </div>

      <div style={styles.infoRow}>
        <span style={styles.label}>Price per kWh:</span>
        <span>${entity.powerGeneration.pricePerKWh.toFixed(2)}</span>
      </div>

      {entity.owner && (
        <div style={styles.infoRow}>
          <span style={styles.label}>Owner:</span>
          <span>{players[entity.owner.playerId].name}</span>
        </div>
      )}

      {fuelType && (
        <div style={styles.fuelSection}>
          <div style={styles.fuelHeader}>
            <h3 style={styles.fuelTitle}>{fuelType} Fuel</h3>
            {fuelRates && (
              <div>
                <small>
                  Buy: ${fuelRates.buyPrice.toFixed(2)} | Sell: ${fuelRates.sellPrice.toFixed(2)}
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
            <span>{entity.fuelRequirement!.fuelConsumptionPerKWh} per kWh</span>
          </div>

          {isOwner && (
            <div style={styles.buttonContainer}>
              <Button onClick={handleBuyFuel} disabled={!canBuyFuel} fullWidth>
                Buy Fuel
              </Button>
              <Button onClick={handleSellFuel} disabled={!canSellFuel} fullWidth>
                Sell Fuel
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Component to display survey results or survey button
const SurveyDetails: React.FC<{ entity?: Entity }> = ({ entity }) => {
  const selectedHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.selectedHexCoordinates
  );

  const userId = AuthContext.useSelector((state) => state.userId);
  const gameState = GameContext.useSelector((state) => state);
  const sendGameEvent = GameContext.useSend();

  // Get current player's survey data and game time
  const currentTick = gameState.public.time.totalTicks;

  // Get the survey data for the selected hex
  const world = useWorld();

  // If we're rendering this for a specific entity with survey results, use that
  if (entity?.surveyResult) {
    const surveyResult = entity.surveyResult;

    // If survey is in progress but not complete
    if (!SurveySystem.isSurveyComplete(surveyResult.surveyStartTick, currentTick)) {
      const progress = Math.min(
        ((currentTick - surveyResult.surveyStartTick) / SURVEY_DURATION_TICKS) * 100,
        100
      );

      return (
        <div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Survey in Progress:</span>
          </div>
          <div style={styles.progressContainer}>
            <div
              style={{
                ...styles.progressBar,
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      );
    }

    // If survey is complete and resources were found
    const resource = surveyResult.resource;
    const isComplete = surveyResult.isComplete;
    if (isComplete && resource) {
      return (
        <div style={styles.resourceSection}>
          <h3 style={styles.resourceTitle}>Survey Results</h3>
          <div style={styles.infoRow}>
            <span style={styles.label}>Resource Found:</span>
            <span style={{ textTransform: "capitalize" }}>{resource.resourceType}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Amount:</span>
            <span>{resource.resourceAmount} units</span>
          </div>
        </div>
      );
    }

    // If survey is complete but no resources were found
    if (isComplete) {
      return (
        <div style={styles.resourceSection}>
          <h3 style={styles.resourceTitle}>Survey Results</h3>
          <div style={styles.infoRow}>
            <span>No resources found in this hex.</span>
          </div>
        </div>
      );
    }
  }

  // Otherwise, check if there's any survey result entity for the selected hex
  const surveyResults = world.with("surveyResult");
  const surveyResultForCell = surveyResults.where(
    (ent) =>
      Boolean(selectedHexCoordinates) &&
      equals(ent.hexPosition!.coordinates, selectedHexCoordinates!)
  ).first;

  // Check if player has any active survey
  const hasActiveSurveyInProgress = useMemo(() => {
    if (!userId) return false;
    return SurveySystem.hasActiveSurvey(world);
  }, [userId, currentTick, gameState.private, world]);

  // Handle starting a new survey
  const canSurvey = selectedHexCoordinates && !hasActiveSurveyInProgress && !surveyResultForCell;
  const handleStartSurvey = () => {
    if (!canSurvey) return;

    sendGameEvent({
      type: "SURVEY_HEX_TILE",
      coordinates: selectedHexCoordinates,
    });
  };

  // If no survey data and no active survey, show the survey button
  if (canSurvey) {
    return (
      <div style={styles.buttonContainer}>
        <Button onClick={handleStartSurvey} fullWidth disabled={!canSurvey}>
          Survey This Hex
        </Button>
      </div>
    );
  }

  // If there's a survey result entity but we don't have it directly
  if (surveyResultForCell) {
    return <SurveyDetails entity={surveyResultForCell} />;
  }

  // Fallback
  return null;
};

// Refactored EntityDetails component to handle different entity types
const EntityDetails: React.FC<{ entity: Entity }> = ({ entity }) => {
  const userId = AuthContext.useSelector((state) => state.userId);
  const { players } = GameContext.useSelector((state) => state.public);

  return (
    <div style={styles.entityContainer}>
      <h3 style={styles.entityTitle}>{entity.name || "Unknown Entity"}</h3>

      {/* Render entity type-specific components */}
      {entity.powerGeneration && <PowerPlantDetails entity={entity} />}

      {/* Show owner information if not shown by a specific component */}
      {entity.owner && !entity.powerGeneration && (
        <div style={styles.infoRow}>
          <span style={styles.label}>Owner:</span>
          <span>{players[entity.owner.playerId].name}</span>
        </div>
      )}

      {/* Render survey results if this entity has them */}
      {entity.surveyResult && <SurveyDetails entity={entity} />}
    </div>
  );
};

// Main HexDetails component
export const HexDetails: React.FC = () => {
  const selectedHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.selectedHexCoordinates
  );

  const handleClose = () => {
    clientStore.send({
      type: "selectHex",
      coordinates: null,
    });
  };

  const world = useWorld();

  // Find all entities at the selected coordinates
  const entitiesAtHex = useMemo(() => {
    if (!selectedHexCoordinates) return [];

    // Get all entities with hexPosition
    return world
      .with("hexPosition")
      .where((entity) => equals(entity.hexPosition.coordinates, selectedHexCoordinates)).entities;
  }, [selectedHexCoordinates, world]);

  if (!selectedHexCoordinates) {
    return null;
  }

  return (
    <Card style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {entitiesAtHex.length > 0
            ? `${entitiesAtHex.length} ${entitiesAtHex.length === 1 ? "Entity" : "Entities"}`
            : "Selected Hex"}
        </h2>
        <Button onClick={handleClose}>Close</Button>
      </div>

      <div style={styles.infoRow}>
        <span style={styles.label}>Coordinates:</span>
        <span>{coordinatesToString(selectedHexCoordinates)}</span>
      </div>

      {/* Render each entity */}
      {entitiesAtHex.length > 0 ? (
        entitiesAtHex.map((entity) => <EntityDetails key={entity.id} entity={entity} />)
      ) : (
        // If no entities, show the survey component for the hex
        <SurveyDetails />
      )}
    </Card>
  );
};
