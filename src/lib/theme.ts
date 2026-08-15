import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from "@mantine/core";

const cyan = [
  "#E8F3F1",
  "#CDE6E2",
  "#A8D5CE",
  "#7DC0B6",
  "#54A89D",
  "#24837B",
  "#1C6C66",
  "#155650",
  "#0F403C",
  "#092B28",
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

export const BODY_FONT = '"IBM Plex Sans JP", "IBM Plex Sans", sans-serif';
export const DISPLAY_FONT = "Newsreader, 'IBM Plex Sans JP', serif";

const INK = "#100F0F";
const MUTED = "#6F6E69";
const PAPER = "#FFFCF0";
const PAPER_2 = "#F2F0E5";
const RULE = "#E6E4D9";

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  dark: {},
  light: {},
  variables: {
    "--cairn-paper-2": PAPER_2,
    "--cairn-rule": RULE,
  },
});

export const theme = createTheme({
  autoContrast: true,
  black: INK,
  colors: { cyan, red, yellow },
  cursorType: "pointer",
  defaultRadius: "sm",
  fontFamily: BODY_FONT,
  headings: {
    fontFamily: BODY_FONT,
    fontWeight: "600",
  },
  primaryColor: "cyan",
  primaryShade: 5,
  white: PAPER,
  other: {
    displayFont: DISPLAY_FONT,
    ink: INK,
    muted: MUTED,
    paper: PAPER,
    paper2: PAPER_2,
    rule: RULE,
  },
  components: {
    AppShell: {
      styles: {
        header: {
          backgroundColor: PAPER,
          borderBottom: `1px solid ${RULE}`,
        },
        main: {
          backgroundColor: "transparent",
        },
      },
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
          borderColor: RULE,
        },
      },
    },
    Select: {
      defaultProps: {
        allowDeselect: false,
        comboboxProps: { withinPortal: true },
      },
    },
  },
});
