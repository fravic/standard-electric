import React from "react";
import { useSelector } from "@xstate/store/react";
import { TerrainType, Population } from "../../lib/HexCell";
import { clientStore } from "@/lib/clientState";
import { GameContext } from "@/actor/game.context";
import { useMapEditor } from "@/routes/mapEditor";
import { coordinatesToString } from "@/lib/coordinates/HexCoordinates";
import { TextInput } from "./TextInput";
import { Card } from "./Card";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export const TerrainPaintUI: React.FC = () => {
  const isPaintbrushMode = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.isPaintbrushMode
  );
  const isDebug = useSelector(clientStore, (state) => state.context.isDebug);
  const selectedTerrainType = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.selectedTerrainType
  );
  const selectedPopulation = useSelector(
    clientStore,
    (state) => state.context.mapBuilder.selectedPopulation
  );
  const selectedHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.selectedHexCoordinates
  );
  const hexGrid = GameContext.useSelector((state) => state.public.hexGrid);
  const { updateRegionName, updateHexCity } = useMapEditor();

  if (!isDebug) return null;

  const selectedCell = selectedHexCoordinates
    ? hexGrid.cellsByHexCoordinates[coordinatesToString(selectedHexCoordinates)]
    : null;

  const currentCityName = selectedCell?.cityName || "";
  const currentRegionName = selectedCell?.regionName || "";

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(hexGrid, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hexgrid.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCityNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedHexCoordinates) {
      const value = e.target.value;
      updateHexCity(selectedHexCoordinates, value || null);
    }
  };

  const handleRegionNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedHexCoordinates) {
      const value = e.target.value;
      updateRegionName(selectedHexCoordinates, value || null);
    }
  };

  const handleClearRegion = () => {
    if (selectedHexCoordinates) {
      updateRegionName(selectedHexCoordinates, null);
    }
  };

  return (
    <Card className="fixed top-[200px] right-[10px] flex flex-col gap-2 z-[1000] max-w-[250px]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-bold">Paintbrush Mode</span>
          <Button
            variant={isPaintbrushMode ? "secondary" : "primary"}
            className="ml-2"
            onClick={() =>
              clientStore.send({
                type: "setPaintbrushMode",
                enabled: !isPaintbrushMode,
              })
            }
          >
            {isPaintbrushMode ? "On" : "Off"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="font-serif-extra m-0">Terrain Type</h4>
        <div className="grid grid-cols-2 gap-1">
          {Object.values(TerrainType).map((terrainType) => (
            <Button
              key={terrainType}
              variant={selectedTerrainType === terrainType ? "secondary" : "primary"}
              onClick={() =>
                clientStore.send({
                  type: "setSelectedTerrainType",
                  terrainType: selectedTerrainType === terrainType ? null : terrainType,
                })
              }
            >
              {terrainType}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="font-serif-extra m-0">Population</h4>
        <div className="grid grid-cols-2 gap-1">
          {Object.values(Population)
            .filter((value) => typeof value === "number")
            .map((population) => (
              <Button
                key={population}
                variant={selectedPopulation === population ? "secondary" : "primary"}
                onClick={() =>
                  clientStore.send({
                    type: "setSelectedPopulation",
                    population: selectedPopulation === population ? null : population,
                  })
                }
              >
                {Population[population]}
              </Button>
            ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="font-serif-extra m-0">City Name</h4>
        <TextInput
          value={currentCityName}
          onChange={handleCityNameChange}
          placeholder="Enter city name..."
          disabled={!selectedHexCoordinates}
          className="p-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h4 className="font-serif-extra m-0">Region Name</h4>
          <Button
            variant="primary"
            className="py-1 px-2 text-xs"
            onClick={handleClearRegion}
            disabled={!selectedHexCoordinates || !currentRegionName}
          >
            Clear
          </Button>
        </div>
        <TextInput
          value={currentRegionName}
          onChange={handleRegionNameChange}
          placeholder="Enter region name..."
          disabled={!selectedHexCoordinates}
          className="p-2"
        />
      </div>

      <Button variant="primary" className="mt-2 w-full" onClick={handleExport}>
        Export Map
      </Button>
    </Card>
  );
};
