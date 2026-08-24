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

//* Slack 押し出しの失敗。ドメインエラーではないので DomainError union には入れない —
//? throwDomain の対象にせず、ConvexError としてクライアントへ出さない(§9.1)。
export class SlackDeliveryError extends TaggedError("SlackDelivery")<{
  cause?: unknown;
  message: string;
}> {}

export type DomainError =
  | ConflictError
  | ForbiddenError
  | NotFoundError
  | UnauthenticatedError
  | ValidationFailedError;
