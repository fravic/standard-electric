import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF, QuadraticBezierLine } from "@react-three/drei";
import { PowerPole as PowerPoleModel } from "../../lib/buildables/PowerPole";
import { cloneAndPrepareMesh } from "../../lib/gltfUtils";
import { GameContext } from "@/actor/game.context";
import { getBuildableWorldPoint } from "@/lib/buildables/Buildable";

interface PowerPoleProps {
  pole: PowerPoleModel;
  isGhost?: boolean;
}

const POLE_HEIGHT_Y = 0.3;
const POWER_LINE_DROOP_Y = 0.2; // How much the power line droops

export function PowerPole({ pole, isGhost = false }: PowerPoleProps) {
  const powerPoles = GameContext.useSelector((state) =>
    state.public.buildables.filter(
      (b): b is PowerPoleModel => b.type === "power_pole"
    )
  );

  const position = getBuildableWorldPoint(pole);
  const { nodes } = useGLTF("/models/Logistico.glb");

  const clonedPole = useMemo(() => {
    return cloneAndPrepareMesh(nodes.power_pole as THREE.Group, {
      scale: [0.5, 0.5, 0.5],
      isGhost,
      position: [0, 0, 0],
    });
  }, [nodes.power_pole, isGhost]);

  return (
    <group>
      <group position={position}>
        <primitive object={clonedPole} />
      </group>

      {/* Power lines with curves */}
      {pole.connectedToIds.map((connectionId, connectionIndex) => {
        const connectedPole = powerPoles.find((p) => p.id === connectionId);
        if (!connectedPole) return null;

        const start = new THREE.Vector3(
          position[0],
          position[1] + POLE_HEIGHT_Y,
          position[2]
        );
        const end = new THREE.Vector3(
          getBuildableWorldPoint(connectedPole)[0],
          getBuildableWorldPoint(connectedPole)[1] + POLE_HEIGHT_Y,
          getBuildableWorldPoint(connectedPole)[2]
        );

        // Calculate middle control point for the curve
        const mid = new THREE.Vector3()
          .addVectors(start, end)
          .multiplyScalar(0.5);
        mid.y -= POWER_LINE_DROOP_Y; // Pull down the middle point to create sag

        return (
          <QuadraticBezierLine
            key={`line-${pole.id}-${connectionIndex}`}
            start={start}
            end={end}
            mid={mid}
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

// Preload the model
useGLTF.preload("/models/Logistico.glb");
