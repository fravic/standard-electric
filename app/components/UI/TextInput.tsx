import React from "react";
import { UI_COLORS } from "@/lib/palette";
import { clientStore } from "@/lib/clientState";

const styles = {
  input: {
    backgroundColor: UI_COLORS.PRIMARY_DARK,
    border: `1px solid ${UI_COLORS.PRIMARY_DARK}`,
    color: UI_COLORS.TEXT_LIGHT,
    padding: "8px",
    borderRadius: "4px",
    width: "100%",
  },
};

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ style, fullWidth = true, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="text"
        style={{
          ...styles.input,
          width: fullWidth ? "100%" : "auto",
          ...style,
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
