/// <reference types="vite-plus/client" />

interface ImportMeta {
  readonly glob: (
    pattern: string | readonly string[],
  ) => Record<string, () => Promise<Record<string, unknown>>>;
}

declare const process: {
  env: Record<string, string | undefined>;
};
