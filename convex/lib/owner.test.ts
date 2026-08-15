import { Result } from "better-result";
import { expect, test } from "vite-plus/test";

import { ForbiddenError, UnauthenticatedError } from "./errors";
import { ownerFromIdentity } from "./owner";

const ALLOWED = "owner@example.com";

test("未認証は入れない", () => {
  const result = ownerFromIdentity(null, ALLOWED);
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(UnauthenticatedError.is(result.error)).toBe(true);
  }
});

test("allowlist 外は入れない", () => {
  const result = ownerFromIdentity({ email: "other@example.com", subject: "other" }, ALLOWED);
  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(ForbiddenError.is(result.error)).toBe(true);
  }
});

test("所有者なら ownerId は subject", () => {
  const result = ownerFromIdentity({ email: ALLOWED, subject: "owner-subject" }, ALLOWED);
  expect(Result.isOk(result)).toBe(true);
  if (Result.isOk(result)) {
    expect(result.value).toEqual({ ownerId: "owner-subject" });
  }
});
