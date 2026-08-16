import type { Category } from "./categories";

export type SeedItem = {
  category: Category;
  name: string;
};

//* 模試を除く Notion の種類。カテゴリ対応は CONTEXT どおり。
export const SEED_ITEMS = [
  { category: "多聴", name: "Distinction 2000" },
  { category: "英会話", name: "英会話" },
  { category: "TOEIC対策", name: "金のフレーズ" },
  { category: "多読", name: "多読" },
  { category: "TOEIC対策", name: "英文法（解く）" },
  { category: "TOEIC対策", name: "英文法（復習）" },
  { category: "TOEIC対策", name: "出る文特急" },
  { category: "その他", name: "その他" },
] as const satisfies readonly SeedItem[];

export const SEED_MINUTES = {
  "Distinction 2000": 30,
  その他: 20,
  出る文特急: 20,
  多読: 20,
  英会話: 30,
  金のフレーズ: 20,
  "英文法（復習）": 15,
  "英文法（解く）": 20,
} as const satisfies Record<(typeof SEED_ITEMS)[number]["name"], number>;

export type SeedItemName = (typeof SEED_ITEMS)[number]["name"];

export const WEEKDAY_LINE_NAMES = [
  "Distinction 2000",
  "英会話",
  "金のフレーズ",
  "多読",
  "英文法（解く）",
  "英文法（復習）",
  "出る文特急",
] as const satisfies readonly SeedItemName[];

export const WEDNESDAY_LINE_NAMES = [
  "Distinction 2000",
  "英会話",
  "金のフレーズ",
  "多読",
  "出る文特急",
] as const satisfies readonly SeedItemName[];

export const WEEKDAY_NAMES = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
] as const;

export type WeekdayName = (typeof WEEKDAY_NAMES)[number];

export type DefaultExamGoal = {
  examDate: string;
  maxScore: number;
  minScore: number;
};

export const DEFAULT_EXAM_GOAL = {
  examDate: "2026-09-27",
  maxScore: 850,
  minScore: 730,
} as const satisfies DefaultExamGoal;

export function seedLineNamesForWeekday(weekday: number): readonly string[] {
  if (weekday === 0 || weekday === 6) {
    return [];
  }
  if (weekday === 3) {
    return WEDNESDAY_LINE_NAMES;
  }
  return WEEKDAY_LINE_NAMES;
}
