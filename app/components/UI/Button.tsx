import React from "react";
import { UI_COLORS } from "@/lib/palette";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  disabled?: boolean;
  isActive?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  fullWidth = false,
  disabled = false,
  isActive = false,
  children,
  style,
  ...props
}) => {
  return (
    <button
      style={{
        backgroundColor: UI_COLORS.PRIMARY,
        border: "none",
        color: UI_COLORS.TEXT_LIGHT,
        padding: "8px 16px",
        textAlign: "center",
        textDecoration: "none",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: fullWidth ? "100%" : "auto",
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: "4px",
        transition: "background-color 0.3s",
        ...(isActive && {
          backgroundColor: UI_COLORS.PRIMARY_DARK,
          color: UI_COLORS.TEXT_LIGHT,
        }),
        ...(disabled && {
          backgroundColor: UI_COLORS.PRIMARY_DARK,
          color: UI_COLORS.TEXT_LIGHT,
          opacity: 0.7,
        }),
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
