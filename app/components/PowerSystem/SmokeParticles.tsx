import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface SmokeParticlesProps {
  position: [number, number, number];
  count?: number;
  size?: number;
  spread?: number;
  opacity?: number;
  enabled?: boolean;
}

export function SmokeParticles({
  position,
  count = 50,
  size = 0.25,
  spread = 0,
  opacity = 0.4,
  enabled = true,
}: SmokeParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Load multiple smoke textures from blackSmoke folder
  const textures = useLoader(
    THREE.TextureLoader,
    [
      '/public/assets/textures/blackSmoke/blackSmoke01.png',
      '/public/assets/textures/blackSmoke/blackSmoke02.png',
      '/public/assets/textures/blackSmoke/blackSmoke03.png',
      '/public/assets/textures/blackSmoke/blackSmoke04.png',
      '/public/assets/textures/blackSmoke/blackSmoke05.png',
      '/public/assets/textures/blackSmoke/blackSmoke06.png',
      '/public/assets/textures/blackSmoke/blackSmoke07.png',
      '/public/assets/textures/blackSmoke/blackSmoke08.png',
      '/public/assets/textures/blackSmoke/blackSmoke09.png',
      '/public/assets/textures/blackSmoke/blackSmoke10.png',
    ]
  );

  // Texture indices for each particle
  const textureIndicesRef = useRef<Uint8Array>(new Uint8Array(count));

  // Refs to track particle state across frames
  const activeParticlesRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const particleOpacitiesRef = useRef<Float32Array>(new Float32Array(count));

  // Velocity vectors for smooth movement
  const velocitiesRef = useRef<Float32Array>(new Float32Array(count * 3));

  // Initialize particles positions, colors, and velocities
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Initialize positions
      pos[i * 3] = position[0];
      pos[i * 3 + 1] = position[1];
      pos[i * 3 + 2] = position[2];

      // Initialize opacities
      particleOpacitiesRef.current[i] = 0;

      // Initialize velocity vectors (x, y, z)
      velocitiesRef.current[i * 3] = (Math.random() - 0.5) * 0.05;     // x velocity
      velocitiesRef.current[i * 3 + 1] = 0;                           // y velocity (handled separately)
      velocitiesRef.current[i * 3 + 2] = (Math.random() - 0.5) * 0.05; // z velocity

      // Assign a random texture to each particle
      textureIndicesRef.current[i] = Math.floor(Math.random() * textures.length);
    }
    return pos;
  }, [count, position[0], position[1], position[2]]);

  // Create colors array for vertex coloring (RGBA for each particle)
  const colors = useMemo(() => new Float32Array(count * 4), [count]);

  // Animation: particles rise upward over time and fade out
  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    // Spawn new particles if enabled
    if (enabled && activeParticlesRef.current < count) {
      spawnTimerRef.current += delta;
      // Spawn a new particle every 0.1 seconds
      if (spawnTimerRef.current > 0.1) {
        spawnTimerRef.current = 0;

        // Activate a new particle
        const i = activeParticlesRef.current;
        const positionAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;

        // Set position at the origin with some random spread
        positionAttr.setX(i, position[0] + (Math.random() - 0.5) * spread);
        positionAttr.setY(i, position[1] + Math.random() * 0.1);
        positionAttr.setZ(i, position[2] + (Math.random() - 0.5) * spread);

        // Initialize opacity to max value
        particleOpacitiesRef.current[i] = opacity;
        activeParticlesRef.current++;
      }
    }

    // Update active particles
    const positionAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const opacities = particleOpacitiesRef.current;

    // Create a copy of the material for each particle with different opacity
    for (let i = 0; i < activeParticlesRef.current; i++) {
      // Update y position to make particles rise upward
      const currentY = positionAttr.getY(i);
      const yDelta = delta * (0.2 + (currentY - position[1]) * 0.1); // Accelerate as they rise
      positionAttr.setY(i, currentY + yDelta);

      // Fade out opacity over time
      opacities[i] -= delta * 0.1; // Adjust this value to control fade speed

      // If particle has faded out completely, reset it (if enabled)
      if (opacities[i] <= 0) {
        opacities[i] = 0;

        // Only reset if enabled, otherwise just keep it invisible
        if (enabled) {
          // Reset particle to the base position
          positionAttr.setX(i, position[0] + (Math.random() - 0.5) * spread);
          positionAttr.setY(i, position[1]);
          positionAttr.setZ(i, position[2] + (Math.random() - 0.5) * spread);

          // Reset opacity to max
          opacities[i] = opacity;
        }
      }

      // Apply smooth sideways drift based on velocity
      const x = positionAttr.getX(i);
      const z = positionAttr.getZ(i);

      // Get this particle's velocity
      const vx = velocitiesRef.current[i * 3];
      const vz = velocitiesRef.current[i * 3 + 2];

      // Apply velocity over time
      positionAttr.setX(i, x + vx * delta);
      positionAttr.setZ(i, z + vz * delta);
    }

    // Update each particle's color based on its opacity
    const colorAttr = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

    for (let i = 0; i < activeParticlesRef.current; i++) {
      // Set RGB to white/gray and use opacity for alpha channel
      colorAttr.setXYZW(
        i,
        0.6,  // R
        0.6,  // G
        0.6,  // B
        opacities[i]  // A - individual opacity
      );
    }

    // Mark both position and color attributes as needing update
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

  });

  // Choose a random texture for our smoke
  const texture = useMemo(() => {
    // Get a random texture from our loaded textures
    return textures[Math.floor(Math.random() * textures.length)];
  }, [textures]);

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={count}
            array={colors}
            itemSize={4}
          />
        </bufferGeometry>
        <pointsMaterial
          attach="material"
          map={texture}
          size={size}
          sizeAttenuation
          transparent
          vertexColors
          depthWrite={false}
          alphaTest={0.01}
        />
      </points>
    </>
  );
}


