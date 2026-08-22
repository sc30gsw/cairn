import { Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { todayJst } from "~domain/jst";

import { useDayPageDateJst } from "~/features/today/hooks/use-day-page-date-jst";
import { boardKanbanLinkLabel } from "~/lib/board-day-links";

export function DayBoardKanbanLink() {
  const dateJst = useDayPageDateJst();
  const todayJstValue = todayJst();
  const label = boardKanbanLinkLabel(dateJst);

  if (dateJst === todayJstValue) {
    return (
      <Anchor
        renderRoot={(props) => <Link {...props} search={{ tab: "kanban" }} to="/board" />}
        underline="hover"
      >
        {label}
      </Anchor>
    );
  }

  return (
    <Anchor
      renderRoot={(props) => (
        <Link {...props} search={{ date: dateJst, tab: "kanban" }} to="/board" />
      )}
      underline="hover"
    >
      {label}
    </Anchor>
  );
}
