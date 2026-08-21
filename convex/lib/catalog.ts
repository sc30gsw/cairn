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

export const SEED_CONTENT = {
  "Distinction 2000": "Track 12 を1周聞いて、聞き取れなかった語を3つメモする",
  その他: "机の上の紙を1枚だけ片付ける",
  出る文特急: "今日の1 Unit を音読して、わからない語を2つ調べる",
  多読: "Chapter 2 を1ページ読んで、わからない語を2つ調べる",
  英会話: "アプリを開いて単語カードを10枚めくる",
  金のフレーズ: "Unit 3 の例文を声に出して5文読む",
  "英文法（復習）": "間違えた1問だけ解説を読む",
  "英文法（解く）": "問題1〜5を解いて、間違えた1問だけ解説を読む",
} as const satisfies Record<(typeof SEED_ITEMS)[number]["name"], string>;

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

type TupleIndex<T extends readonly unknown[]> = {
  [K in keyof T]: K extends `${infer N extends number}` ? N : never;
}[number];

export type Weekday = TupleIndex<typeof WEEKDAY_NAMES>;

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const satisfies readonly Weekday[] & {
  length: (typeof WEEKDAY_NAMES)["length"];
};

export const WEEKDAY_RANGE_MESSAGE = `曜日は 0〜${String(WEEKDAY_NAMES.length - 1)} です`;

export function isWeekday(value: number): value is Weekday {
  return Number.isInteger(value) && value >= 0 && value < WEEKDAY_NAMES.length;
}

export function seedLineNamesForWeekday(weekday: number): readonly string[] {
  if (weekday === 0 || weekday === 6) {
    return [];
  }
  if (weekday === 3) {
    return WEDNESDAY_LINE_NAMES;
  }
  return WEEKDAY_LINE_NAMES;
}
