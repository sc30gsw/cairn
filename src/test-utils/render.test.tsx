import { Text } from "@mantine/core";
import { expect, test } from "vite-plus/test";

import { renderWithMantine } from "~/test-utils/render";

test("happy-dom で Mantine の文言が読める", () => {
  const { getByText } = renderWithMantine(<Text>学習ログ</Text>);
  expect(getByText("学習ログ")).toBeDefined();
});
