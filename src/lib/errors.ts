import { TaggedError } from "better-result";

export class MutationFailedError extends TaggedError("MutationFailed")<{
  cause?: unknown;
  message: string;
}> {}
