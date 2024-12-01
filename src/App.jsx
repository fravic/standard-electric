import React from "react";
import { Canvas } from "@react-three/fiber";
import Experience from "./components/Experience";
import { OrbitControls } from "@react-three/drei";

function App() {
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
      </div>
    </div>
  );
}

export default App;
