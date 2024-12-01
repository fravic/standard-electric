import { useGameStore } from '../../store/gameStore'
import styles from './GameUI.module.css'

export function GameUI() {
  const { resources, selectedState, hoveredState } = useGameStore()

  return (
    <div className={styles.overlay}>
      <div className={styles.resources}>
        <div>Money: ${resources.money.toLocaleString()}</div>
        <div>Supplies: {resources.supplies}</div>
      </div>
      {(selectedState || hoveredState) && (
        <div className={styles.stateInfo}>
          Selected: {selectedState}<br />
          Hovered: {hoveredState}
        </div>
      )}
    </div>
  )
}
