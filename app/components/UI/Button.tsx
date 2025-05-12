import React from "react";
import { IonButton } from "@ionic/react";
import { cn } from "@/lib/utils";

interface ButtonProps {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  disabled?: boolean;
  isActive?: boolean;
  children?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLIonButtonElement>) => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  fullWidth = false,
  disabled = false,
  isActive = false,
  children,
  className,
  onClick,
  ...props
}) => {
  return (
    <IonButton
      className={cn(
        {
          "w-full": fullWidth,
        },
        className
      )}
      color={variant === "primary" ? "primary" : "secondary"}
      disabled={disabled}
      fill={isActive ? "solid" : "outline"}
      expand={fullWidth ? "block" : undefined}
      onClick={onClick}
      {...props}
    >
      {children}
    </IonButton>
  );
};
