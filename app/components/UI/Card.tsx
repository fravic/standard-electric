import React from "react";
import { UI_COLORS } from "@/lib/palette";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "dark";
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  style,
}) => {
  return (
    <div
      style={{
        backgroundColor:
          variant === "dark" ? UI_COLORS.PRIMARY_DARK : UI_COLORS.BACKGROUND,
        padding: "1rem",
        borderRadius: "8px",
        color: UI_COLORS.TEXT_LIGHT,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
