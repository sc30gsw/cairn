import {
  Alert,
  Box,
  Button,
  Card,
  EmptyState,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconNotes } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { Result } from "better-result";
import { isDateJst } from "~domain/jst";

import { ConcreteActionTour, ConcreteActionTourTrigger } from "~/components/concrete-action-tour";
import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";
import { LearningDateNavigation } from "~/components/learning-date-navigation";
import { ShareCopy } from "~/components/share-copy";
import { AdhocRowForm } from "~/features/today/components/adhoc-row-form";
import {
  useOptionalDayBoardContext,
  type DayBoardContextValue,
} from "~/features/today/components/day-board-context";
import { DayBoardKanbanLink } from "~/features/today/components/day-board-kanban-link";
import { DayMetaPanel } from "~/features/today/components/day-meta-panel";
import { DayRecordGroup } from "~/features/today/components/day-record-group";
import { useDayBoardActions } from "~/features/today/hooks/use-day-board-actions";
import { emptyDayCopy } from "~/features/today/lib/empty-day-copy";
import { groupDayRowsByItem } from "~/features/today/lib/group-day-rows";
import { BODY_FONT, NUMERAL_FONT } from "~/lib/theme";

type DayBoardProps = {
  interactive?: boolean;
} & Partial<DayBoardContextValue>;

function requireDayBoardField<K extends keyof DayBoardContextValue>(
  context: DayBoardContextValue | null,
  overrides: Partial<DayBoardContextValue>,
  key: K,
): DayBoardContextValue[K] {
  const value = overrides[key] ?? context?.[key];
  if (value === undefined) {
    throw new Error(`DayBoard requires ${String(key)} via props or DayBoardProvider`);
  }
  return value;
}

export function DayBoard(props: DayBoardProps) {
  const context = useOptionalDayBoardContext();
  const interactive = props.interactive ?? true;
  const dateJst = requireDayBoardField(context, props, "dateJst");
  const day = requireDayBoardField(context, props, "day");
  const items = requireDayBoardField(context, props, "items");
  const todayJst = requireDayBoardField(context, props, "todayJst");
  const remainderMessage = props.remainderMessage ?? context?.remainderMessage ?? null;
  const onConfirmedCategory = props.onConfirmedCategory ?? context?.onConfirmedCategory;
  const navigate = useNavigate();
  const {
    onAddRow,
    onConfirm,
    onCopyYesterday,
    onFlagReview,
    onRemoveDay,
    onRemoveRow,
    onSaveCondition,
    onSaveMemo,
    onSkip,
    onSkipMany,
    onUnflagReview,
    onUnskip,
    onUnskipMany,
    onConfirmMany,
  } = useDayBoardActions(dateJst, day.rows, { onConfirmedCategory });
  const canEdit = day.kind !== "unrecorded";
  const emptyCopy = emptyDayCopy(day.kind);

  const goToDate = (next: string) => {
    if (!isDateJst(next)) {
      return;
    }
    if (next === todayJst) {
      void navigate({ to: "/" });
      return;
    }
    void navigate({ params: { dateJst: next }, to: "/days/$dateJst" });
  };

  return (
    <ConcreteActionTour screen="today">
      <Stack gap="md">
        <Card>
          <Grid align="center">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <LearningDateNavigation
                dateJst={dateJst}
                linkSlot={
                  <Text c="dimmed" size="sm">
                    <DayBoardKanbanLink />
                  </Text>
                }
                onDateChange={goToDate}
                onGoToToday={() => void navigate({ to: "/" })}
                todayJst={todayJst}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Text c="dimmed" size="sm">
                学習量
              </Text>
              <Title ff={NUMERAL_FONT} fw={700} lh={1} order={1}>
                {day.volumeMinutes}
                <Text c="dimmed" ff={BODY_FONT} fz="lg" span>
                  分
                </Text>
              </Title>
            </Grid.Col>
          </Grid>
        </Card>
        <Card>
          <Stack gap="md">
            <Group gap="xs" wrap="nowrap">
              <Title order={2}>記録</Title>
              <ConcreteActionTourTrigger />
            </Group>
            {groupDayRowsByItem(day.rows).map((group, index) => (
              <Box
                data-onboarding-tour-id={
                  index === 0 ? CONCRETE_ACTION_TOUR_TARGETS.today : undefined
                }
                key={group.itemId}
              >
                <DayRecordGroup
                  disabled={!canEdit || !interactive}
                  group={group}
                  onConfirm={interactive ? onConfirm : async () => Result.ok(null)}
                  onConfirmMany={interactive ? onConfirmMany : async () => Result.ok(null)}
                  onFlagReview={interactive ? onFlagReview : () => {}}
                  onRemove={interactive ? onRemoveRow : () => {}}
                  onSkip={interactive ? onSkip : () => {}}
                  onSkipMany={interactive ? onSkipMany : () => {}}
                  onUnflagReview={interactive ? onUnflagReview : () => {}}
                  onUnskip={interactive ? onUnskip : () => {}}
                  onUnskipMany={interactive ? onUnskipMany : () => {}}
                  todayJst={todayJst}
                />
              </Box>
            ))}
            {day.rows.length === 0 ? (
              <Box data-onboarding-tour-id={CONCRETE_ACTION_TOUR_TARGETS.today}>
                <EmptyState
                  description={emptyCopy.description}
                  icon={<IconNotes aria-hidden />}
                  title={emptyCopy.title}
                />
              </Box>
            ) : null}
            {remainderMessage === null ? null : (
              <Alert color="blue" title="週間ターゲット">
                {remainderMessage}
              </Alert>
            )}
            {canEdit && interactive ? (
              <Button disabled={!day.canCopyYesterday} onClick={onCopyYesterday} variant="light">
                昨日の確定をコピー
              </Button>
            ) : null}
            {canEdit && interactive ? <AdhocRowForm items={items} onAdd={onAddRow} /> : null}
          </Stack>
        </Card>
        {canEdit ? (
          <Card>
            <DayMetaPanel
              condition={day.day?.condition ?? null}
              memo={day.day?.memo ?? null}
              onSaveCondition={interactive ? onSaveCondition : () => {}}
              onSaveMemo={interactive ? onSaveMemo : () => {}}
            />
          </Card>
        ) : null}
        <Card>
          <ShareCopy markdown={day.shareMarkdown} />
        </Card>
        {canEdit && interactive && day.day !== null ? (
          <Button color="red" onClick={onRemoveDay} variant="light">
            この日をゴミ箱へ
          </Button>
        ) : null}
      </Stack>
    </ConcreteActionTour>
  );
}
