import React, { useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// Import the necessary classes from three.quarks
// We'll use type assertions where needed to bypass TypeScript checking issues
import { ParticleSystem, BatchedRenderer, ConstantValue, IntervalValue, RenderMode, PointEmitter, ForceOverLife, ColorOverLife, ColorRange, Gradient, Vector3 } from 'three.quarks';

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
  spread = 0.5,
  opacity = 0.4,
  enabled = true,
}: SmokeParticlesProps) {
  // Create refs to hold our particle system and renderer
  const groupRef = useRef<THREE.Group>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const batchRendererRef = useRef<BatchedRenderer | null>(null);

  // Load a smoke texture
  const smokeTexture = useLoader(
    THREE.TextureLoader,
    '/public/assets/textures/blackSmoke/blackSmoke01.png'
  );

  // Create and set up particle system
  useEffect(() => {
    if (!smokeTexture) return;

    // Create a new batch renderer
    const batchRenderer = new BatchedRenderer();
    batchRendererRef.current = batchRenderer;

    // Create the smoke particle system with type assertion to bypass TS errors
    const smokeSystem = new ParticleSystem({
      // Basic settings
      duration: -1, // Continuous
      looping: true,
      startLife: new IntervalValue(1.5, 2.5),
      startSpeed: new ConstantValue(0),
      startSize: new IntervalValue(size * 0.2, size),
      worldSpace: true,
      emissionOverTime: new ConstantValue(enabled ? count / 4 : 0),
      material: new THREE.MeshBasicMaterial({
        map: smokeTexture,
        transparent: true,
        depthWrite: false,
        opacity: opacity,
        blending: THREE.NormalBlending
      }),
      renderMode: RenderMode.BillBoard
    });
    particleSystemRef.current = smokeSystem;
    smokeSystem.emitterShape = new PointEmitter();
    smokeSystem.emitter.position.set(position[0], position[1], position[2]);
    smokeSystem.addBehavior(new ForceOverLife(new IntervalValue(-0.075, 0.075), new ConstantValue(0.4), new IntervalValue(-0.075, 0.075)));

    const fadeGradient = new Gradient(
      // Color keyframes - each is [Vector3(r,g,b), timePoint]
      // Contant white color
      [
        [new Vector3(1, 1, 1), 0], // White at start
        [new Vector3(1, 1, 1), 1], // White at end
      ],
      // Alpha keyframes - each is [alphaValue, timePoint]
      [
        [0, 0],       // Start transparent (alpha = 0) at t = 0
        [1, 0.1],     // Quickly fade in to full opacity at t = 0.1 (10% of lifetime)
        [1, 0.3],     // Stay at full opacity until t = 0.3 (30% of lifetime)
        [0, 1],       // Slowly fade out to transparent by t = 1 (end of lifetime)
      ]
    );

    smokeSystem.addBehavior(new ColorOverLife(fadeGradient));

    // Add to renderer
    batchRenderer.addSystem(smokeSystem);

    // Add to scene
    if (groupRef.current) {
      groupRef.current.add(smokeSystem.emitter);
      groupRef.current.add(batchRenderer);
    }

    return () => {
      // Cleanup
      if (smokeSystem.emitter.parent) {
        smokeSystem.emitter.parent.remove(smokeSystem.emitter);
      }
      if (batchRenderer.parent) {
        batchRenderer.parent.remove(batchRenderer);
      }
    };
  }, [smokeTexture, position[0], position[1], position[2], count, size, opacity, enabled]);

  useFrame((_, delta) => {
    if (!particleSystemRef.current || !batchRendererRef.current) return;
    batchRendererRef.current.update(delta);
  });

  return <group ref={groupRef} />;
}


