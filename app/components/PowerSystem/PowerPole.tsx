import React, { useMemo } from "react";
import * as THREE from "three";
import { Sphere } from "@react-three/drei";

import { GameContext } from "@/actor/game.context";
import { cornerToWorldPoint } from "@/lib/coordinates/CornerCoordinates";
import { Entity } from "@/ecs/entity";
import { getPlayerColor } from "@/lib/constants";

interface PowerPoleProps {
  pole: Entity;
  isGhost?: boolean;
}

const POLE_HEIGHT_Y = 0.08; // Height of the dome center
const DOME_RADIUS = 0.14; // Radius of the dome
const LINE_HEIGHT = 0.02; // Height of the power lines above ground

export function PowerPole({ pole, isGhost = false }: PowerPoleProps) {
  const entitiesById = GameContext.useSelector((state) => state.public.entitiesById);
  const playersById = GameContext.useSelector((state) => state.public.players);

  const cornerCoordinates = pole.cornerPosition?.cornerCoordinates;
  if (!cornerCoordinates) {
    return null;
  }

  const position = cornerToWorldPoint(cornerCoordinates);

  // Assert that power poles must have an owner
  if (!pole.owner) {
    console.error("Power pole missing owner:", pole);
    return null;
  }

  const playerNumber = playersById[pole.owner.playerId]?.number;
  if (!playerNumber) {
    console.error("Player not found for power pole:", pole.owner.playerId);
    return null;
  }

  // Get player's color
  const colorString = getPlayerColor(playerNumber);
  const playerColor = new THREE.Color(colorString);

  return (
    <group>
      <group position={position}>
        {/* Dome (half-sphere) for power pole */}
        <Sphere
          args={[DOME_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
          position={[0, POLE_HEIGHT_Y / 2, 0]}
        >
          <meshToonMaterial
            color={playerColor}
            transparent={isGhost}
            opacity={isGhost ? 0.5 : 1}
          />
        </Sphere>
      </group>

      {/* Straight power lines */}
      {pole.connections?.connectedToIds?.map((connectionId, connectionIndex) => {
        const connectedPole = entitiesById[connectionId];
        const connectedCornerCoordinates = connectedPole?.cornerPosition?.cornerCoordinates;
        if (!connectedPole || !connectedCornerCoordinates) return null;

        // Only render connections where this pole's ID is less than the connected pole's ID
        // to prevent duplicate lines
        return (
          <PowerLine
            key={`line-${pole.id}-${connectionIndex}`}
            start={[position[0], position[1] + LINE_HEIGHT, position[2]]}
            end={[
              cornerToWorldPoint(connectedCornerCoordinates)[0],
              cornerToWorldPoint(connectedCornerCoordinates)[1] + LINE_HEIGHT,
              cornerToWorldPoint(connectedCornerCoordinates)[2],
            ]}
            color={playerColor}
            isGhost={isGhost}
          />
        );
      })}
    </group>
  );
}

// Custom component for power lines using tube geometry
interface PowerLineProps {
  start: [number, number, number];
  end: [number, number, number];
  color: THREE.Color;
  isGhost?: boolean;
}

function PowerLine({ start, end, color, isGhost = false }: PowerLineProps) {
  // Create a path between start and end points
  const path = useMemo(() => {
    const curve = new THREE.LineCurve3(
      new THREE.Vector3(start[0], start[1], start[2]),
      new THREE.Vector3(end[0], end[1], end[2])
    );
    return curve;
  }, [start, end]);

  // Create tube geometry with small radius
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(path, 1, 0.04, 8, false);
  }, [path]);

  return (
    <mesh geometry={tubeGeometry}>
      <meshToonMaterial 
        color={color} 
        transparent={isGhost} 
        opacity={isGhost ? 0.5 : 1}
      />
    </mesh>
  );
}
