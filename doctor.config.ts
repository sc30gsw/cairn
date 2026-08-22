export default {
  $schema: "https://react.doctor/schema/config.json",
  ignore: {
    rules: ["deslop/unused-dev-dependency"],
    files: ["convex/_generated/**", "convex/betterAuth/_generated/**"],
    //? vite.config.ts の oxlint 設定と揃える。TanStack Start のルートファイルは
    //? component / errorComponent / notFoundComponent / pendingComponent を
    //? 1 ファイルに同居させる規約なので、この3ルールはここでも off にする。
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
