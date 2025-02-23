import React from "react";
import { useSelector } from "@xstate/store/react";
import { TerrainType, Population } from "../../lib/HexCell";
import { clientStore } from "@/lib/clientState";
import { GameContext } from "@/actor/game.context";
import { useMapEditor } from "@/routes/mapEditor";
import { coordinatesToString } from "@/lib/coordinates/HexCoordinates";
import { UI_COLORS } from "@/lib/palette";
import { TextInput } from "./TextInput";
import { Card } from "./Card";

const styles = {
  container: {
    position: "fixed" as const,
    top: "200px",
    right: "10px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    zIndex: 1000,
  },
  label: {
    fontWeight: "bold" as const,
  },
  button: {
    backgroundColor: UI_COLORS.PRIMARY,
    border: "none",
    color: UI_COLORS.TEXT_LIGHT,
    padding: "4px 8px",
    borderRadius: "3px",
    cursor: "pointer",
  },
  activeButton: {
    backgroundColor: UI_COLORS.PRIMARY_DARK,
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
    backgroundColor: UI_COLORS.PRIMARY,
    color: UI_COLORS.TEXT_LIGHT,
    marginTop: "10px",
    padding: "8px 16px",
    width: "100%",
  },
  input: {
    backgroundColor: UI_COLORS.PRIMARY_DARK,
    border: `1px solid ${UI_COLORS.PRIMARY_DARK}`,
    color: UI_COLORS.TEXT_LIGHT,
    padding: "4px 8px",
    borderRadius: "3px",
  },
};

export const TerrainPaintUI: React.FC = () => {
  const isPaintbrushMode = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.isPaintbrushMode
  );
  const isDebug = useSelector(clientStore, (state) => state.context.isDebug);
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
  const { updateRegionName, updateHexCity } = useMapEditor();

  if (!isDebug) return null;

  const selectedCell = selectedHexCoordinates
    ? hexGrid.cellsByHexCoordinates[coordinatesToString(selectedHexCoordinates)]
    : null;

  const currentCityName = selectedCell?.cityName || "";
  const currentRegionName = selectedCell?.regionName || "";

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
      const value = e.target.value;
      updateHexCity(selectedHexCoordinates, value || null);
    }
  };

  const handleRegionNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedHexCoordinates) {
      const value = e.target.value;
      updateRegionName(selectedHexCoordinates, value || null);
    }
  };

  const handleClearRegion = () => {
    if (selectedHexCoordinates) {
      updateRegionName(selectedHexCoordinates, null);
    }
  };

  return (
    <Card style={styles.container}>
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
        <h4>Terrain Type</h4>
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
        <h4>Population</h4>
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
        <h4>City Name</h4>
        <TextInput
          value={currentCityName}
          onChange={handleCityNameChange}
          placeholder="Enter city name..."
          disabled={!selectedHexCoordinates}
          style={{ padding: "4px 8px" }}
        />
      </div>

      <div style={styles.section}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <h4>Region Name</h4>
          <button
            style={{
              ...styles.button,
              padding: "2px 6px",
              fontSize: "12px",
            }}
            onClick={handleClearRegion}
            disabled={!selectedHexCoordinates || !currentRegionName}
          >
            Clear
          </button>
        </div>
        <TextInput
          value={currentRegionName}
          onChange={handleRegionNameChange}
          placeholder="Enter region name..."
          disabled={!selectedHexCoordinates}
          style={{ padding: "4px 8px" }}
        />
      </div>

      <button style={styles.exportButton} onClick={handleExport}>
        Export Map
      </button>
    </Card>
  );
};
