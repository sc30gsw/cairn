import { stripSearchParams, type SearchMiddleware } from "@tanstack/react-router";

import {
  BoardSearchSchema,
  boardSearchDefaults,
  type BoardSearch,
} from "~/features/board/schemas/board-search-schema";

/**
 * ボードルート: Valibot で validateSearch。
 * stripSearchParams でデフォルト search を URL から除き clean `/board` にする。
 * validateSearch は createFileRoute 内に直接書く（spread だとルート型が崩れる）。
 */
export const boardSearchMiddlewares: SearchMiddleware<BoardSearch>[] = [
  stripSearchParams(boardSearchDefaults),
];

export { BoardSearchSchema };
