import React, { useEffect, useRef } from "react";
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
  const exportHexGridToJSON = useGameStore(
    (state) => state.exportHexGridToJSON
  );
  const mapDataLoaded = useRef(false);

  useEffect(() => {
    const loadMapData = async () => {
      const mapData = await loadUnitedStatesMapData();
      if (mapData) {
        loadHexGrid(mapData);
      }
    };
    if (!mapDataLoaded.current) {
      loadMapData();
      mapDataLoaded.current = true;
    }

    const params = new URLSearchParams(window.location.search);
    setIsDebug(params.get("debug") === "true");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + E to export hex map to console
      if (isDebug && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        exportHexGridToJSON();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exportHexGridToJSON]);

  return (
    <div className="game-container">
      <div className="game-board">
        <Canvas
          camera={{
            position: [0, 5, 5],
            fov: 75,
          }}
        >
          <color attach="background" args={["#667FFF"]} />
          <OrbitControls makeDefault />
          <Experience />
        </Canvas>
        {isDebug && <FPSCounter />}
      </div>
    </div>
  );
}

export default App;
