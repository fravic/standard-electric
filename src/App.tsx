import React, { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import Experience from "./components/Experience";
import { OrbitControls } from "@react-three/drei";
import { FPSCounter } from "./components/FPSCounter";
import { GameUI } from "./components/UI/GameUI";
import { HexDetailsUI } from "./components/HexGrid/HexDetailsUI";
import { useGameStore } from "./store/gameStore";

function App(): JSX.Element {
  const isDebug = useGameStore((state) => state.isDebug);
  const setIsDebug = useGameStore((state) => state.setIsDebug);
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
      const response = await fetch("/hexgrid.json");
      if (response.ok) {
        const jsonData = await response.text();
        importHexGridFromJSON(jsonData);
      } else {
        console.error("Failed to load hexgrid.json");
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
      // E to export hex map to console
      if (isDebug && e.key.toLowerCase() === "e") {
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
      <Canvas
        camera={{
          position: [0, 5, 5],
          fov: 75,
        }}
      >
        <color attach="background" args={["#c1e4ff"]} />
        <OrbitControls makeDefault />
        <Experience />
      </Canvas>
      {isDebug && <FPSCounter />}
      <GameUI />
      <HexDetailsUI />
    </div>
  );
}

export default App;
