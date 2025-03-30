import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface ToonModelRendererProps {
  model: THREE.Object3D;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  isGhost?: boolean;
  playerColor?: string;
}

export function ToonModelRenderer({
  model,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  isGhost = false,
  playerColor,
}: ToonModelRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Object3D>();

  useEffect(() => {
    if (!model) return;

    // Store reference to the model
    modelRef.current = model;

    // Apply toon materials to all meshes in the model
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          // Handle multi-material meshes
          child.material = child.material.map((mat) => {
            // Check if this is a PlayerColor material
            const isPlayerColorMaterial = mat.name === "PlayerColor";
            // Use player color or original color
            const materialColor =
              isPlayerColorMaterial && playerColor
                ? new THREE.Color(playerColor)
                : mat.color || new THREE.Color();

            // Create new toon material with appropriate color
            const toonMat = new THREE.MeshToonMaterial({
              color: materialColor,
              transparent: isGhost,
              opacity: isGhost ? 0.5 : 1,
              // Preserve original textures
              map: mat.map,
              normalMap: mat.normalMap,
            });
            return toonMat;
          });
        } else {
          // Handle single material meshes
          // Check if this is a PlayerColor material
          const isPlayerColorMaterial = child.material.name === "PlayerColor";
          // Use player color or original color
          const materialColor =
            isPlayerColorMaterial && playerColor
              ? new THREE.Color(playerColor)
              : child.material.color || new THREE.Color();

          // Create new toon material with appropriate color
          const toonMat = new THREE.MeshToonMaterial({
            color: materialColor,
            transparent: isGhost,
            opacity: isGhost ? 0.5 : 1,
            // Preserve original textures
            map: child.material.map,
            normalMap: child.material.normalMap,
          });
          child.material = toonMat;
        }
      }
    });
  }, [model, isGhost]);

  return (
    <group
      ref={groupRef}
      position={position as [number, number, number]}
      rotation={rotation as [number, number, number]}
      scale={typeof scale === "number" ? [scale, scale, scale] : scale}
    >
      {model && <primitive object={model} />}
    </group>
  );
}
