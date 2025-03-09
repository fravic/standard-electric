import React from "react";
import { Box } from "@react-three/drei";
import { With } from "miniplex";

import { PowerPole } from "./PowerSystem/PowerPole";
import { Entity } from "@/ecs/entity";
import { PALETTE } from "@/lib/palette";
import { toWorldPoint } from "@/lib/coordinates/HexCoordinates";

interface EntityRenderableProps  {
  entity: Entity;
}

export const EntityRenderable: React.FC<EntityRenderableProps> = ({ entity }) => {
  const entityRenderable = entity.renderable;

  if (!entityRenderable) {
    return null;
  }

  if (entityRenderable.renderableComponentName === "PowerPole") {
    return (
      <PowerPole
        pole={entity}
        isGhost={Boolean(entity.isGhost)}
      />
    );
  }

  // TODO: Extract out power plant component
  if (entityRenderable.renderableComponentName === "PowerPlant" && entity.hexPosition) {
    return (
      <Box
        position={toWorldPoint(entity.hexPosition.coordinates)}
        args={[0.5, 1, 0.5]}
      >
        <meshStandardMaterial
          color={PALETTE.DARK_GREEN}
          transparent={Boolean(entity.isGhost)}
          opacity={Boolean(entity.isGhost) ? 0.5 : 1}
        />
      </Box>
    );
  }

  return null;
};
