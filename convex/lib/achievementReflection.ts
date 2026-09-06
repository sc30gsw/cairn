import { ACHIEVEMENT_REFLECTION_LENGTH_MESSAGE, ACHIEVEMENT_REFLECTION_MAX_LENGTH } from "./domain";
import { ValidationFailedError } from "./errors";
import { throwDomain } from "./ownerFunctions";

export function normalizeReflection(reflection: string | undefined): string | undefined {
  if (reflection === undefined) {
    return undefined;
  }
  const trimmed = reflection.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > ACHIEVEMENT_REFLECTION_MAX_LENGTH) {
    throwDomain(new ValidationFailedError({ message: ACHIEVEMENT_REFLECTION_LENGTH_MESSAGE }));
  }
  return trimmed;
}
