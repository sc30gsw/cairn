import { Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { useDayPageDateJst } from "~/features/today/hooks/use-day-page-date-jst";
import { useTodayJst } from "~/hooks/use-today-jst";
import { boardKanbanLink, boardKanbanLinkLabel } from "~/lib/board-day-links";

export function DayBoardKanbanLink() {
  const dateJst = useDayPageDateJst();
  const todayJstValue = useTodayJst();
  const label = boardKanbanLinkLabel(dateJst);
  const link = boardKanbanLink(dateJst, todayJstValue);

  return (
    <Anchor renderRoot={(props) => <Link {...props} {...link} />} underline="hover">
      {label}
    </Anchor>
  );
}
