import { TaggedError } from "better-result";

export class UnauthenticatedError extends TaggedError("Unauthenticated")<{
  message: string;
}> {}

export class ForbiddenError extends TaggedError("Forbidden")<{
  message: string;
}> {}

export class NotFoundError extends TaggedError("NotFound")<{
  message: string;
  resource: string;
}> {}

export class ConflictError extends TaggedError("Conflict")<{
  message: string;
}> {}

export class ValidationFailedError extends TaggedError("ValidationFailed")<{
  message: string;
}> {}

export type DomainError =
  | ConflictError
  | ForbiddenError
  | NotFoundError
  | UnauthenticatedError
  | ValidationFailedError;
