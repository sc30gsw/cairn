import { ActionIcon, Badge, Group, Text, Tooltip } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { Spotlight, spotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { isDateJst } from "~domain/jst";
import { isSearchableQuery, normalizeSearchQuery, normalizeSearchText } from "~domain/searchText";

import type { HistorySearchHitDto } from "~/../convex/lib/validators/history";
import { OverflowTooltip } from "~/components/overflow-tooltip";
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
  spotlightKindColor,
} from "~/lib/spotlight-copy";
import { NUMERAL_FONT } from "~/lib/theme";

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

function openSearchHit(navigate: ReturnType<typeof useNavigate>, hit: HistorySearchHitDto): void {
  if ((hit.kind === "hitokoto" || hit.kind === "memo") && hit.dateJst !== undefined) {
    void navigate({ params: { dateJst: hit.dateJst }, to: "/days/$dateJst" });
    return;
  }
  if (hit.kind === "event") {
    void navigate({
      search: {
        date: hit.dateJst !== undefined && isDateJst(hit.dateJst) ? hit.dateJst : undefined,
        tab: "plan",
      },
      to: "/plan",
    });
    return;
  }
  if (hit.kind === "plan" || hit.kind === "obstacle") {
    void navigate({ search: { tab: "plan" }, to: "/plan" });
    return;
  }
  if (hit.kind === "item") {
    void navigate({ to: "/items" });
    return;
  }
  if (hit.kind === "goal") {
    void navigate({ to: "/goals" });
    return;
  }
  if (hit.kind === "method") {
    void navigate({ to: "/methods" });
  }
}

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
        const excerptText = `${excerpt.before}${excerpt.match}${excerpt.after}`;
        return (
          <OverflowTooltip<HTMLButtonElement>
            content={`${hit.title}\n${excerptText}`}
            key={`${hit.kind}-${hit.documentId}`}
          >
            {(ref) => (
              <Spotlight.Action
                ref={ref}
                onClick={() => {
                  openSearchHit(navigate, hit);
                }}
              >
                <Group gap="sm" w="100%" wrap="nowrap">
                  {hit.dateJst === undefined ? null : (
                    <Text c="dimmed" ff={NUMERAL_FONT} size="sm">
                      {hit.dateJst}
                    </Text>
                  )}
                  <Badge color={spotlightKindColor(hit.kind)} size="sm" variant="light">
                    {SPOTLIGHT_KIND_LABELS[hit.kind]}
                  </Badge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text lineClamp={1} size="sm">
                      {hit.title}
                    </Text>
                    <Text c="dimmed" lineClamp={1} size="xs">
                      {excerptText}
                    </Text>
                  </div>
                </Group>
              </Spotlight.Action>
            )}
          </OverflowTooltip>
        );
      })}
    </Spotlight.ActionsGroup>
  );
}

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
