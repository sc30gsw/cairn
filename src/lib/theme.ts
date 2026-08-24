import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type MantineTheme,
} from "@mantine/core";

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

//? Flexoki orange。#4 と #5 は「紙×手書き」デザイン合意(design-notes.md)のアクセント2色にそのまま合わせる
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

//? Google Fonts に無い「851手書き雑フォント(Tegaki851)」は CDN ホストがネットワーク許可リストに無く取得不可だったため、
//? デザイン側が元々フォールバックに指定していた Yomogi をそのまま本採用にしている(design-notes.md 参照)
const HAND_FONT = '"Yomogi", sans-serif';
export const NUMERAL_FONT = "'Zen Kaku Gothic New', sans-serif";
//? 呼び出し側の import 名はそのまま流用(見出し・本文とも手書きフォントに統一する合意のため同値)
export const BODY_FONT = HAND_FONT;
export const DISPLAY_FONT = HAND_FONT;

const INK = "#100F0F";
const PAPER = "#FFFCF0";
const PAPER_2 = "#F2F0E5";
const RULE = "#E6E4D9";
const MUTED = "#B7B5AC";
const MUTED_2 = "#6F6E69";

//? スケッチ風の不揃いな輪郭(要所のカードのみ)。CSS の border-radius 8値+slash 記法で手描き感を出す
const SKETCH_RADIUS = "8px 14px 9px 16px/16px 9px 14px 8px";
//? ピル/スタンプ状の不揃い輪郭(タブ・ボタン・バッジ共通)
const PILL_RADIUS = "255px 15px 225px 15px/15px 225px 15px 255px";
const PAPER_SHADOW = "2px 3px 0 rgba(16,15,15,.12)";
//? チェックボックスだけの小さな手描き角丸(設計ファイル由来)
const CHECK_RADIUS = "6px 10px 7px 11px/11px 7px 10px 6px";

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  dark: {},
  light: {},
  variables: {
    "--bd2": RULE,
    "--cairn-desk": "#DAD8CE",
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
    //? 手描き風の不揃いな角丸(設計ファイルのチェックボックス)。2箇所目の需要が出るまで export しない
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
    //? 空表示の見た目はここで一括して決める。呼び出し側は icon / title / description だけ渡す
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
