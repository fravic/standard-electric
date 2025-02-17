import React from "react";
import { UI_COLORS } from "@/lib/palette";
import { BUILDABLE_COSTS } from "@/lib/buildables/costs";
import { clientStore, isPowerPlantBuildMode } from "@/lib/clientState";
import { useSelector } from "@xstate/store/react";
import { Player } from "@/actor/game.types";

interface BuildButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  name: string;
  price?: number;
  details?: {
    powerGenerationKW?: number;
    requiredState?: string;
  };
}

const BuildButton: React.FC<BuildButtonProps> = ({
  onClick,
  disabled,
  isActive,
  name,
  price,
  details,
}) => {
  return (
    <button
      style={{
        backgroundColor: UI_COLORS.PRIMARY,
        border: "none",
        color: UI_COLORS.TEXT_LIGHT,
        padding: "8px 16px",
        textAlign: "center",
        textDecoration: "none",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        fontSize: "14px",
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: "4px",
        transition: "background-color 0.3s",
        ...(isActive && {
          backgroundColor: UI_COLORS.PRIMARY_DARK,
          color: UI_COLORS.TEXT_LIGHT,
        }),
        ...(disabled && {
          backgroundColor: UI_COLORS.PRIMARY_DARK,
          color: UI_COLORS.TEXT_DARK,
          opacity: 0.7,
        }),
      }}
      onClick={onClick}
      disabled={disabled}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "2px",
        }}
      >
        <div>{name}</div>
        {details && (
          <div style={{ fontSize: "12px", opacity: 0.8 }}>
            {details.powerGenerationKW && `${details.powerGenerationKW}kW`}
            {details.requiredState && ` • ${details.requiredState}`}
          </div>
        )}
      </div>
      {isActive ? "Cancel" : price ? `Place ($${price})` : "Place"}
    </button>
  );
};

interface BuildBarProps {
  player: Player;
}

export const BuildBar: React.FC<BuildBarProps> = ({ player }) => {
  const buildMode = useSelector(
    clientStore,
    (state) => state.context.buildMode
  );
  const canAffordPowerPole = player.money >= BUILDABLE_COSTS.power_pole;

  const handleBlueprintClick = (blueprintId: string) => {
    if (
      isPowerPlantBuildMode(buildMode) &&
      buildMode.blueprintId === blueprintId
    ) {
      clientStore.send({ type: "setBuildMode", mode: null });
    } else {
      const blueprint = player.blueprintsById[blueprintId]!;
      clientStore.send({
        type: "setBuildMode",
        mode: { type: blueprint.type, blueprintId },
      });
    }
  };
  const handlePowerPoleClick = () => {
    if (buildMode?.type === "power_pole") {
      clientStore.send({ type: "setBuildMode", mode: null });
    } else if (canAffordPowerPole) {
      clientStore.send({
        type: "setBuildMode",
        mode: { type: "power_pole" },
      });
    }
  };

  return (
    <div
      style={{
        backgroundColor: UI_COLORS.BACKGROUND,
        color: "white",
        padding: "10px",
        borderRadius: "5px",
        fontFamily: "monospace",
        fontSize: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginBottom: "10px",
      }}
    >
      <BuildButton
        name="Power Pole"
        price={BUILDABLE_COSTS.power_pole}
        onClick={handlePowerPoleClick}
        disabled={!canAffordPowerPole && buildMode?.type !== "power_pole"}
        isActive={buildMode?.type === "power_pole"}
      />

      {Object.entries(player.blueprintsById).map(([id, blueprint]) => (
        <BuildButton
          key={id}
          name={blueprint.name}
          details={{
            powerGenerationKW: blueprint.powerGenerationKW,
            requiredState: blueprint.requiredState,
          }}
          onClick={() => handleBlueprintClick(id)}
          isActive={Boolean(
            buildMode &&
              isPowerPlantBuildMode(buildMode) &&
              buildMode.blueprintId === id
          )}
        />
      ))}
    </div>
  );
};
