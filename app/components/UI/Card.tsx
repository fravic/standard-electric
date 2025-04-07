import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, variant = "primary", className }) => {
  return (
    <div
      className={cn(
        "rounded-lg p-4 shadow-[0_2px_0_0_rgba(0,0,0,0.05)] text-foreground",
        variant === "primary" ? "bg-primary-button" : "bg-secondary-button",
        className
      )}
    >
      {children}
    </div>
  );
};
