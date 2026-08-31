export const CATEGORIES = ["TOEIC対策", "多聴", "多読", "英会話", "その他"] as const;

export type Category = (typeof CATEGORIES)[number];

export const SEED_CATEGORIES = CATEGORIES.map((name, sortOrder) => ({ name, sortOrder }));
