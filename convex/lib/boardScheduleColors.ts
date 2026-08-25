import type { MantineColor } from "@mantine/core";
import { v } from "convex/values";

// export type DefaultMantineColor = 'dark' | 'gray' | 'red' | 'pink' | 'grape' | 'violet' | 'indigo' | 'blue' | 'cyan' | 'green' | 'lime' | 'yellow' | 'orange' | 'teal'

export const BOARD_SCHEDULE_COLORS = [
  "blue",
  "cyan",
  "indigo",
  "green",
  "lime",
  "red",
  "orange",
  "pink",
  "yellow",
  "teal",
  "violet",
  "grape",
] as const satisfies readonly MantineColor[];

export type BoardScheduleColor = (typeof BOARD_SCHEDULE_COLORS)[number];

//? タプルを spread して union を組み立てる。色を1つ足したらこの validator も自動で追随し、
//? 列挙漏れが構造的に起きない(CVX-16)。
export const boardScheduleColorValidator = v.union(
  ...BOARD_SCHEDULE_COLORS.map((color) => v.literal(color)),
);

export const DEFAULT_BOARD_SCHEDULE_COLOR = "blue" satisfies BoardScheduleColor;
