import React, { useCallback, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { debounce } from "lodash";
import { useSelector } from "@xstate/store/react";

import {
  coordinatesToString,
  fromWorldPoint,
  HexCoordinates,
} from "@/lib/coordinates/HexCoordinates";
import {
  HexCell,
  Population,
  getColorWithExplorationStatus,
  getCenterPoint,
  isUnderwater,
} from "@/lib/HexCell";
import { HexMetrics } from "@/lib/HexMetrics";
import { clientStore } from "@/lib/clientState";
import { CityLabel } from "./CityLabel";
import { HexGridDecorations } from "./HexGridDecorations";
import { PALETTE } from "@/lib/palette";

// Custom shader to create the hex outlines
const hexOutlineVertexShader = `
  varying vec2 vUv;
  varying vec3 vColor;
  
  attribute vec3 color;
  
  void main() {
    vUv = uv;
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const hexOutlineFragmentShader = `
  uniform vec3 outlineColor;
  uniform float outlineWidth;
  uniform float outlineOpacity;
  
  varying vec2 vUv;
  varying vec3 vColor;
  
  float getDistanceToHexEdge(vec2 uv) {
    // Convert from UV space [0,1] to centered [-0.5,0.5] space
    vec2 p = uv - 0.5;
    
    // For a regular hexagon in UV space
    // Calculate distance to edge using hexagon formula
    vec2 q = abs(p);
    float d = max(q.x * 0.866025 + q.y * 0.5, q.y);
    
    // Normalize distance - 0.5 is at the edge of the hex
    return d / 0.5;
  }
  
  void main() {
    float dist = getDistanceToHexEdge(vUv);
    
    // Create a hard-edged outline using a narrow range step function
    float edgeWidth = outlineWidth;
    float innerEdge = 1.0 - edgeWidth;
    float outerEdge = 1.0;
    
    // Sharp transition between cell color and outline
    float edgeIntensity = 0.0;
    if (dist >= innerEdge && dist <= outerEdge) {
      edgeIntensity = 1.0;
    }
    
    // For outlines, use outline color at outline opacity
    // For interior, use cell color but with zero opacity (transparent)
    if (edgeIntensity > 0.0) {
      // This is part of the outline
      gl_FragColor = vec4(outlineColor, outlineOpacity);
    } else {
      // This is the interior - make it transparent
      gl_FragColor = vec4(vColor, 0.0);
    }
  }
`;

interface HexGridTerrainProps {
  cells: HexCell[];
  onClick: (event: ThreeEvent<MouseEvent | PointerEvent>) => void;
  onHover: (event: ThreeEvent<PointerEvent>) => void;
  onPointerLeave: () => void;
  onUpdateCell?: (coordinates: HexCoordinates, updates: Partial<HexCell>) => void;
  debug?: boolean;
  surveyedHexCoords: Set<string>;
}

const GRID_OPACITY = 0.3;
const GRID_THICKNESS = 0.16; // Controls width of the outline in shader

export const HexGridTerrain = React.memo(function HexGridTerrain({
  cells,
  onClick,
  onHover,
  onPointerLeave,
  onUpdateCell,
  debug = false,
  surveyedHexCoords,
}: HexGridTerrainProps) {
  const isPaintbrushMode = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.isPaintbrushMode
  );
  const selectedTerrainType = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.selectedTerrainType
  );
  const selectedPopulation = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.selectedPopulation
  );

  const debouncedOnHover = useMemo(() => debounce(onHover, 50, { maxWait: 50 }), [onHover]);

  React.useEffect(() => {
    return () => {
      if (debouncedOnHover) {
        debouncedOnHover.cancel();
      }
    };
  }, [debouncedOnHover]);

  const paintCell = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (
        isPaintbrushMode &&
        (selectedTerrainType || selectedPopulation !== null) &&
        onUpdateCell
      ) {
        // Get intersection point from the event
        const point = event.point;
        const hexCoords = fromWorldPoint([point.x, point.y, point.z]);

        const updates: Partial<HexCell> = {};
        if (selectedTerrainType) {
          updates.terrainType = selectedTerrainType;
        }
        if (selectedPopulation !== null) {
          updates.population = selectedPopulation;
        }

        onUpdateCell(hexCoords, updates);
        event.stopPropagation();
      }
    },
    [isPaintbrushMode, selectedTerrainType, selectedPopulation, onUpdateCell]
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (isPaintbrushMode && (selectedTerrainType || selectedPopulation !== null)) {
        paintCell(event);
      } else {
        onClick(event);
      }
    },
    [onClick, paintCell, isPaintbrushMode, selectedTerrainType, selectedPopulation]
  );

  // Create the shader material
  const hexMaterial = useMemo(() => {
    const threeOutlineColor = new THREE.Color(PALETTE.POWDER_BLUE);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        outlineColor: { value: threeOutlineColor },
        outlineWidth: { value: GRID_THICKNESS },
        outlineOpacity: { value: GRID_OPACITY },
      },
      vertexShader: hexOutlineVertexShader,
      fragmentShader: hexOutlineFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
    });

    material.blending = THREE.AdditiveBlending;

    return material;
  }, []);

  // Create the geometry with proper UV mappings and vertex colors
  const hexGeometry = useMemo(() => {
    const vertices: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    cells.forEach((cell) => {
      if (isUnderwater(cell)) return;

      const center = getCenterPoint(cell);
      const cellColor = getColorWithExplorationStatus(
        cell,
        surveyedHexCoords.has(coordinatesToString(cell.coordinates))
      );

      // Create a hexagon with proper UV mapping and vertex colors
      const centerUV = [0.5, 0.5];
      const baseVertexIndex = vertices.length / 3;

      // Add center vertex
      vertices.push(center[0], center[1], center[2]);
      uvs.push(centerUV[0], centerUV[1]);
      colors.push(cellColor.r, cellColor.g, cellColor.b);

      // Add vertices for the hex corners with UV coordinates
      for (let d = 0; d < 6; d++) {
        const corner = HexMetrics.getFirstCorner(center, d);
        vertices.push(corner[0], corner[1], corner[2]);

        // Calculate UV for this corner (map to unit circle and adjust)
        const angle = (d / 6) * Math.PI * 2;
        const cornerUV = [
          0.5 + 0.5 * Math.cos(angle), // x coordinate (0 to 1)
          0.5 + 0.5 * Math.sin(angle), // y coordinate (0 to 1)
        ];
        uvs.push(cornerUV[0], cornerUV[1]);

        // Every vertex has the same color as the cell
        colors.push(cellColor.r, cellColor.g, cellColor.b);
      }

      // Create triangles from center to each pair of adjacent corners
      for (let d = 0; d < 6; d++) {
        indices.push(
          baseVertexIndex, // center
          baseVertexIndex + 1 + d, // current corner
          baseVertexIndex + 1 + ((d + 1) % 6) // next corner
        );
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    return geometry;
  }, [cells, surveyedHexCoords]);

  return (
    <>
      <mesh
        geometry={hexGeometry}
        material={hexMaterial}
        onClick={handleClick}
        onPointerMove={debouncedOnHover}
        onPointerLeave={onPointerLeave}
      />

      {debug &&
        cells.map((cell) => {
          const [x, y, z] = getCenterPoint(cell);
          return (
            <Text
              key={`debug-${coordinatesToString(cell.coordinates)}`}
              position={[x, y + 0.1, z]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.2}
              color="black"
            >
              {`${coordinatesToString(cell.coordinates)}${
                cell.population !== Population.Unpopulated ? `\n${Population[cell.population]}` : ""
              }`}
            </Text>
          );
        })}
      {cells.map((cell) => (
        <CityLabel key={`city-${coordinatesToString(cell.coordinates)}`} cell={cell} />
      ))}

      <HexGridDecorations cells={cells} />
    </>
  );
});
