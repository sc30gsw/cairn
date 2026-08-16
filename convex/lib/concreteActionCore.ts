import { SEED_CONTENT } from "./catalog";

export const CONCRETE_ACTION_MIN_LENGTH = 8;

export const CONCRETE_ACTION_VALIDATION_MESSAGE =
  "具体的手順は8文字以上で、最初の一歩を書いてください";

export const DEFAULT_CONCRETE_ACTION_PLACEHOLDER = "例: 最初の一歩を具体的に書く";

export const OBSTACLE_THEN_PLACEHOLDER = "例: 机に向かって金のフレーズを1 Unit だけ開く";

export function validateConcreteAction(text: string): string | null {
  if (text.trim().length < CONCRETE_ACTION_MIN_LENGTH) {
    return CONCRETE_ACTION_VALIDATION_MESSAGE;
  }
  return null;
}

export function concreteActionPlaceholder(itemName: string): string {
  return SEED_CONTENT[itemName as keyof typeof SEED_CONTENT] ?? DEFAULT_CONCRETE_ACTION_PLACEHOLDER;
}
