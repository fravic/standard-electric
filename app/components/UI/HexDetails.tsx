import React, { useMemo, useRef, useEffect } from "react";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { clientStore } from "@/lib/clientState";
import { coordinatesToString, equals } from "@/lib/coordinates/HexCoordinates";
import { useSelector } from "@xstate/store/react";
import { SURVEY_DURATION_TICKS, SurveySystem } from "@/ecs/systems/SurveySystem";
import { useWorld } from "../WorldContext";
import { CommodityType } from "@/lib/types";
import { CommoditySystem } from "@/ecs/systems/CommoditySystem";
import { Entity } from "@/ecs/entity";
import {
  IonModal,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonItem,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonProgressBar,
  IonList,
} from "@ionic/react";

export const HexDetails: React.FC = () => {
  const selectedHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.selectedHexCoordinates
  );

  const modalRef = useRef<HTMLIonModalElement>(null);

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

  // Control modal presentation based on selectedHexCoordinates
  useEffect(() => {
    if (selectedHexCoordinates && modalRef.current) {
      // Set a timeout to allow the modal to be properly initialized
      setTimeout(() => {
        modalRef.current?.present();
      }, 50);
    } else if (modalRef.current?.isOpen) {
      modalRef.current.dismiss();
    }
  }, [selectedHexCoordinates]);

  return (
    <IonModal
      ref={modalRef}
      isOpen={Boolean(selectedHexCoordinates)}
      initialBreakpoint={0.25}
      breakpoints={[0, 0.25, 0.5, 0.75, 1]}
      backdropBreakpoint={0.75}
      backdropDismiss={false}
      onDidDismiss={handleClose}
      handle={true}
      className="fixed bottom-0"
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle className="font-serif-extra">
            {entitiesAtHex.length > 0
              ? `${entitiesAtHex.length} ${entitiesAtHex.length === 1 ? "Entity" : "Entities"}`
              : "Selected Hex"}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding bg-white h-[80vh]">
        {selectedHexCoordinates && (
          <IonList className="min-h-[300px] p-5">
            {/* Render each entity */}
            {entitiesAtHex.length > 0
              ? entitiesAtHex.map((entity) => <EntityDetails key={entity.id} entity={entity} />)
              : null}

            {/* Survey details are handled separately since an entity won't exist yet if not yet surveyed */}
            <SurveyDetails />
          </IonList>
        )}
      </IonContent>
    </IonModal>
  );
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
      <IonItem lines="none">
        <IonLabel>
          <IonGrid>
            <IonRow>
              <IonCol size="7">
                <strong className="opacity-80">Power Generation:</strong>
              </IonCol>
              <IonCol size="5" className="ion-text-end">
                {entity.powerGeneration.powerGenerationKW} kW
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonLabel>
      </IonItem>

      <IonItem lines="none">
        <IonLabel>
          <IonGrid>
            <IonRow>
              <IonCol size="7">
                <strong className="opacity-80">Price per kWh:</strong>
              </IonCol>
              <IonCol size="5" className="ion-text-end">
                ${entity.powerGeneration.pricePerKWh.toFixed(2)}
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonLabel>
      </IonItem>

      {entity.owner && (
        <IonItem lines="none">
          <IonLabel>
            <IonGrid>
              <IonRow>
                <IonCol size="7">
                  <strong className="opacity-80">Owner:</strong>
                </IonCol>
                <IonCol size="5" className="ion-text-end">
                  {players[entity.owner.playerId].name}
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonLabel>
        </IonItem>
      )}

      {fuelType && (
        <IonCard className="mt-4">
          <IonCardHeader>
            <IonCardTitle className="text-base capitalize font-serif-extra">
              {fuelType} Fuel
            </IonCardTitle>
            {fuelRates && (
              <div className="text-sm">
                Buy: ${fuelRates.buyPrice.toFixed(2)} | Sell: ${fuelRates.sellPrice.toFixed(2)}
              </div>
            )}
          </IonCardHeader>
          <IonCardContent>
            <IonItem lines="none">
              <IonLabel>
                <IonGrid>
                  <IonRow>
                    <IonCol size="7">
                      <strong className="opacity-80">Fuel Storage:</strong>
                    </IonCol>
                    <IonCol size="5" className="ion-text-end">
                      {currentFuelStorage.toFixed(1)} / {maxFuelStorage.toFixed(1)}
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonLabel>
            </IonItem>

            <IonProgressBar
              value={fuelPercentage / 100}
              color="primary"
              className="my-2"
            ></IonProgressBar>

            <IonItem lines="none">
              <IonLabel>
                <IonGrid>
                  <IonRow>
                    <IonCol size="7">
                      <strong className="opacity-80">Consumption Rate:</strong>
                    </IonCol>
                    <IonCol size="5" className="ion-text-end">
                      {entity.fuelRequirement!.fuelConsumptionPerKWh} per kWh
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonLabel>
            </IonItem>

            {isOwner && (
              <div className="mt-4 flex gap-2">
                <IonButton onClick={handleBuyFuel} disabled={!canBuyFuel} expand="block">
                  Buy Fuel
                </IonButton>
                <IonButton onClick={handleSellFuel} disabled={!canSellFuel} expand="block">
                  Sell Fuel
                </IonButton>
              </div>
            )}
          </IonCardContent>
        </IonCard>
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
        <>
          <IonItem lines="none">
            <IonLabel>
              <strong className="opacity-80">Survey in Progress:</strong>
            </IonLabel>
          </IonItem>
          <IonProgressBar value={progress / 100} color="primary" className="my-2"></IonProgressBar>
        </>
      );
    }

    // If survey is complete and resources were found
    const resource = surveyResult.resource;
    const isComplete = surveyResult.isComplete;
    if (isComplete && resource) {
      return (
        <IonCard className="mt-4">
          <IonCardHeader>
            <IonCardTitle className="text-lg capitalize font-serif-extra">
              Survey Results
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem lines="none">
              <IonLabel>
                <IonGrid>
                  <IonRow>
                    <IonCol size="7">
                      <strong className="opacity-80">Resource Found:</strong>
                    </IonCol>
                    <IonCol size="5" className="ion-text-end capitalize">
                      {resource.resourceType}
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonLabel>
            </IonItem>
            <IonItem lines="none">
              <IonLabel>
                <IonGrid>
                  <IonRow>
                    <IonCol size="7">
                      <strong className="opacity-80">Amount:</strong>
                    </IonCol>
                    <IonCol size="5" className="ion-text-end">
                      {resource.resourceAmount} units
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonLabel>
            </IonItem>
          </IonCardContent>
        </IonCard>
      );
    }

    // If survey is complete but no resources were found
    if (isComplete) {
      return (
        <IonCard className="mt-4">
          <IonCardHeader>
            <IonCardTitle className="text-lg capitalize font-serif-extra">
              Survey Results
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="text-foreground">No resources found in this hex.</div>
          </IonCardContent>
        </IonCard>
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
      <IonButton onClick={handleStartSurvey} expand="block" disabled={!canSurvey}>
        Survey This Hex
      </IonButton>
    );
  }

  // If there's a survey result entity but we don't have it directly
  if (surveyResultForCell) {
    return <SurveyDetails entity={surveyResultForCell} />;
  }

  // Fallback
  return null;
};

// Renders various entity details
const EntityDetails: React.FC<{ entity: Entity }> = ({ entity }) => {
  const { players } = GameContext.useSelector((state) => state.public);

  return (
    <div className="mb-6">
      <IonItem lines="none" className="font-serif-extra text-[1.1rem]">
        {entity.name || "Unknown Entity"}
      </IonItem>

      {/* Render entity type-specific components */}
      {entity.powerGeneration && <PowerPlantDetails entity={entity} />}

      {/* Show owner information if not shown by a specific component */}
      {entity.owner && !entity.powerGeneration && (
        <IonItem lines="none">
          <IonLabel>
            <IonGrid>
              <IonRow>
                <IonCol size="7">
                  <strong className="opacity-80">Owner:</strong>
                </IonCol>
                <IonCol size="5" className="ion-text-end">
                  {players[entity.owner.playerId].name}
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonLabel>
        </IonItem>
      )}
    </div>
  );
};
