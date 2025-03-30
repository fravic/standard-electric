import React from "react";
import { With } from "miniplex";

import { PowerPole } from "./PowerSystem/PowerPole";
import { PowerPlant } from "./PowerSystem/PowerPlant";
import { Entity } from "@/ecs/entity";

interface EntityRenderableProps {
  entity: Entity;
}

export const EntityRenderable: React.FC<EntityRenderableProps> = ({ entity }) => {
  const entityRenderable = entity.renderable;

  if (!entityRenderable) {
    return null;
  }

  if (entityRenderable.renderableComponentName === "PowerPole") {
    return <PowerPole pole={entity} isGhost={Boolean(entity.isGhost)} />;
  }

  if (entityRenderable.renderableComponentName === "PowerPlant") {
    return <PowerPlant entity={entity} isGhost={Boolean(entity.isGhost)} />;
  }

  return null;
};
