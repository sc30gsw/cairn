import { Alert, Button, Card, EmptyState, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { IconTarget } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { GoalType } from "~domain/domain";
import type { DateJst } from "~domain/jst";

import { ConcreteActionTour } from "~/components/concrete-action-tour";
import { ExamGoalCard } from "~/features/goals/components/exam-goal-card";
import { GoalForm } from "~/features/goals/components/goal-form";
import { ObstacleSection } from "~/features/goals/components/obstacle-section";
import { PaceGoalCard } from "~/features/goals/components/pace-goal-card";
import { SimpleGoalCard } from "~/features/goals/components/simple-goal-card";
import { VolumeGoalCard } from "~/features/goals/components/volume-goal-card";
import { WeeklyGoalPanel } from "~/features/goals/components/weekly-goal-panel";
import {
  WeeklyTargetsSection,
  type WeeklyTargetsSectionProps,
} from "~/features/goals/components/weekly-targets-section";
import { filterGoalsOfType, findGoalOfType } from "~/features/goals/lib/goal-selectors";
import type { GoalFormOutput } from "~/features/goals/schemas/goal-schema";
import type {
  Goal,
  GoalId,
  MasteryGoal,
  Obstacle,
  OtherGoal,
  WeeklyTrendWeeks,
} from "~/features/goals/types/goal";
import type {
  CreateObstacleInput,
  RemoveObstacleInput,
  SaveWeeklyInput,
  SetVolumeProgressInput,
  UpdateGoalInput,
  UpdateObstacleInput,
} from "~/features/goals/types/mutations";
import type { WeekPage } from "~/features/history/types/history";
import type { MinutesByDate } from "~/lib/weekly-progress";

type GoalEditor =
  | { goal: Goal; kind: "edit" }
  | { kind: "closed" }
  | { kind: "create"; type: GoalType };

type GoalsBoardProps = {
  goals: Goal[];
  minutesByDate: MinutesByDate;
  obstacles: Obstacle[];
  onCreateGoal: (goal: GoalFormOutput) => void;
  onCreateObstacle: (input: CreateObstacleInput) => void;
  onRemoveGoal: (goalId: GoalId) => void;
  onRemoveObstacle: (planId: RemoveObstacleInput["planId"]) => void;
  onSaveWeekly: (input: SaveWeeklyInput) => void;
  onSetVolumeProgress: (input: SetVolumeProgressInput) => void;
  onUpdateGoal: (input: Omit<UpdateGoalInput, "weekStartJst">) => void;
  onUpdateObstacle: (input: UpdateObstacleInput) => void;
  todayJst: DateJst;
  trendWeeks: WeeklyTrendWeeks;
  weekEndJst: WeekPage["weekEnd"];
  //? 週間ターゲットはこの板では素通し。区画ごと渡して props の数を抑える
  weeklyGoal: WeekPage["weeklyGoal"];
  weeklyTargets: WeeklyTargetsSectionProps;
};

export function GoalsBoard({
  goals,
  minutesByDate,
  obstacles,
  onCreateGoal,
  onCreateObstacle,
  onRemoveGoal,
  onRemoveObstacle,
  onSaveWeekly,
  onSetVolumeProgress,
  onUpdateGoal,
  onUpdateObstacle,
  todayJst,
  trendWeeks,
  weekEndJst,
  weeklyGoal,
  weeklyTargets,
}: GoalsBoardProps) {
  const [editor, setEditor] = useState<GoalEditor>({ kind: "closed" });
  const obstacleSectionRef = useRef<HTMLDivElement>(null);
  const examGoal = findGoalOfType(goals, "exam");
  const paceGoal = findGoalOfType(goals, "pace");
  const volumeGoals = filterGoalsOfType(goals, "volume");
  const otherGoals = goals.filter(
    (goal): goal is MasteryGoal | OtherGoal => goal.type === "mastery" || goal.type === "other",
  );

  function submitGoal(goal: GoalFormOutput) {
    if (editor.kind === "edit") {
      onUpdateGoal({ goal, goalId: editor.goal._id });
    } else {
      onCreateGoal(goal);
    }
    setEditor({ kind: "closed" });
  }

  function showObstacles() {
    obstacleSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <ConcreteActionTour screen="obstacles">
      <Grid gap="md">
        <Grid.Col span={12}>
          <Group gap="sm" justify="space-between" wrap="nowrap">
            <Title order={1}>目標</Title>
            <Button
              onClick={() =>
                setEditor({ kind: "create", type: paceGoal === undefined ? "pace" : "volume" })
              }
              type="button"
            >
              目標を追加
            </Button>
          </Group>
        </Grid.Col>
        {editor.kind !== "closed" && (
          <Grid.Col span={12}>
            <GoalForm
              goal={editor.kind === "edit" ? editor.goal : undefined}
              initialType={editor.kind === "create" ? editor.type : "pace"}
              onCancel={() => setEditor({ kind: "closed" })}
              onSubmit={submitGoal}
              todayJst={todayJst}
            />
          </Grid.Col>
        )}
        {goals.length === 0 && (
          <Grid.Col span={12}>
            <Card>
              <EmptyState
                description="まずは「週に何日、1日何分やるか」のペース目標から始めると続きます。"
                icon={<IconTarget aria-hidden />}
                title="目標がまだありません"
              />
            </Card>
          </Grid.Col>
        )}
        {examGoal !== undefined && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <ExamGoalCard
              goal={examGoal}
              hasPaceGoal={paceGoal !== undefined}
              onAddPace={() => setEditor({ kind: "create", type: "pace" })}
              onEdit={() => setEditor({ goal: examGoal, kind: "edit" })}
              onRemove={() => onRemoveGoal(examGoal._id)}
              todayJst={todayJst}
            />
          </Grid.Col>
        )}
        <Grid.Col span={{ base: 12, md: examGoal === undefined ? 12 : 6 }}>
          <Card h="100%">
            <Stack gap="md">
              {paceGoal === undefined ? (
                <Alert color="blue" title="ペース目標が未設定です" variant="light">
                  <Stack align="flex-start" gap="xs">
                    <Text size="sm">
                      週間ゴールは、ペース目標から週のはじめに写されます。まずペースを決めましょう。
                    </Text>
                    <Button
                      onClick={() => setEditor({ kind: "create", type: "pace" })}
                      size="xs"
                      type="button"
                    >
                      ペース目標を作成する
                    </Button>
                  </Stack>
                </Alert>
              ) : (
                <PaceGoalCard
                  goal={paceGoal}
                  onEdit={() => setEditor({ goal: paceGoal, kind: "edit" })}
                  onRemove={() => onRemoveGoal(paceGoal._id)}
                />
              )}
              <WeeklyGoalPanel
                hasObstacles={obstacles.length > 0}
                minutesByDate={minutesByDate}
                onSaveWeekly={onSaveWeekly}
                onShowObstacles={showObstacles}
                todayJst={todayJst}
                trendWeeks={trendWeeks}
                weekEndJst={weekEndJst}
                weeklyGoal={weeklyGoal}
              />
            </Stack>
          </Card>
        </Grid.Col>
        {volumeGoals.map((goal) => (
          <Grid.Col key={goal._id} span={{ base: 12, md: 6 }}>
            <VolumeGoalCard
              goal={goal}
              onEdit={() => setEditor({ goal, kind: "edit" })}
              onRemove={() => onRemoveGoal(goal._id)}
              onSetProgress={(currentAmount) =>
                onSetVolumeProgress({ currentAmount, goalId: goal._id })
              }
            />
          </Grid.Col>
        ))}
        {otherGoals.map((goal) => (
          <Grid.Col key={goal._id} span={{ base: 12, md: 6 }}>
            <SimpleGoalCard
              goal={goal}
              onEdit={() => setEditor({ goal, kind: "edit" })}
              onRemove={() => onRemoveGoal(goal._id)}
            />
          </Grid.Col>
        ))}
        <Grid.Col span={12}>
          <Card>
            <WeeklyTargetsSection {...weeklyTargets} />
          </Card>
        </Grid.Col>
        <Grid.Col span={12}>
          <Card ref={obstacleSectionRef}>
            <ObstacleSection
              obstacles={obstacles}
              onCreateObstacle={onCreateObstacle}
              onRemoveObstacle={onRemoveObstacle}
              onUpdateObstacle={onUpdateObstacle}
            />
          </Card>
        </Grid.Col>
      </Grid>
    </ConcreteActionTour>
  );
}
