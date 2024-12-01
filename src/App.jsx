import React from "react";
import { Canvas } from "@react-three/fiber";
import Experience from "./components/Experience";
import { OrbitControls } from "@react-three/drei";
import { FPSCounter } from "./components/FPSCounter";
import { useEffect, useState } from "react";

function App() {
  const [isDebug, setIsDebug] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDebug(params.get("debug") === "true");
  }, []);

  return (
    <div className="game-container">
      <div className="game-board">
        <Canvas
          camera={{
            position: [0, 5, 5],
            fov: 75,
          }}
        >
          <color attach="background" args={["#87ceeb"]} />
          <OrbitControls makeDefault />
          <Experience />
        </Canvas>
        {isDebug && <FPSCounter />}
      </div>
    </div>
  );
}

export default App;
