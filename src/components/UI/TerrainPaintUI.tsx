import React from "react";
import { TerrainType, Population } from "../../lib/HexCell";
import { GameContext } from "@/actor/game.context";

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
};

export const TerrainPaintUI: React.FC = () => {
  const isDebug = GameContext.useSelector((state) => state.public.isDebug);
  const isPaintbrushMode = GameContext.useSelector(
    (state) => state.public.mapBuilder.isPaintbrushMode
  );
  const selectedTerrainType = GameContext.useSelector(
    (state) => state.public.mapBuilder.selectedTerrainType
  );
  const selectedPopulation = GameContext.useSelector(
    (state) => state.public.mapBuilder.selectedPopulation
  );
  const setPaintbrushMode = GameContext.useAction(
    (state) => state.public.setPaintbrushMode
  );
  const setSelectedTerrainType = GameContext.useAction(
    (state) => state.public.setSelectedTerrainType
  );
  const setSelectedPopulation = GameContext.useAction(
    (state) => state.public.setSelectedPopulation
  );

  if (!isDebug) return null;

  return (
    <div style={styles.container}>
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={isPaintbrushMode}
            onChange={(e) => setPaintbrushMode(e.target.checked)}
          />
          <span style={styles.label}>Paintbrush Mode</span>
        </label>
      </div>
      {isPaintbrushMode && (
        <>
          <div style={styles.section}>
            <span style={styles.label}>Terrain</span>
            <div style={styles.buttonGrid}>
              {Object.values(TerrainType).map((type) => (
                <button
                  key={type}
                  style={{
                    ...styles.button,
                    ...(selectedTerrainType === type
                      ? styles.activeButton
                      : {}),
                  }}
                  onClick={() => {
                    setSelectedTerrainType(
                      selectedTerrainType === type ? null : type
                    );
                    setSelectedPopulation(null);
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.section}>
            <span style={styles.label}>Population</span>
            <div style={styles.buttonGrid}>
              {Object.entries(Population).map(
                ([name, value]) =>
                  typeof value === "number" && (
                    <button
                      key={name}
                      style={{
                        ...styles.button,
                        ...(selectedPopulation === value
                          ? styles.activeButton
                          : {}),
                      }}
                      onClick={() => {
                        setSelectedPopulation(
                          selectedPopulation === value ? null : value
                        );
                        setSelectedTerrainType(null);
                      }}
                    >
                      {name}
                    </button>
                  )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
