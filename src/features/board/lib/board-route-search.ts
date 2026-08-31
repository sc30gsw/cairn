import { stripSearchParams, type SearchMiddleware } from "@tanstack/react-router";

import {
  BoardSearchSchema,
  boardSearchDefaults,
  type BoardSearch,
} from "~/features/board/schemas/board-search-schema";

export const boardSearchMiddlewares: SearchMiddleware<BoardSearch>[] = [
  stripSearchParams(boardSearchDefaults),
];

export { BoardSearchSchema };
