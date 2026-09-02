import * as v from "valibot";
import {
  ACHIEVEMENT_REFLECTION_LENGTH_MESSAGE,
  ACHIEVEMENT_REFLECTION_MAX_LENGTH,
} from "~domain/domain";

export const AchievementReflectionSchema = v.object({
  reflection: v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(ACHIEVEMENT_REFLECTION_MAX_LENGTH, ACHIEVEMENT_REFLECTION_LENGTH_MESSAGE),
  ),
});

export type AchievementReflectionOutput = v.InferOutput<typeof AchievementReflectionSchema>;
