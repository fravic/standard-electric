import type { Preview } from "@storybook/react";
import "../app/styles.css";
import { withThemeByClassName } from "@storybook/addon-themes";
import React from "react";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },

  decorators: [
    // Wrap stories with theme provider if needed
    withThemeByClassName({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "dark",
    }),
    (Story) => {
      return React.createElement(
        "div",
        { className: "font-sans" },
        React.createElement(Story)
      );
    },
  ],

  tags: ["autodocs"]
};

export default preview;
