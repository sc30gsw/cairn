import { TaggedError } from "better-result";

export class MutationFailedError extends TaggedError("MutationFailed")<{
  cause?: unknown;
  message: string;
}> {}

export class ValidationFailedError extends TaggedError("ValidationFailed")<{
  message: string;
}> {}

export class AuthActionError extends TaggedError("AuthAction")<{
  cause?: unknown;
  message: string;
}> {}
