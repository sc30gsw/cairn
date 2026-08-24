//* Paper Redesign の色の一次値。Mantine に依存しないので Node のビルドスクリプトからも読める。
//? theme.ts / __root.tsx の theme-color / scripts/render-offline-html.ts が、ここを唯一の出所にする。
export const PAPER_TOKENS = {
  desk: "#DAD8CE",
  ink: "#100F0F",
  muted: "#B7B5AC",
  muted2: "#6F6E69",
  //? Mantine の orange[5]。primaryShade が 5 なので、これがアクセント。
  orangeAccent: "#BC5215",
  paper: "#FFFCF0",
  paper2: "#F2F0E5",
  rule: "#E6E4D9",
} as const;
