import { expect, test } from "vite-plus/test";

import { userLabel } from "~/lib/user-label";

test("userLabel は name を優先する", () => {
  expect(
    userLabel({
      email: "owner@example.com",
      image: null,
      name: "Owner",
      username: "owner",
    }),
  ).toBe("Owner");
});

test("userLabel は name が空なら email を使う", () => {
  expect(
    userLabel({
      email: "owner@example.com",
      image: null,
      name: "",
      username: "owner",
    }),
  ).toBe("owner@example.com");
});

test("userLabel は name/email が無ければフォールバック", () => {
  expect(
    userLabel({
      email: "",
      image: null,
      name: "",
      username: "owner",
    }),
  ).toBe("アカウント");
});
