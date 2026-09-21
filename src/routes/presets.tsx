import { createFileRoute, redirect } from "@tanstack/react-router";

import { PresetSearchSchema } from "~/features/catalog/schemas/preset-search-schema";

export const Route = createFileRoute("/presets")({
  validateSearch: PresetSearchSchema,
  beforeLoad: () => {
    throw redirect({
      replace: true,
      search: { tab: "plan" },
      to: "/plan",
    });
  },
});
