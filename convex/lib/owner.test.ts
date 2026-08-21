import { Result } from "better-result";
import { expect, test } from "vite-plus/test";

import { UnauthenticatedError } from "./errors";
import { ownerFromIdentity } from "./owner";

test("未認証は入れない", () => {
  const result = ownerFromIdentity(null);
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(UnauthenticatedError.is(result.error)).toBe(true);
  }
});

test("認証済みなら ownerId は subject", () => {
  const result = ownerFromIdentity({ email: "user@example.com", subject: "user-subject" });
  expect(Result.isOk(result)).toBe(true);
  if (Result.isOk(result)) {
    expect(result.value).toEqual({ ownerId: "user-subject" });
  }
});

test("email がなくても subject で通る", () => {
  const result = ownerFromIdentity({ subject: "user-subject" });
  expect(Result.isOk(result)).toBe(true);
});
