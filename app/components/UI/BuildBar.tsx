import React from "react";
import { UI_COLORS } from "@/lib/palette";
import { BUILDABLE_COSTS } from "@/lib/buildables/costs";
import { clientStore, isPowerPlantBuildMode } from "@/lib/clientState";
import { useSelector } from "@xstate/store/react";
import { Player } from "@/actor/game.types";
import { BuildButton } from "./BuildButton";

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
