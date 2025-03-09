import React, { useMemo } from "react";
import { UI_COLORS } from "@/lib/palette";
import { clientStore } from "@/lib/clientState";
import { useSelector } from "@xstate/store/react";
import { Player } from "@/actor/game.types";
import { BuildButton } from "./BuildButton";
import { useWorld } from "../WorldContext";
import { AuthContext } from "@/auth.context";

interface BuildBarProps {
  player: Player;
}

export const BuildBar: React.FC<BuildBarProps> = ({ player }) => {
  const buildMode = useSelector(
    clientStore,
    (state) => state.context.buildMode
  );

  const world = useWorld();
  const userId = AuthContext.useSelector((state) => state.userId);
  const blueprintEntities = useMemo(() => {
    return [...world.with("blueprint", "owner").where((blueprint) =>
      blueprint.owner?.playerId === userId
    )];
  }, [world, userId]);

  const handleBlueprintClick = (blueprintId: string) => {
    clientStore.send({
      type: "setBuildMode",
      mode: { blueprintId },
    });
  };

  return (
    <div
      style={{
        backgroundColor: UI_COLORS.BACKGROUND,
        color: "white",
        padding: "10px",
        borderRadius: "5px",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginBottom: "10px",
      }}
    >
      {blueprintEntities.map((blueprintEntity) => (
        <BuildButton
          key={blueprintEntity.id}
          name={blueprintEntity.blueprint.name}
          details={{
            powerGenerationKW: blueprintEntity.blueprint.components.powerGeneration?.powerGenerationKW,
            requiredRegion: blueprintEntity.blueprint.components.requiredRegion?.requiredRegionName,
          }}
          onClick={() => handleBlueprintClick(blueprintEntity.id)}
          isActive={Boolean(
            buildMode &&
              buildMode.blueprintId === blueprintEntity.id
          )}
        />
      ))}
    </div>
  );
};
