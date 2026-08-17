import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from "@mantine/core";

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

export const BODY_FONT = '"IBM Plex Sans JP", "IBM Plex Sans", sans-serif';
export const DISPLAY_FONT = "Newsreader, 'IBM Plex Sans JP', serif";

const INK = "#100F0F";
const PAPER = "#FFFCF0";
const PAPER_2 = "#F2F0E5";
const RULE = "#E6E4D9";

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  dark: {},
  light: {},
  variables: {
    "--bd2": RULE,
    "--cairn-paper-2": PAPER_2,
    "--cairn-rule": RULE,
    "--inset": PAPER_2,
  },
});

export const theme = createTheme({
  autoContrast: true,
  black: INK,
  colors: { blue, green, red, yellow },
  cursorType: "pointer",
  defaultRadius: "sm",
  fontFamily: BODY_FONT,
  headings: {
    fontFamily: BODY_FONT,
    fontWeight: "600",
  },
  primaryColor: "blue",
  primaryShade: 5,
  white: PAPER,
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
    Button: {
      defaultProps: {
        color: "blue",
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
    //? 空表示の見た目はここで一括して決める。呼び出し側は icon / title / description だけ渡す
    EmptyState: {
      defaultProps: {
        size: "sm",
        withIndicatorBackground: true,
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
