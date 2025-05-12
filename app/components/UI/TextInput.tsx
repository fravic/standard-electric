import React from "react";
import { IonInput } from "@ionic/react";
import { clientStore } from "@/lib/clientState";
import { cn } from "@/lib/utils";

interface TextInputProps {
  fullWidth?: boolean;
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const TextInput = React.forwardRef<HTMLIonInputElement, TextInputProps>(
  ({ className, fullWidth = true, onChange, ...props }, ref) => {
    return (
      <IonInput
        ref={ref}
        className={cn(
          {
            "w-full": fullWidth,
          },
          className
        )}
        onIonInput={(e) => {
          if (onChange) {
            onChange({
              target: {
                value: e.detail.value || "",
              },
            });
          }
        }}
        onFocus={() =>
          clientStore.send({
            type: "setKeyboardControlsActive",
            active: false,
          })
        }
        onBlur={() =>
          clientStore.send({
            type: "setKeyboardControlsActive",
            active: true,
          })
        }
        {...props}
      />
    );
  }
);

TextInput.displayName = "TextInput";
