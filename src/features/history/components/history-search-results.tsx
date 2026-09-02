import {
  Anchor,
  Badge,
  Card,
  EmptyState,
  Group,
  Mark,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { Shimmer } from "@shimmer-from-structure/react";
import { IconSearchOff } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { SEARCH_RESULT_LIMIT } from "~domain/domain";
import type { DateJst } from "~domain/jst";
import { normalizeSearchQuery } from "~domain/searchText";

import { useHistorySearch } from "~/features/history/hooks/history-queries";
import { useHistoryView } from "~/features/history/hooks/use-history-view";
import { historyShimmerSearchHits } from "~/features/history/lib/history-shimmer-template";
import { searchExcerpt } from "~/features/history/lib/search-excerpt";
import {
  isSearchRange,
  SEARCH_RANGE_LABELS,
  SEARCH_RANGE_ORDER,
  searchFromJst,
} from "~/features/history/lib/search-range";
import type { HistorySearchRange } from "~/features/history/schemas/history-search-schema";
import type { HistorySearchHit } from "~/features/history/types/history";
import { NUMERAL_FONT } from "~/lib/theme";

export const SEARCH_EMPTY_TITLE = "見つかりませんでした";
export const SEARCH_RANGE_LABEL = "検索範囲";
export const SEARCH_RESULTS_LABEL = "検索結果";
export const SEARCH_TRUNCATED_MESSAGE = `新しい順に${String(SEARCH_RESULT_LIMIT)}件まで表示しています。語を足して絞ってください`;
export const SEARCH_KIND_LABELS = {
  hitokoto: "ひとこと",
  memo: "メモ",
} as const satisfies Record<HistorySearchHit["kind"], string>;

//? 打鍵ごとに Convex へ問い合わせない。URL の検索語はそのまま、購読だけを少し遅らせる
const SEARCH_DEBOUNCE_MS = 250;

const LIST_STYLE = { listStyle: "none", padding: 0 } as const;

type SearchHitRowProps = {
  hit: HistorySearchHit;
  normalizedQuery: string;
};

function SearchHitRow({ hit, normalizedQuery }: SearchHitRowProps) {
  const excerpt = searchExcerpt(hit.text, normalizedQuery);

  return (
    <Card component="li" padding="sm">
      <Group gap="sm" wrap="wrap">
        <Anchor
          ff={NUMERAL_FONT}
          renderRoot={(props) => (
            <Link {...props} params={{ dateJst: hit.dateJst }} to="/days/$dateJst" />
          )}
        >
          {hit.dateJst}
        </Anchor>
        <Badge color={hit.kind === "memo" ? "orange" : "green"} variant="light">
          {SEARCH_KIND_LABELS[hit.kind]}
        </Badge>
        {hit.kind === "hitokoto" && <Text fw={600}>{hit.title}</Text>}
        {hit.category !== undefined && (
          <Text c="dimmed" size="sm">
            {hit.category}
          </Text>
        )}
        {hit.minutes !== undefined && (
          <Text c="dimmed" ff={NUMERAL_FONT} size="sm">
            {hit.minutes}分
          </Text>
        )}
      </Group>
      <Text mt={4} size="sm">
        {excerpt.before}
        {excerpt.match !== "" && <Mark>{excerpt.match}</Mark>}
        {excerpt.after}
      </Text>
    </Card>
  );
}

function hitKey(hit: HistorySearchHit): string {
  return hit.rowId ?? `memo-${hit.dateJst}`;
}

type SearchResultsListProps = {
  query: string;
  range: HistorySearchRange;
  today: DateJst;
};

function SearchResultsList({ query, range, today }: SearchResultsListProps) {
  const { data } = useHistorySearch(query, searchFromJst(range, today));
  const normalizedQuery = normalizeSearchQuery(query);

  if (data.hits.length === 0) {
    return (
      <Card>
        <EmptyState
          description={`「${query.trim()}」を含むひとこと・メモは${SEARCH_RANGE_LABELS[range]}にありません。`}
          icon={<IconSearchOff aria-hidden />}
          title={SEARCH_EMPTY_TITLE}
        />
      </Card>
    );
  }

  return (
    <Stack gap="xs">
      <Text c="dimmed" size="sm">
        <Text ff={NUMERAL_FONT} span>
          {data.hits.length}
        </Text>
        件{data.truncated ? "以上" : ""}
      </Text>
      <Stack aria-label={SEARCH_RESULTS_LABEL} component="ul" gap="xs" style={LIST_STYLE}>
        {data.hits.map((hit) => (
          <SearchHitRow hit={hit} key={hitKey(hit)} normalizedQuery={normalizedQuery} />
        ))}
      </Stack>
      {data.truncated && (
        <Text c="dimmed" size="sm">
          {SEARCH_TRUNCATED_MESSAGE}
        </Text>
      )}
    </Stack>
  );
}

function HistorySearchResultsPending() {
  return (
    <Shimmer loading>
      <Stack component="ul" gap="xs" style={LIST_STYLE}>
        {historyShimmerSearchHits.map((hit) => (
          <SearchHitRow hit={hit} key={hitKey(hit)} normalizedQuery="音読" />
        ))}
      </Stack>
    </Shimmer>
  );
}

export function HistorySearchResults() {
  const { searchQuery, searchRange, setRange, today } = useHistoryView();
  const [debouncedQuery] = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Text size="sm">
          「{searchQuery.trim()}」の{SEARCH_RESULTS_LABEL}
        </Text>
        <SegmentedControl
          aria-label={SEARCH_RANGE_LABEL}
          data={SEARCH_RANGE_ORDER.map((range) => ({
            label: SEARCH_RANGE_LABELS[range],
            value: range,
          }))}
          onChange={(value) => {
            if (isSearchRange(value)) {
              setRange(value);
            }
          }}
          size="xs"
          value={searchRange}
        />
      </Group>
      <Suspense fallback={<HistorySearchResultsPending />}>
        <SearchResultsList query={debouncedQuery} range={searchRange} today={today} />
      </Suspense>
    </Stack>
  );
}
