import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";

import { Entity } from "@/ecs/entity";
import { toWorldPoint } from "@/lib/coordinates/HexCoordinates";
import { ToonModelRenderer } from "../Shared/ToonModelRenderer";
import { GameContext } from "@/actor/game.context";
import { SmokeParticles } from "./SmokeParticles";

interface PowerPlantProps {
  entity: Entity;
  isGhost?: boolean;
}

export function PowerPlant({ entity, isGhost = false }: PowerPlantProps) {
  const { scene } = useGLTF("/public/assets/glb/PowerPlants.glb");
  // Get the players from the game context
  const players = GameContext.useSelector(
    (state: { public: { players: Record<string, { color: string }> } }) => state.public.players
  );

  // Find the PowerPlant01 object in the scene
  const powerPlantObject = scene.getObjectByName("PowerPlant01");

  // Clone the found object or return null if not found
  const powerPlantModel = powerPlantObject ? powerPlantObject.clone() : null;

  // Find the SmokeParticles object to get its position
  const smokeObject = scene.getObjectByName("SmokeParticles");
  const smokeLocalPosition = smokeObject ? smokeObject.position.clone() : null;

  // Reset the transform of the model to ignore any offset from the GLB scene
  if (powerPlantModel) {
    powerPlantModel.position.set(0, 0, 0);
  }

  if (!entity.hexPosition || !powerPlantModel) {
    console.warn("PowerPlant: Could not find PowerPlant01 in the GLB or entity has no position");
    return null;
  }

  // Position at the entity's hex position
  const position = toWorldPoint(entity.hexPosition.coordinates);

  // Get the player color from the entity owner if available
  const playerColor = entity.owner?.playerId && players[entity.owner.playerId]?.color;
  console.log({ isGhost });

  return (
    <>
      <ToonModelRenderer
        model={powerPlantModel}
        position={position}
        isGhost={isGhost}
        playerColor={playerColor}
      />
      {smokeLocalPosition && (
        <SmokeParticles
          position={[
            position[0] + smokeLocalPosition.x,
            position[1] + smokeLocalPosition.y,
            position[2] + smokeLocalPosition.z,
          ]}
          enabled={!isGhost && (entity.powerGeneration?.energyGeneratedLastTickKwh ?? 0) > 0}
        />
      )}
    </>
  );
}

// Preload the model
useGLTF.preload("/public/assets/glb/PowerPlants.glb");
