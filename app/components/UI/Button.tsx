import React from "react";
import { cn } from "@/lib/utils";

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
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        "flex items-center justify-between rounded px-4 py-2 transition-colors",
        variant === "primary" ? "bg-primary-button" : "bg-secondary-button",
        "border border-button-border shadow-[0_2px_0_0_rgba(0,0,0,0.05)] shadow-button-inner",
        "font-serif-extra text-foreground",
        {
          "w-full": fullWidth,
          "bg-secondary-button": isActive,
          "opacity-70 cursor-not-allowed": disabled,
        },
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
