import React from "react";
import { clientStore } from "@/lib/clientState";
import { cn } from "@/lib/utils";

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, fullWidth = true, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="text"
        className={cn(
          "bg-secondary-button border border-button-border rounded text-foreground p-2",
          "placeholder:text-foreground/50",
          {
            "w-full": fullWidth,
          },
          className
        )}
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
