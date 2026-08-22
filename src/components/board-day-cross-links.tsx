import { Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { DateJst } from "~domain/jst";

import { boardKanbanLinkLabel, dayEditLinkLabel } from "~/lib/board-day-links";

export function DayEditCrossLink({ dateJst, todayJst }: { dateJst: DateJst; todayJst: DateJst }) {
  const label = dayEditLinkLabel(dateJst);

  if (dateJst === todayJst) {
    return (
      <Anchor renderRoot={(props) => <Link {...props} to="/" />} underline="hover">
        {label}
      </Anchor>
    );
  }

  return (
    <Anchor
      renderRoot={(props) => <Link {...props} params={{ dateJst }} to="/days/$dateJst" />}
      underline="hover"
    >
      {label}
    </Anchor>
  );
}

export function BoardKanbanCrossLink({
  dateJst,
  todayJst,
}: {
  dateJst: DateJst;
  todayJst: DateJst;
}) {
  const label = boardKanbanLinkLabel(dateJst);

  if (dateJst === todayJst) {
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
