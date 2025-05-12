import React, { useEffect } from "react";
import { IonApp } from "@ionic/react";
import { setupIonicReact } from "@ionic/react";

// Initialize Ionic with configuration
setupIonicReact({
  mode: "ios", // Use iOS design language for all platforms for consistency
});

interface IonWrapperProps {
  children: React.ReactNode;
}

export const IonWrapper: React.FC<IonWrapperProps> = ({ children }) => {
  return <IonApp>{children}</IonApp>;
};
