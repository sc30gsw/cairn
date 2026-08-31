import { ActionIcon, Menu, Tooltip } from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconDotsVertical,
  IconPlayerPlay,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import { useState } from "react";

import {
  kanbanMoveMenuItems,
  shiftRowWithinColumn,
  type KanbanColumn,
  type KanbanStatusMove,
} from "~/features/board/lib/kanban-order";
import type { BoardRow } from "~/features/board/types/board";

type MoveItem = { column: KanbanColumn; move: Exclude<KanbanStatusMove, "noop"> };

type BoardKanbanCardMenuProps = {
  disabled: boolean;
  onStatusMove: (move: Exclude<KanbanStatusMove, "noop">, row: BoardRow) => Promise<unknown>;
  onShift: (direction: -1 | 1, row: BoardRow) => void;
  row: BoardRow;
  rows: readonly BoardRow[];
};

const MOVE_LABEL = {
  スキップ: "見送りにする",
  未着手: "未着手に戻す",
  確定: "完了にする",
  進行中: "進行中にする",
} as const satisfies Record<KanbanColumn, string>;

const MOVE_ICON = {
  スキップ: IconPlayerSkipForward,
  未着手: IconArrowBackUp,
  確定: IconCheck,
  進行中: IconPlayerPlay,
} as const satisfies Record<KanbanColumn, typeof IconCheck>;

function moveIcon({ column }: MoveItem) {
  const Icon = MOVE_ICON[column];
  return <Icon aria-hidden size={16} stroke={1.5} />;
}

export function BoardKanbanCardMenu({
  disabled,
  onStatusMove,
  onShift,
  row,
  rows,
}: BoardKanbanCardMenuProps) {
  const [pending, setPending] = useState(false);
  const moves = kanbanMoveMenuItems(row.status);
  const canShiftUp = shiftRowWithinColumn(rows, row._id, -1) !== null;
  const canShiftDown = shiftRowWithinColumn(rows, row._id, 1) !== null;

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Tooltip label="移動・並べ替え" withArrow>
          <ActionIcon
            aria-label={`${row.itemName} の操作`}
            color="gray"
            disabled={disabled}
            loading={pending}
            size="md"
            variant="subtle"
          >
            <IconDotsVertical aria-hidden size={16} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>移動</Menu.Label>
        {moves.map((item) => (
          <Menu.Item
            key={item.column}
            leftSection={moveIcon(item)}
            onClick={() => {
              setPending(true);
              void onStatusMove(item.move, row).finally(() => setPending(false));
            }}
          >
            {MOVE_LABEL[item.column]}
          </Menu.Item>
        ))}
        {canShiftUp || canShiftDown ? (
          <>
            <Menu.Divider />
            <Menu.Label>並べ替え</Menu.Label>
            {canShiftUp ? (
              <Menu.Item
                leftSection={<IconArrowUp aria-hidden size={16} stroke={1.5} />}
                onClick={() => onShift(-1, row)}
              >
                上へ
              </Menu.Item>
            ) : null}
            {canShiftDown ? (
              <Menu.Item
                leftSection={<IconArrowDown aria-hidden size={16} stroke={1.5} />}
                onClick={() => onShift(1, row)}
              >
                下へ
              </Menu.Item>
            ) : null}
          </>
        ) : null}
      </Menu.Dropdown>
    </Menu>
  );
}
