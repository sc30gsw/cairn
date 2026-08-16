import * as v from "valibot";
import {
  CONCRETE_ACTION_MIN_LENGTH,
  CONCRETE_ACTION_VALIDATION_MESSAGE,
} from "~domain/concreteAction";

export { CONCRETE_ACTION_MIN_LENGTH, CONCRETE_ACTION_VALIDATION_MESSAGE };

export const ConcreteActionSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(CONCRETE_ACTION_MIN_LENGTH, CONCRETE_ACTION_VALIDATION_MESSAGE),
);
