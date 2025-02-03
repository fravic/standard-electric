// Terrain Colors
export const TERRAIN_COLORS = {
  FOREST: "#2D5A27",
  PLAINS: "#90A955",
  MOUNTAINS: "#6B705C",
  DESERT: "#E6C229",
  WATER: "#1E88E5",
} as const;

// Water Colors
export const WATER_COLORS = {
  DEEP: "#C1E4FF",
  SHALLOW: "#D3ECFF",
  BACKGROUND: "#C1E4FF", // Sky/background color
} as const;

// Building Colors
export const BUILDING_COLORS = {
  WALL: "#A0A0A0",
  ROOF: "#808080",
  WINDOW_DAY: "#4A90E2",
  WINDOW_NIGHT: "#FFD700",
  BASE: "#FFFFFF",
} as const;

// Nature Colors
export const NATURE_COLORS = {
  TREE_TRUNK: "#8B4513",
  TREE_LEAVES: "#228B22",
} as const;

// UI Colors
export const UI_COLORS = {
  PRIMARY: "#4CAF50",
  PRIMARY_DARK: "#45A049",
  SECONDARY: "#2196F3",
  DISABLED: "#CCCCCC",
  BACKGROUND_LIGHT: "#F1F1F1",
  TEXT: "#000000",
  PANEL_BACKGROUND: "rgba(0, 0, 0, 0.7)",
  TEXT_LIGHT: "#FFFFFF",
} as const;

// Infrastructure Colors
export const INFRASTRUCTURE_COLORS = {
  POWER_POLE: "#666666",
} as const;

// Night Colors for gradients
export const NIGHT_COLORS = {
  SKY_INNER: "rgba(0, 0, 50, 0.3)",
  SKY_OUTER: "rgba(0, 0, 50, 0.6)",
} as const;

// Day Colors for gradients
export const DAY_COLORS = {
  SKY_INNER: "rgba(255, 255, 200, 0.3)",
  SKY_OUTER: "rgba(255, 255, 200, 0)",
} as const;
