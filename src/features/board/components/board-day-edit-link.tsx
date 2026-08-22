import { Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { useBoardView } from "~/features/board/hooks/use-board-view";
import { dayEditLinkLabel, dayPageLink } from "~/lib/board-day-links";

export function BoardDayEditLink() {
  const { selectedDateJst, today } = useBoardView();
  const label = dayEditLinkLabel(selectedDateJst);
  const link = dayPageLink(selectedDateJst, today);

  return (
    <Anchor renderRoot={(props) => <Link {...props} {...link} />} underline="hover">
      {label}
    </Anchor>
  );
}
