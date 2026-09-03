import { ActionIcon, Badge, Group, Text, Tooltip } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { Spotlight, spotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { isSearchableQuery, normalizeSearchQuery, normalizeSearchText } from "~domain/searchText";

import { useHistorySearch } from "~/hooks/history-search-queries";
import { NAV, type NavEntry } from "~/lib/app-nav";
import { searchExcerpt } from "~/lib/search-excerpt";
import {
  SPOTLIGHT_HINT,
  SPOTLIGHT_KIND_LABELS,
  SPOTLIGHT_LABEL,
  SPOTLIGHT_LOADING,
  SPOTLIGHT_NAV_GROUP,
  SPOTLIGHT_NOTHING_FOUND,
  SPOTLIGHT_PLACEHOLDER,
  SPOTLIGHT_RECORD_LIMIT,
  SPOTLIGHT_RECORDS_GROUP,
} from "~/lib/spotlight-copy";
import { NUMERAL_FONT } from "~/lib/theme";

//? 打鍵ごとに Convex へ問い合わせない。入力欄は即時、購読だけ遅らせる
const SPOTLIGHT_DEBOUNCE_MS = 250;

function matchingNav(query: string): NavEntry[] {
  const normalized = normalizeSearchQuery(query);
  if (normalized === "") {
    return NAV;
  }
  return NAV.filter((entry) => normalizeSearchText(entry.label).includes(normalized));
}

type SpotlightRecordActionsProps = {
  navCount: number;
  query: string;
};

//? 期間は絞らない。パレットは「どこにあるか分からないもの」を探す場所なので全期間を見る
function SpotlightRecordActions({ navCount, query }: SpotlightRecordActionsProps) {
  const navigate = useNavigate();
  const { data } = useHistorySearch(query, undefined);
  const normalized = normalizeSearchQuery(query);
  const hits = data.hits.slice(0, SPOTLIGHT_RECORD_LIMIT);

  if (hits.length === 0) {
    return navCount === 0 ? <Spotlight.Empty>{SPOTLIGHT_NOTHING_FOUND}</Spotlight.Empty> : null;
  }

  return (
    <Spotlight.ActionsGroup label={SPOTLIGHT_RECORDS_GROUP}>
      {hits.map((hit) => {
        const excerpt = searchExcerpt(hit.text, normalized);
        return (
          <Spotlight.Action
            key={hit.rowId ?? `memo-${hit.dateJst}`}
            onClick={() => {
              void navigate({ params: { dateJst: hit.dateJst }, to: "/days/$dateJst" });
            }}
          >
            <Group gap="sm" w="100%" wrap="nowrap">
              <Text c="dimmed" ff={NUMERAL_FONT} size="sm">
                {hit.dateJst}
              </Text>
              <Badge color={hit.kind === "memo" ? "orange" : "green"} size="sm" variant="light">
                {SPOTLIGHT_KIND_LABELS[hit.kind]}
              </Badge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" truncate>
                  {hit.title}
                </Text>
                <Text c="dimmed" size="xs" truncate>
                  {excerpt.before}
                  {excerpt.match}
                  {excerpt.after}
                </Text>
              </div>
            </Group>
          </Spotlight.Action>
        );
      })}
    </Spotlight.ActionsGroup>
  );
}

//? Cmd/Ctrl + K で開く横断検索。記録・メモの検索と画面移動を1つの窓にまとめる
export function AppSpotlight() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, SPOTLIGHT_DEBOUNCE_MS);
  const navEntries = matchingNav(query);
  const searchable = isSearchableQuery(debouncedQuery);

  return (
    <Spotlight.Root
      clearQueryOnClose
      closeOnActionTrigger
      maxHeight={400}
      onQueryChange={setQuery}
      query={query}
      scrollable
    >
      <Spotlight.Search
        leftSection={<IconSearch aria-hidden size={18} stroke={1.5} />}
        placeholder={SPOTLIGHT_PLACEHOLDER}
      />
      <Spotlight.ActionsList>
        {navEntries.length > 0 && (
          <Spotlight.ActionsGroup label={SPOTLIGHT_NAV_GROUP}>
            {navEntries.map(({ Icon, label, to }) => (
              <Spotlight.Action
                key={to}
                label={label}
                leftSection={<Icon aria-hidden size={18} stroke={1.5} />}
                onClick={() => {
                  void navigate({ to });
                }}
              />
            ))}
          </Spotlight.ActionsGroup>
        )}
        {searchable ? (
          <Suspense fallback={<Spotlight.Empty>{SPOTLIGHT_LOADING}</Spotlight.Empty>}>
            <SpotlightRecordActions navCount={navEntries.length} query={debouncedQuery} />
          </Suspense>
        ) : (
          navEntries.length === 0 && <Spotlight.Empty>{SPOTLIGHT_HINT}</Spotlight.Empty>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
}

export function SpotlightTrigger() {
  return (
    <Tooltip label={`${SPOTLIGHT_LABEL}（⌘K）`} withArrow>
      <ActionIcon
        aria-label={SPOTLIGHT_LABEL}
        color="gray"
        onClick={spotlight.open}
        size="lg"
        variant="subtle"
      >
        <IconSearch aria-hidden size={18} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
}
