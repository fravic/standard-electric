import React, { useEffect } from "react";
import { IonApp } from "@ionic/react";
import { setupIonicReact } from "@ionic/react";

// Initialize Ionic with configuration
setupIonicReact({
  mode: "ios", // Use iOS design language for all platforms for consistency
  hardwareBackButton: false,
});

interface IonWrapperProps {
  children: React.ReactNode;
}

export const IonWrapper: React.FC<IonWrapperProps> = ({ children }) => {
  // Add CSS variables to handle safe areas in PWA mode
  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      // If in PWA mode, remove bottom safe area
      document.documentElement.style.setProperty("--ion-safe-area-bottom", "0px");
    }
  }, []);

  return <IonApp>{children}</IonApp>;
};
