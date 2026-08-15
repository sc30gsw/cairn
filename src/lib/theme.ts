import { createTheme, type MantineColorsTuple } from "@mantine/core";

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

const BODY_FONT = '"IBM Plex Sans JP", "IBM Plex Sans", sans-serif';
const DISPLAY_FONT = "Newsreader, 'IBM Plex Sans JP', serif";

export const theme = createTheme({
  autoContrast: true,
  black: "#100F0F",
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
  white: "#FFFCF0",
  other: {
    displayFont: DISPLAY_FONT,
    ink: "#100F0F",
    muted: "#6F6E69",
    paper: "#FFFCF0",
    paper2: "#F2F0E5",
    rule: "#E6E4D9",
  },
  components: {
    AppShell: {
      styles: {
        header: {
          backgroundColor: "#FFFCF0",
          borderBottom: "1px solid #E6E4D9",
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
          backgroundColor: "#FFFCF0",
          borderColor: "#E6E4D9",
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
