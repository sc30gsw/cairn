import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type MantineTheme,
} from "@mantine/core";

import { PAPER_TOKENS } from "~/lib/paper-tokens";

const blue = [
  "#E8F0F8",
  "#C9DBEF",
  "#A8C4E4",
  "#84AAD6",
  "#5F91C8",
  "#4385BE",
  "#356EA0",
  "#2A5782",
  "#204064",
  "#162A46",
] as const satisfies MantineColorsTuple;

const red = [
  "#F8E8E6",
  "#EDC9C5",
  "#E0A49D",
  "#D17C72",
  "#C2554A",
  "#AF3029",
  "#932821",
  "#771F1A",
  "#5B1714",
  "#3F100E",
] as const satisfies MantineColorsTuple;

const yellow = [
  "#F8F1D8",
  "#F0E3B0",
  "#E4D07A",
  "#D4B84A",
  "#C49A1C",
  "#AD8301",
  "#8F6C02",
  "#715602",
  "#534002",
  "#362B01",
] as const satisfies MantineColorsTuple;

const green = [
  "#EEF1D8",
  "#DCE2B0",
  "#C6D07E",
  "#AFBC4C",
  "#98A61F",
  "#66800B",
  "#536A09",
  "#405407",
  "#2E3E05",
  "#1C2803",
] as const satisfies MantineColorsTuple;

const orange = [
  "#FDEEE4",
  "#FBDCC7",
  "#F6C29D",
  "#EEA06D",
  "#DA702C",
  "#BC5215",
  "#9C4211",
  "#7A340D",
  "#5A260A",
  "#3D1A07",
] as const satisfies MantineColorsTuple;

const HAND_FONT = '"Yomogi", sans-serif';
export const BODY_FONT = HAND_FONT;
export const DISPLAY_FONT = HAND_FONT;
export const NUMERAL_FONT = HAND_FONT;

const INK = PAPER_TOKENS.ink;
const PAPER = PAPER_TOKENS.paper;
const PAPER_2 = PAPER_TOKENS.paper2;
const RULE = PAPER_TOKENS.rule;
const MUTED = PAPER_TOKENS.muted;
const MUTED_2 = PAPER_TOKENS.muted2;

const SKETCH_RADIUS = "8px 14px 9px 16px/16px 9px 14px 8px";
const PILL_RADIUS = "255px 15px 225px 15px/15px 225px 15px 255px";
const PAPER_SHADOW = "2px 3px 0 rgba(16,15,15,.12)";
const CHECK_RADIUS = "6px 10px 7px 11px/11px 7px 10px 6px";

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  dark: {},
  light: {},
  variables: {
    "--bd2": RULE,
    "--cairn-desk": PAPER_TOKENS.desk,
    "--cairn-ink": INK,
    "--cairn-muted": MUTED,
    "--cairn-muted-2": MUTED_2,
    "--cairn-paper-2": PAPER_2,
    "--cairn-rule": RULE,
    "--inset": PAPER_2,
  },
});

export const theme = createTheme({
  autoContrast: true,
  black: INK,
  colors: { blue, green, orange, red, yellow },
  cursorType: "pointer",
  defaultRadius: "sm",
  fontFamily: BODY_FONT,
  headings: {
    fontFamily: DISPLAY_FONT,
    fontWeight: "600",
  },
  primaryColor: "orange",
  primaryShade: 5,
  white: PAPER,
  components: {
    AppShell: {
      styles: {
        main: {
          backgroundColor: "transparent",
        },
      },
    },
    Button: {
      defaultProps: {
        color: "orange",
      },
      styles: (_theme: MantineTheme, params: { color?: string; variant?: string }) => ({
        root: {
          border:
            params.variant === "filled" || params.variant === undefined
              ? `1.5px solid var(--mantine-color-${params.color ?? "orange"}-6)`
              : params.variant === "outline"
                ? `1.5px solid var(--mantine-color-${params.color ?? "orange"}-6)`
                : `1.5px solid ${INK}`,
          backgroundColor:
            params.variant === "default"
              ? PAPER
              : params.variant === "subtle"
                ? "transparent"
                : undefined,
          borderRadius: PILL_RADIUS,
          boxShadow:
            params.variant === "subtle" || params.variant === "transparent"
              ? "none"
              : "2px 2px 0 rgba(16,15,15,.15)",
        },
      }),
    },
    Checkbox: {
      styles: { input: { border: `1.5px solid ${INK}`, borderRadius: CHECK_RADIUS } },
    },
    Card: {
      defaultProps: {
        padding: "lg",
        radius: "sm",
        withBorder: true,
      },
      styles: {
        root: {
          backgroundColor: PAPER,
          border: `1.5px solid ${INK}`,
          borderRadius: SKETCH_RADIUS,
          boxShadow: PAPER_SHADOW,
        },
      },
    },
    EmptyState: {
      defaultProps: {
        size: "sm",
        withIndicatorBackground: true,
      },
    },
    NumberInput: {
      styles: {
        input: {
          backgroundColor: "transparent",
          border: "none",
          borderBottom: `1.5px solid ${MUTED}`,
          borderRadius: 0,
          fontFamily: NUMERAL_FONT,
        },
      },
    },
    Progress: {
      styles: {
        root: {
          backgroundColor: PAPER,
          border: `1.5px solid ${INK}`,
        },
      },
    },
    Select: {
      defaultProps: {
        allowDeselect: false,
        comboboxProps: { withinPortal: true },
      },
      styles: {
        input: {
          backgroundColor: "transparent",
          border: "none",
          borderBottom: `1.5px solid ${MUTED}`,
          borderRadius: 0,
        },
      },
    },
    Tabs: {
      styles: {
        list: { border: "none", gap: 12 },
        tab: {
          "&[data-active]": {
            backgroundColor: "rgba(188,82,21,.08)",
            border: "2px solid var(--mantine-color-orange-6)",
            color: "var(--mantine-color-orange-6)",
            fontWeight: 600,
          },
          border: `1.5px solid ${MUTED}`,
          borderRadius: PILL_RADIUS,
          color: MUTED_2,
        },
      },
    },
    Textarea: {
      styles: {
        input: {
          backgroundColor: "transparent",
          border: `1.5px solid ${INK}`,
          borderRadius: SKETCH_RADIUS,
        },
      },
    },
    TextInput: {
      styles: {
        input: {
          backgroundColor: "transparent",
          border: "none",
          borderBottom: `1.5px solid ${MUTED}`,
          borderRadius: 0,
        },
      },
    },
  },
});
