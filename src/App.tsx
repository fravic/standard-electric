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
  const makeNewHexGridFromMapData = useGameStore(
    (state) => state.makeNewHexGridFromMapData
  );
  const importHexGridFromJSON = useGameStore(
    (state) => state.importHexGridFromJSON
  );
  const exportHexGridToJSON = useGameStore(
    (state) => state.exportHexGridToJSON
  );
  const mapDataLoaded = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const loadInitialData = async () => {
      if (params.get("map") === "us") {
        const mapData = await loadUnitedStatesMapData();
        if (mapData) {
          makeNewHexGridFromMapData(mapData);
        }
      } else {
        try {
          const response = await fetch("/hexgrid.json");
          if (response.ok) {
            const jsonData = await response.text();
            importHexGridFromJSON(jsonData);
          } else {
            console.error("Failed to load hexgrid.json");
          }
        } catch (error) {
          console.error("Failed to load hex grid:", error);
        }
      }
      mapDataLoaded.current = true;
    };

    if (!mapDataLoaded.current) {
      loadInitialData();
    }

    setIsDebug(params.get("debug") === "true");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + E to export hex map to console
      if (isDebug && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        const jsonData = exportHexGridToJSON();
        console.log(jsonData);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exportHexGridToJSON, isDebug]);

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
