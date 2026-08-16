import * as v from "valibot";
import {
  CONCRETE_ACTION_VALIDATION_MESSAGE,
  validateConcreteAction,
} from "~domain/concreteActionCore";

export const ConcreteActionSchema = v.pipe(
  v.string(),
  v.trim(),
  v.check((value) => validateConcreteAction(value) === null, CONCRETE_ACTION_VALIDATION_MESSAGE),
);
