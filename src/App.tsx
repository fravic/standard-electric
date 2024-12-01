import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Experience from "./components/Experience";
import { OrbitControls } from "@react-three/drei";
import { FPSCounter } from "./components/FPSCounter";
import { useGameStore } from "./store/gameStore";
import { loadUnitedStatesMapData } from "./lib/unitedStatesGeoUtils";

function App(): JSX.Element {
  const isDebug = useGameStore((state) => state.isDebug);
  const setIsDebug = useGameStore((state) => state.setIsDebug);
  const loadHexGrid = useGameStore((state) => state.loadHexGrid);

  useEffect(() => {
    const loadMapData = async () => {
      const mapData = await loadUnitedStatesMapData();
      if (mapData) {
        loadHexGrid(mapData);
      }
    };
    loadMapData();

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
