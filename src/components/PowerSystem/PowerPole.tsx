import React from "react";
import { Sphere, Line } from "@react-three/drei";
import { PowerPole as PowerPoleModel } from "../../lib/PowerSystem";
import { useGameStore } from "../../store/gameStore";

interface PowerPoleProps {
  pole: PowerPoleModel;
  isGhost?: boolean;
}

export function PowerPole({ pole, isGhost = false }: PowerPoleProps) {
  const powerPoles = useGameStore((state) => state.powerPoles);
  const position = pole.getWorldPoint();

  return (
    <group>
      <Sphere position={position} args={[0.1]}>
        <meshStandardMaterial
          color="#666666"
          transparent={isGhost}
          opacity={isGhost ? 0.5 : 1}
        />
      </Sphere>

      {/* Power lines */}
      {pole.connectedToIds.map((connectionId, connectionIndex) => {
        const connectionPole = powerPoles.find((p) => p.id === connectionId);
        if (!connectionPole) return null;
        return (
          <Line
            key={`line-${pole.id}-${connectionIndex}`}
            points={[position, connectionPole.getWorldPoint()]}
            color="#666666"
            lineWidth={1}
            transparent={isGhost}
            opacity={isGhost ? 0.5 : 1}
          />
        );
      })}
    </group>
  );
}
