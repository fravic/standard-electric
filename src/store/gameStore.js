import { create } from 'zustand'

export const useGameStore = create((set) => ({
  // Game state
  selectedState: null,
  hoveredState: null,
  resources: {
    money: 1000000,
    supplies: 100
  },
  
  // Actions
  setSelectedState: (state) => set({ selectedState: state }),
  setHoveredState: (state) => set({ hoveredState: state }),
  addResources: (resources) => set((state) => ({
    resources: {
      ...state.resources,
      ...Object.fromEntries(
        Object.entries(resources).map(([key, value]) => [
          key,
          (state.resources[key] || 0) + value
        ])
      )
    }
  }))
}))
