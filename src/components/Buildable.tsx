import React from "react";
import { Box } from "@react-three/drei";
import { PowerPole } from "./PowerSystem/PowerPole";
import { PowerPole as PowerPoleModel } from "../lib/PowerSystem";
import { CoalPlant as CoalPlantModel } from "../lib/CoalPlant";
import type { Buildable as BuildableType } from "../lib/Buildable";

interface BuildableProps {
  buildable: BuildableType;
}

export const Buildable: React.FC<BuildableProps> = ({ buildable }) => {
  if (buildable.type === "power_pole" && buildable.cornerCoordinates) {
    const pole =
      buildable instanceof PowerPoleModel
        ? buildable
        : new PowerPoleModel(
            buildable.id,
            buildable.cornerCoordinates,
            buildable.isGhost
          );
    return <PowerPole pole={pole} isGhost={buildable.isGhost} />;
  }

  if (buildable.type === "coal_plant" && buildable.coordinates) {
    const plant =
      buildable instanceof CoalPlantModel
        ? buildable
        : new CoalPlantModel(
            buildable.id,
            buildable.coordinates,
            buildable.isGhost
          );
    const point = plant.getWorldPoint();
    return (
      <Box position={point} args={[0.5, 1, 0.5]}>
        <meshStandardMaterial
          color="#666666"
          transparent={buildable.isGhost}
          opacity={buildable.isGhost ? 0.5 : 1}
        />
      </Box>
    );
  }

  return null;
};
