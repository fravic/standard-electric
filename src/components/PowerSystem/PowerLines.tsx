import { useGameStore } from "../../store/gameStore";
import { PowerPole } from "../../lib/PowerSystem";
import { Line, Sphere, Text } from "@react-three/drei";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { CornerPosition } from "../../lib/CornerCoordinates";

interface PowerLinesProps {
  chunkCells: HexCoordinates[];
}

export function PowerLines({ chunkCells }: PowerLinesProps) {
  const powerPoles = useGameStore((state) => state.powerPoles);
  const isDebug = useGameStore((state) => state.isDebug);

  // Filter power poles that belong to this chunk
  const chunkPowerPoles = powerPoles.filter((pole) =>
    chunkCells.some(
      (cell) => cell.toString() === pole.cornerCoordinates.hex.toString()
    )
  );

  return (
    <group>
      {/* Render power poles */}
      {chunkPowerPoles.map((pole) => {
        const position = pole.getWorldPoint();
        return (
          <group key={`pole-${pole.cornerCoordinates.toString()}`}>
            <Sphere position={position} args={[0.1]}>
              <meshStandardMaterial color="#666666" />
            </Sphere>
            {isDebug && (
              <Text
                position={[position[0], position[1] + 0.3, position[2]]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.15}
                color="black"
                anchorX="center"
                anchorY="middle"
                fillOpacity={0.8}
              >
                {`${pole.cornerCoordinates.hex.toString()}-${
                  CornerPosition[pole.cornerCoordinates.position]
                }`}
              </Text>
            )}
          </group>
        );
      })}

      {/* Render power lines */}
      {chunkPowerPoles.map((pole) =>
        pole.connectedToIds.map((connectionId, connectionIndex) => {
          const connectionPole = powerPoles.find((p) => p.id === connectionId);
          if (!connectionPole) return null;
          return (
            <Line
              key={`line-${pole.cornerCoordinates.toString()}-${connectionIndex}`}
              points={[pole.getWorldPoint(), connectionPole.getWorldPoint()]}
              color="#666666"
              lineWidth={1}
            />
          );
        })
      )}
    </group>
  );
}
