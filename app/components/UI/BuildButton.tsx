import React from "react";
import { Button } from "./Button";

interface BuildButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  name: string;
  price?: number;
  details?: {
    powerGenerationKW?: number;
    requiredRegion?: string;
  };
  variant?: "place" | "bid";
  style?: React.CSSProperties;
}

export const BuildButton: React.FC<BuildButtonProps> = ({
  onClick,
  disabled,
  isActive,
  name,
  price,
  details,
  variant = "place",
  style,
}) => {
  return (
    <Button onClick={onClick} disabled={disabled} isActive={isActive} fullWidth style={style}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "2px",
        }}
      >
        <div>{name}</div>
        {details && (
          <div style={{ fontSize: "12px", opacity: 0.8 }}>
            {details.powerGenerationKW && `${details.powerGenerationKW}kW`}
            {details.requiredRegion && ` • ${details.requiredRegion}`}
          </div>
        )}
      </div>
      {isActive
        ? "Cancel"
        : price
          ? `${variant === "bid" ? "Bid" : "Place"} ($${price})`
          : variant === "bid"
            ? "Bid"
            : "Place"}
    </Button>
  );
};
