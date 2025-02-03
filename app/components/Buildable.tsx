import React from "react";
import { Box } from "@react-three/drei";
import { PowerPole } from "./PowerSystem/PowerPole";
import { PowerPole as PowerPoleModel } from "../lib/buildables/PowerPole";
import { Buildable as BuildableType } from "../lib/buildables/Buildable";
import * as BuildableService from "../lib/buildables/Buildable";
import { PALETTE } from "@/lib/palette";

interface BuildableProps {
  buildable: BuildableType;
}

export const Buildable: React.FC<BuildableProps> = ({ buildable }) => {
  if (buildable.type === "power_pole") {
    return (
      <PowerPole
        pole={buildable as PowerPoleModel}
        isGhost={buildable.isGhost}
      />
    );
  }

  // TODO: Extract out power plant component
  if (buildable.type === "coal_plant") {
    return (
      <Box
        position={BuildableService.getBuildableWorldPoint(buildable)}
        args={[0.5, 1, 0.5]}
      >
        <meshStandardMaterial
          color={PALETTE.DARK_GREEN}
          transparent={buildable.isGhost}
          opacity={buildable.isGhost ? 0.5 : 1}
        />
      </Box>
    );
  }

  return null;
};
