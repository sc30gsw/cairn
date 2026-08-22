import { Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { todayJst } from "~domain/jst";

import { useDayPageDateJst } from "~/features/today/hooks/use-day-page-date-jst";
import { boardKanbanLink, boardKanbanLinkLabel } from "~/lib/board-day-links";

export function DayBoardKanbanLink() {
  const dateJst = useDayPageDateJst();
  const todayJstValue = todayJst();
  const label = boardKanbanLinkLabel(dateJst);
  const link = boardKanbanLink(dateJst, todayJstValue);

  return (
    <Anchor renderRoot={(props) => <Link {...props} {...link} />} underline="hover">
      {label}
    </Anchor>
  );
}
