import React from "react";
import { useSelector } from "@xstate/store/react";
import { TerrainType, Population } from "../../lib/HexCell";
import { clientStore } from "@/lib/clientState";
import { GameContext } from "@/actor/game.context";
import { coordinatesToString } from "@/lib/coordinates/HexCoordinates";

const styles = {
  container: {
    position: "fixed" as const,
    top: "120px", // Position below HexDetailsUI
    right: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "white",
    padding: "10px",
    borderRadius: "5px",
    fontFamily: "monospace",
    fontSize: "14px",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },
  label: {
    fontWeight: "bold" as const,
  },
  button: {
    backgroundColor: "#4CAF50",
    border: "none",
    color: "white",
    padding: "4px 8px",
    fontSize: "12px",
    borderRadius: "3px",
    cursor: "pointer",
  },
  activeButton: {
    backgroundColor: "#45a049",
  },
  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4px",
    marginTop: "4px",
  },
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  exportButton: {
    backgroundColor: "#2196F3",
    marginTop: "10px",
    padding: "8px 16px",
    fontSize: "14px",
    width: "100%",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "white",
    padding: "4px 8px",
    borderRadius: "3px",
    fontSize: "12px",
  },
};

export const TerrainPaintUI: React.FC = () => {
  const isPaintbrushMode = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.isPaintbrushMode
  );
  const selectedTerrainType = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.selectedTerrainType
  );
  const selectedPopulation = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.selectedPopulation
  );
  const selectedHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.selectedHexCoordinates
  );
  const hexGrid = GameContext.useSelector((state) => state.public.hexGrid);
  const sendGameEvent = GameContext.useSend();

  // Get the current cell's city name
  const currentCityName = selectedHexCoordinates
    ? hexGrid.cellsByHexCoordinates[coordinatesToString(selectedHexCoordinates)]
        ?.cityName || ""
    : "";

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(hexGrid, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hexgrid.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCityNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedHexCoordinates) {
      sendGameEvent({
        type: "UPDATE_HEX_CITY",
        coordinates: selectedHexCoordinates,
        cityName: e.target.value.trim() || null,
      });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <div>
          <span style={styles.label}>Paintbrush Mode</span>
          <button
            style={{
              ...styles.button,
              ...(isPaintbrushMode ? styles.activeButton : {}),
              marginLeft: "8px",
            }}
            onClick={() =>
              clientStore.send({
                type: "setPaintbrushMode",
                enabled: !isPaintbrushMode,
              })
            }
          >
            {isPaintbrushMode ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Terrain Type</span>
        <div style={styles.buttonGrid}>
          {Object.values(TerrainType).map((terrainType) => (
            <button
              key={terrainType}
              style={{
                ...styles.button,
                ...(selectedTerrainType === terrainType
                  ? styles.activeButton
                  : {}),
              }}
              onClick={() =>
                clientStore.send({
                  type: "setSelectedTerrainType",
                  terrainType:
                    selectedTerrainType === terrainType ? null : terrainType,
                })
              }
            >
              {terrainType}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Population</span>
        <div style={styles.buttonGrid}>
          {Object.values(Population)
            .filter((value) => typeof value === "number")
            .map((population) => (
              <button
                key={population}
                style={{
                  ...styles.button,
                  ...(selectedPopulation === population
                    ? styles.activeButton
                    : {}),
                }}
                onClick={() =>
                  clientStore.send({
                    type: "setSelectedPopulation",
                    population:
                      selectedPopulation === population ? null : population,
                  })
                }
              >
                {Population[population]}
              </button>
            ))}
        </div>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>City Name</span>
        <input
          type="text"
          value={currentCityName}
          onChange={handleCityNameChange}
          style={styles.input}
          placeholder="Enter city name..."
          disabled={!selectedHexCoordinates}
        />
      </div>

      <button style={styles.exportButton} onClick={handleExport}>
        Export Map
      </button>
    </div>
  );
};
