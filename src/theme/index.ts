// src/theme/index.ts
// Curt Landry Ministries Theme
// Colors extracted from logo: Teal (#00bc8b), Cyan (#0095c1), Purple (#6d2891), 
// Red-Orange (#cd2907), Orange (#e2841c), Navy (#001956)

import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// --- Brand Color Palettes ---
const curtLandryColors = {
  // Primary teal/cyan from logo gradient
  primary: {
    50: "#e6fff7",
    100: "#b3ffe8",
    200: "#80ffd9",
    300: "#4dffc9",
    400: "#1affba",
    500: "#00bc8b", // Main teal from logo
    600: "#009970",
    700: "#007356",
    800: "#004d39",
    900: "#00261d",
  },
  // Secondary cyan
  secondary: {
    50: "#e6f9ff",
    100: "#b3ecff",
    200: "#80dfff",
    300: "#4dd2ff",
    400: "#1ac5ff",
    500: "#0095c1", // Cyan from logo
    600: "#00779a",
    700: "#005973",
    800: "#003b4d",
    900: "#001e26",
  },
  // Accent purple from logo gradient
  accent: {
    50: "#f5e6ff",
    100: "#e0b3ff",
    200: "#cc80ff",
    300: "#b74dff",
    400: "#a31aff",
    500: "#6d2891", // Purple from logo
    600: "#571f74",
    700: "#411757",
    800: "#2b0f3a",
    900: "#16081d",
  },
  // Navy from logo text
  navy: {
    50: "#e6e9f2",
    100: "#b3bdd9",
    200: "#8091bf",
    300: "#4d65a6",
    400: "#1a398c",
    500: "#001956", // Navy from logo
    600: "#001445",
    700: "#000f34",
    800: "#000a22",
    900: "#000511",
  },
  // Warm accent colors from logo gradient
  warm: {
    50: "#fff5e6",
    100: "#ffe0b3",
    200: "#ffcc80",
    300: "#ffb74d",
    400: "#e2841c", // Orange from logo
    500: "#cd2907", // Red-orange from logo
    600: "#a42106",
    700: "#7b1904",
    800: "#521003",
    900: "#290801",
  },
  // Neutral grays
  gray: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  // Success
  success: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },
  // Warning
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },
  // Error
  error: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
  },
};

// --- Helper ---
const makePalette = (palette: Record<number, string>) =>
  Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, { value: v }]));

// --- Theme config ---
const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Brand palettes
        brand: makePalette(curtLandryColors.primary),
        primary: makePalette(curtLandryColors.primary),
        secondary: makePalette(curtLandryColors.secondary),
        accent: makePalette(curtLandryColors.accent),
        navy: makePalette(curtLandryColors.navy),
        warm: makePalette(curtLandryColors.warm),
        gray: makePalette(curtLandryColors.gray),
        success: makePalette(curtLandryColors.success),
        green: makePalette(curtLandryColors.success),
        warning: makePalette(curtLandryColors.warning),
        yellow: makePalette(curtLandryColors.warning),
        error: makePalette(curtLandryColors.error),
        red: makePalette(curtLandryColors.error),

        // Specific static colors
        clm: {
          teal: { value: "#00bc8b" },
          cyan: { value: "#0095c1" },
          purple: { value: "#6d2891" },
          redOrange: { value: "#cd2907" },
          orange: { value: "#e2841c" },
          navy: { value: "#001956" },
        },
      },
      fonts: {
        heading: {
          value:
            "var(--font-dm-sans), 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        },
        body: {
          value:
            "var(--font-dm-sans), 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        },
        mono: {
          value:
            "var(--font-geist-mono), 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace",
        },
      },
      fontSizes: {
        xs: { value: "0.75rem" },
        sm: { value: "0.875rem" },
        md: { value: "1rem" },
        lg: { value: "1.125rem" },
        xl: { value: "1.25rem" },
        "2xl": { value: "1.5rem" },
        "3xl": { value: "1.875rem" },
        "4xl": { value: "2.25rem" },
        "5xl": { value: "3rem" },
        "6xl": { value: "3.75rem" },
      },
      spacing: {
        container: { value: "1200px" },
        sidebar: { value: "280px" },
        header: { value: "64px" },
      },
      radii: {
        sm: { value: "0.25rem" },
        md: { value: "0.5rem" },
        lg: { value: "0.75rem" },
        xl: { value: "1rem" },
        "2xl": { value: "1.5rem" },
        full: { value: "9999px" },
      },
      shadows: {
        sm: { value: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
        md: {
          value:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
        lg: {
          value:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
        xl: {
          value:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        },
        glow: {
          value: "0 0 20px rgba(0, 188, 139, 0.3), 0 0 40px rgba(0, 149, 193, 0.2)",
        },
      },
    },

    semanticTokens: {
      colors: {
        // ---- Branding & Surfaces ----
        "brand.primary": { value: "{colors.brand.500}" },
        "brand.accent": { value: "{colors.secondary.500}" },
        "brand.muted": { value: "{colors.brand.50}" },
        "brand.on": { value: "white" },

        // ---- Success ----
        "success.bg": { value: "{colors.green.50}" },
        "success.surface": { value: "{colors.green.100}" },
        "success.primary": { value: "{colors.green.500}" },
        "success.strong": { value: "{colors.green.700}" },
        "success.on": { value: "white" },

        // ---- Info/Progress ----
        "info.bg": { value: "{colors.secondary.50}" },
        "info.primary": { value: "{colors.secondary.500}" },
        "info.on": { value: "white" },

        // ---- Warning ----
        "warning.bg": { value: "{colors.yellow.50}" },
        "warning.surface": { value: "{colors.yellow.100}" },
        "warning.primary": { value: "{colors.yellow.500}" },
        "warning.strong": { value: "{colors.yellow.700}" },
        "warning.on": { value: "{colors.gray.900}" },

        // ---- Error/Destructive ----
        "error.bg": { value: "{colors.red.50}" },
        "error.surface": { value: "{colors.red.100}" },
        "error.primary": { value: "{colors.red.500}" },
        "error.strong": { value: "{colors.red.700}" },
        "error.on": { value: "white" },

        // ---- Backgrounds (Light/Dark aware) ----
        bg: {
          primary: {
            value: { base: "white", _dark: "{colors.gray.950}" },
          },
          secondary: {
            value: { base: "{colors.gray.50}", _dark: "{colors.gray.900}" },
          },
          tertiary: {
            value: { base: "{colors.gray.100}", _dark: "{colors.gray.800}" },
          },
          brand: {
            value: { base: "{colors.brand.500}", _dark: "{colors.brand.600}" },
          },
          surface: {
            value: { base: "white", _dark: "{colors.gray.900}" },
          },
          card: {
            value: { base: "white", _dark: "{colors.gray.900}" },
          },
          gradient: {
            value: {
              base: "linear-gradient(135deg, {colors.brand.500} 0%, {colors.secondary.500} 100%)",
              _dark: "linear-gradient(135deg, {colors.brand.600} 0%, {colors.secondary.600} 100%)",
            },
          },
        },

        // ---- Text ----
        text: {
          primary: {
            value: { base: "{colors.gray.900}", _dark: "{colors.gray.50}" },
          },
          secondary: {
            value: { base: "{colors.gray.600}", _dark: "{colors.gray.300}" },
          },
          muted: {
            value: { base: "{colors.gray.500}", _dark: "{colors.gray.400}" },
          },
          brand: {
            value: { base: "{colors.brand.600}", _dark: "{colors.brand.400}" },
          },
          inverse: {
            value: { base: "white", _dark: "{colors.gray.900}" },
          },
        },

        // ---- Border ----
        border: {
          primary: {
            value: { base: "{colors.gray.200}", _dark: "{colors.gray.700}" },
          },
          secondary: {
            value: { base: "{colors.gray.100}", _dark: "{colors.gray.800}" },
          },
          brand: {
            value: { base: "{colors.brand.200}", _dark: "{colors.brand.700}" },
          },
        },

        // ---- Status ----
        status: {
          success: {
            value: { base: "{colors.success.500}", _dark: "{colors.success.400}" },
          },
          warning: {
            value: { base: "{colors.warning.500}", _dark: "{colors.warning.400}" },
          },
          error: {
            value: { base: "{colors.error.500}", _dark: "{colors.error.400}" },
          },
        },
      },
    },
  },
});

export const clmSystem = createSystem(defaultConfig, config);
