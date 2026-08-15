//* 共有文の見出し順。CONTEXT のカテゴリと一致させる。
export const CATEGORIES = ["TOEIC対策", "多聴", "多読", "英会話", "その他"] as const;

export type Category = (typeof CATEGORIES)[number];
