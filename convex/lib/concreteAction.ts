import { ValidationFailedError } from "./errors";
import { throwDomain } from "./ownerFunctions";

export const CONCRETE_ACTION_MIN_LENGTH = 8;

export const CONCRETE_ACTION_VALIDATION_MESSAGE =
  "具体的手順は8文字以上で、最初の一歩を書いてください";

const PLACEHOLDER_BY_ITEM = {
  "Distinction 2000": "Track 12 を1周聞いて、聞き取れなかった語を3つメモする",
  その他: "机の上の紙を1枚だけ片付ける",
  出る文特急: "今日の1 Unit を音読して、わからない語を2つ調べる",
  多読: "Chapter 2 を1ページ読んで、わからない語を2つ調べる",
  英会話: "アプリを開いて単語カードを10枚めくる",
  金のフレーズ: "Unit 3 の例文を声に出して5文読む",
  "英文法（復習）": "間違えた1問だけ解説を読む",
  "英文法（解く）": "問題1〜5を解いて、間違えた1問だけ解説を読む",
} as const satisfies Record<string, string>;

const DEFAULT_PLACEHOLDER = "例: 最初の一歩を具体的に書く";

export function validateConcreteAction(text: string): string | null {
  if (text.trim().length < CONCRETE_ACTION_MIN_LENGTH) {
    return CONCRETE_ACTION_VALIDATION_MESSAGE;
  }
  return null;
}

export function assertConcreteAction(text: string): void {
  const message = validateConcreteAction(text);
  if (message !== null) {
    throwDomain(new ValidationFailedError({ message }));
  }
}

export function assertConcreteActionLines(lines: readonly { content: string }[]): void {
  for (const line of lines) {
    assertConcreteAction(line.content);
  }
}

export function concreteActionPlaceholder(itemName: string): string {
  return PLACEHOLDER_BY_ITEM[itemName as keyof typeof PLACEHOLDER_BY_ITEM] ?? DEFAULT_PLACEHOLDER;
}
