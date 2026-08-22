/** Neutral display labels for onboarding preview only — not app category IDs. */
export type CatalogSampleDisplayCategory = "演習" | "試験対策" | "暗記" | "インプット" | "復習";

/** Illustrative samples for onboarding preview; decoupled from Convex SEED_ITEMS. */
export const ONBOARDING_CATALOG_SAMPLES = [
  {
    category: "演習",
    content: "10問解いて、間違えた1問だけ解説を読む",
    minutes: 30,
    name: "問題集",
  },
  {
    category: "試験対策",
    content: "1年分を解いて、間違えた設問を3つ復習する",
    minutes: 60,
    name: "過去問",
  },
  {
    category: "暗記",
    content: "20枚めくって、覚えられなかった5枚を復習する",
    minutes: 20,
    name: "暗記カード",
  },
  {
    category: "インプット",
    content: "1本視聴して、要点を3行でまとめる",
    minutes: 45,
    name: "動画講義",
  },
  {
    category: "復習",
    content: "前日のメモを見直して、不明点を1つ調べる",
    minutes: 20,
    name: "復習",
  },
] as const satisfies readonly {
  category: CatalogSampleDisplayCategory;
  content: string;
  minutes: number;
  name: string;
}[];
