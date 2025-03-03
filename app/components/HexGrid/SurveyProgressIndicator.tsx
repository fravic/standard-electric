import React, { useMemo } from "react";
import * as THREE from "three";
import { Billboard, Text } from "@react-three/drei";
import { HexCell, getCenterPoint } from "@/lib/HexCell";
import {
  coordinatesToString,
  HexCoordinates,
} from "@/lib/coordinates/HexCoordinates";
import {
  SurveyResult,
  isSurveyComplete,
  SURVEY_DURATION_TICKS,
} from "@/lib/surveys";
import { HexMetrics } from "@/lib/HexMetrics";
import { UI_COLORS } from "@/lib/palette";

interface SurveyProgressIndicatorProps {
  cells: HexCell[];
  surveyResultByHexCell: Record<string, SurveyResult>;
  currentTick: number;
}

export const SurveyProgressIndicator: React.FC<
  SurveyProgressIndicatorProps
> = ({ cells, surveyResultByHexCell, currentTick }) => {
  // Find cells that are currently being surveyed
  const activeSurveys = useMemo(() => {
    const result: { cell: HexCell; progress: number }[] = [];

    cells.forEach((cell) => {
      const coordString = coordinatesToString(cell.coordinates);
      const survey = surveyResultByHexCell[coordString];

      if (survey && !isSurveyComplete(survey.surveyStartTick, currentTick)) {
        // Calculate progress (0 to 1)
        const elapsedTicks = currentTick - survey.surveyStartTick;
        const progress = Math.min(elapsedTicks / SURVEY_DURATION_TICKS, 1);

        result.push({ cell, progress });
      }
    });

    return result;
  }, [cells, surveyResultByHexCell, currentTick]);

  // If no active surveys, don't render anything
  if (activeSurveys.length === 0) {
    return null;
  }

  return (
    <group>
      {activeSurveys.map(({ cell, progress }) => (
        <SurveyProgressBar
          key={coordinatesToString(cell.coordinates)}
          cell={cell}
          progress={progress}
        />
      ))}
    </group>
  );
};

interface SurveyProgressBarProps {
  cell: HexCell;
  progress: number;
}

const SurveyProgressBar: React.FC<SurveyProgressBarProps> = ({
  cell,
  progress,
}) => {
  const center = getCenterPoint(cell);
  const barWidth = HexMetrics.outerRadius * 1.2;
  const barHeight = 0.2;
  const yOffset = 0.3; // Height above the hex cell

  return (
    <group position={[center[0], center[1] + yOffset, center[2]]}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {/* Background bar */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[barWidth, barHeight]} />
          <meshBasicMaterial color="#333333" transparent opacity={0.7} />
        </mesh>

        {/* Progress fill */}
        <mesh
          position={[((progress - 1) * barWidth) / 2, 0, 0.01]}
          scale={[progress, 1, 1]}
        >
          <planeGeometry args={[barWidth, barHeight]} />
          <meshBasicMaterial
            color={UI_COLORS.PRIMARY}
            transparent
            opacity={0.9}
          />
        </mesh>
      </Billboard>
    </group>
  );
};
