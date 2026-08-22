import { Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { useBoardView } from "~/features/board/hooks/use-board-view";
import { dayEditLinkLabel } from "~/lib/board-day-links";

export function BoardDayEditLink() {
  const { selectedDateJst, today } = useBoardView();
  const label = dayEditLinkLabel(selectedDateJst);

  if (selectedDateJst === today) {
    return (
      <Anchor renderRoot={(props) => <Link {...props} to="/" />} underline="hover">
        {label}
      </Anchor>
    );
  }

  return (
    <Anchor
      renderRoot={(props) => (
        <Link {...props} params={{ dateJst: selectedDateJst }} to="/days/$dateJst" />
      )}
      underline="hover"
    >
      {label}
    </Anchor>
  );
}
