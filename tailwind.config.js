/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./sidepanel.html",
    "./sidepanel.tsx",
    "./SidePanelShell.tsx",
    "./PromptList.tsx",
    "./PromptEditor.tsx",
    "./IntroFlow.tsx",
    "./ClarificationChat.tsx",
    "./components/*.{ts,tsx}",
    "./Settings.tsx",
  ],
  theme: {
    screens: {
      xs: "420px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      fontFamily: {
        editorial: [
          '"Editorial New"',
          '"PP Editorial New Ultralight"',
          '"PP Editorial New Light"',
          "serif",
        ],
      },
      fontFamily: {
        grotesk: ['"FK Grotesk"', "sans-serif"],
      },
    },
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        h1: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        h2: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        h3: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        h4: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        h5: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        h6: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        p: {
          fontFamily: '"FK Grotesk", sans-serif',
        },
      });
    },
  ],
  // Add a base style for input to remove outline when focused
  plugins: [
    function ({ addBase }) {
      addBase({
        h1: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        h2: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        h3: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        h4: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        h5: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        h6: {
          fontFamily: '"PP Editorial New Ultralight",serif',
        },
        p: {
          fontFamily: '"FK Grotesk", sans-serif',
        },
        "input:focus": {
          outline: "none",
          boxShadow: "none",
        },
      });
    },
  ],
};
