import React from "react";
import { IonButton } from "@ionic/react";
import { cn } from "@/lib/utils";

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
  className?: string;
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
  className,
  style,
}) => {
  return (
    <IonButton
      onClick={onClick}
      disabled={disabled}
      fill={isActive ? "solid" : "outline"}
      expand="block"
      color="primary"
      className={className}
      style={style}
    >
      <div className="flex flex-col items-start gap-0.5">
        <div>{name}</div>
        {details && (
          <div className="text-xs opacity-80">
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
    </IonButton>
  );
};
