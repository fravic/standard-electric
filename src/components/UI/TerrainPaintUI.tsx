import React from "react";
import { TerrainType } from "../../lib/HexCell";
import { useGameStore } from "../../store/gameStore";

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
};

export const TerrainPaintUI: React.FC = () => {
  const isDebug = useGameStore((state) => state.isDebug);
  const isPaintbrushMode = useGameStore(
    (state) => state.mapBuilder.isPaintbrushMode
  );
  const selectedTerrainType = useGameStore(
    (state) => state.mapBuilder.selectedTerrainType
  );
  const setPaintbrushMode = useGameStore((state) => state.setPaintbrushMode);
  const setSelectedTerrainType = useGameStore(
    (state) => state.setSelectedTerrainType
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
        <div style={styles.buttonGrid}>
          {Object.values(TerrainType).map((type) => (
            <button
              key={type}
              style={{
                ...styles.button,
                ...(selectedTerrainType === type ? styles.activeButton : {}),
              }}
              onClick={() => setSelectedTerrainType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
