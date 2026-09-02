import { CloseButton, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { SEARCH_QUERY_MIN_LENGTH } from "~domain/domain";
import { isSearchableQuery } from "~domain/searchText";

import { useHistoryView } from "~/features/history/hooks/use-history-view";

export const HISTORY_SEARCH_LABEL = "履歴を検索";
export const HISTORY_SEARCH_PLACEHOLDER = "ひとこと・メモを検索";
export const HISTORY_SEARCH_CLEAR_LABEL = "検索語を消す";
export const HISTORY_SEARCH_TOO_SHORT_HINT = `${String(SEARCH_QUERY_MIN_LENGTH)}文字以上で検索します`;

export function HistorySearchInput() {
  const { searchQuery, setQuery } = useHistoryView();
  const showHint = searchQuery.trim() !== "" && !isSearchableQuery(searchQuery);

  return (
    <TextInput
      aria-label={HISTORY_SEARCH_LABEL}
      description={showHint ? HISTORY_SEARCH_TOO_SHORT_HINT : undefined}
      inputWrapperOrder={["input", "description"]}
      leftSection={<IconSearch aria-hidden size={16} />}
      onChange={(event) => setQuery(event.currentTarget.value)}
      placeholder={HISTORY_SEARCH_PLACEHOLDER}
      rightSection={
        searchQuery === "" ? undefined : (
          <CloseButton
            aria-label={HISTORY_SEARCH_CLEAR_LABEL}
            onClick={() => setQuery("")}
            size="sm"
          />
        )
      }
      type="search"
      value={searchQuery}
    />
  );
}
