import { create } from "zustand";

interface GameState {
  selectedState: string | null;
  hoveredState: string | null;
  setSelectedState: (state: string | null) => void;
  setHoveredState: (state: string | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  selectedState: null,
  hoveredState: null,
  setSelectedState: (state) => set({ selectedState: state }),
  setHoveredState: (state) => set({ hoveredState: state }),
}));
