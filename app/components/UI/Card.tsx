import React from "react";
import { IonCard, IonCardContent } from "@ionic/react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLIonCardElement>) => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "primary",
  className,
  onClick,
  ...props
}) => {
  return (
    <IonCard
      className={cn(
        variant === "primary" ? "bg-(--primary-button)" : "bg-(--secondary-button)",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <IonCardContent>{children}</IonCardContent>
    </IonCard>
  );
};
