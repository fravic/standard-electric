import { useState, useEffect } from "react";
import { ShiftingBackground } from "./ShiftingBackground";
import { MILLISECONDS_PER_IN_GAME_HOUR } from "@/lib/constants";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Scanline } from "@react-three/postprocessing";
import { KernelSize, BlendFunction } from "postprocessing";

export function HomeBackgroundWrapper() {
  // Simulate the day cycle by cycling through hours
  const [hour, setHour] = useState(10); // Start with a nice daytime hour

  // Simulate the game timer effect for visual interest
  useEffect(() => {
    const interval = setInterval(() => {
      setHour((prev) => (prev + 1) % 24);
    }, MILLISECONDS_PER_IN_GAME_HOUR);

    return () => clearInterval(interval);
  }, []);

  return (
    <Canvas
      style={{
        width: "100%",
        height: "100vh",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: -1,
      }}
      camera={{
        position: [0, 0, 5],
        fov: 75,
      }}
    >
      <color attach="background" args={["#102040"]} />
      <OrbitControls enabled={false} />
      <directionalLight position={[0, 5, 5]} intensity={1} />
      <ambientLight intensity={1.5} />
      <ShiftingBackground hour={hour} />
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          kernelSize={KernelSize.MEDIUM}
        />
        <Scanline blendFunction={BlendFunction.OVERLAY} density={1.25} opacity={0.1} />
      </EffectComposer>
    </Canvas>
  );
}
