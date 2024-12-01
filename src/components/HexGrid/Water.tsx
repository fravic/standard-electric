import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Mesh } from "three";
import vertexShader from "../../shaders/water.vert";
import fragmentShader from "../../shaders/water.frag";

interface WaterProps {
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
}

export function Water({ position, scale, color = "#4444FF" }: WaterProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry
        args={[scale[0], scale[2], 32, 32]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          time: { value: 0 },
          waterColor: { value: new THREE.Color(color) },
        }}
        transparent={true}
      />
    </mesh>
  );
}
