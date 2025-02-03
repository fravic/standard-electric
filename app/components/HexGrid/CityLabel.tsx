import React from "react";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { HexCell } from "@/lib/HexCell";
import { getCenterPoint } from "@/lib/HexCell";
import { coordinatesToString } from "@/lib/coordinates/HexCoordinates";

interface CityLabelProps {
  cell: HexCell;
}

export function CityLabel({ cell }: CityLabelProps) {
  if (!cell.cityName) return null;

  const [x, y, z] = getCenterPoint(cell);
  const labelHeight = 1;

  return (
    <group position={[x, 0, z]}>
      {/* Vertical connector using a thin rectangular mesh */}
      <mesh position={[0, labelHeight / 2, 0]}>
        <boxGeometry args={[0.02, labelHeight, 0.02]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.5}
          depthTest={false}
        />
      </mesh>

      {/* Label */}
      <group position={[0, labelHeight, 0]}>
        <Billboard>
          {/* Background panel */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[0.8, 0.3]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.7}
              depthTest={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* City name text */}
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.12}
            color="white"
            anchorX="center"
            anchorY="middle"
            renderOrder={1}
          >
            {cell.cityName}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}
