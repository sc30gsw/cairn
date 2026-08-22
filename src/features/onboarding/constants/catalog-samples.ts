/** Neutral display labels for onboarding preview only — not app category IDs. */
export type CatalogSampleDisplayCategory = "試験対策" | "多聴" | "多読" | "英会話" | "その他";

export type CatalogSample = {
  category: CatalogSampleDisplayCategory;
  content: string;
  minutes: number;
  name: string;
};

/** Illustrative samples for onboarding preview; decoupled from Convex SEED_ITEMS. */
export const ONBOARDING_CATALOG_SAMPLES = [
  {
    category: "試験対策",
    content: "問題5問解いて、間違えた1問だけ復習する",
    minutes: 20,
    name: "文法問題",
  },
  {
    category: "多聴",
    content: "5分聞いて、聞き取れなかった語を3つメモする",
    minutes: 30,
    name: "リスニング",
  },
  {
    category: "多読",
    content: "1ページ読んで、わからない語を2つ調べる",
    minutes: 20,
    name: "多読",
  },
  {
    category: "英会話",
    content: "単語カードを10枚めくる",
    minutes: 30,
    name: "英会話",
  },
  {
    category: "その他",
    content: "机の上を5分片付ける",
    minutes: 20,
    name: "その他",
  },
] as const satisfies readonly CatalogSample[];

/** @deprecated Prefer ONBOARDING_CATALOG_SAMPLES — kept for existing imports. */
export const CATALOG_SAMPLES = ONBOARDING_CATALOG_SAMPLES;
