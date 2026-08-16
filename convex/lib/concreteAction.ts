import { validateConcreteAction } from "./concreteActionCore";
import { ValidationFailedError } from "./errors";
import { throwDomain } from "./ownerFunctions";

export {
  CONCRETE_ACTION_MIN_LENGTH,
  CONCRETE_ACTION_VALIDATION_MESSAGE,
  DEFAULT_CONCRETE_ACTION_PLACEHOLDER,
  OBSTACLE_THEN_PLACEHOLDER,
  concreteActionPlaceholder,
  validateConcreteAction,
} from "./concreteActionCore";

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
