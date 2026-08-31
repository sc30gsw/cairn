export default {
  $schema: "https://react.doctor/schema/config.json",
  ignore: {
    rules: ["deslop/unused-dev-dependency"],
    files: ["convex/_generated/**", "convex/betterAuth/_generated/**"],
    overrides: [
      {
        files: ["src/routes/**"],
        rules: [
          "react-doctor/no-multi-comp",
          "react-doctor/no-multi-component-file",
          "react-doctor/only-export-components",
        ],
      },
    ],
  },
};
