---- MODULE DayPage ----
\* One calendar date, as the day page classifies it.
\*
\* live     getLiveDay: the days document exists and deletedAt is unset
\*          (convex/services/days/getLiveDay.ts).
\* kind     dayViewKind (convex/lib/dayView.ts), given hasLiveDay = live.
\*          service start is the owner's createdAt in JST, so a date before
\*          it is always in the past (convex/services/days/serviceStartDate.ts,
\*          convex/serviceStartDate.test.ts).
\* heading  emptyDayCopy when the page has no rows. A trashed day yields
\*          day = null and rows = [] from getDayPage, so the empty heading shows
\*          (convex/services/days/getDayPage.ts,
\*          src/features/today/lib/empty-day-copy.ts,
\*          src/features/today/components/day-board.tsx).

VARIABLES
  when,        \* "future" | "today" | "past", this date against todayJst
  beforeStart, \* dateJst < serviceStartDateJst. Only possible when when = "past"
  stored,      \* a days document exists for this date
  trashed,     \* that document's deletedAt is set
  condition,   \* "none" | "set". The three 調子 values are one stored value here
  condEver,    \* PickCondition has stored a 調子 on this document
  rows,        \* the document has at least one row
  rowsEver,    \* WriteRecord has stored a row on this document
  place,       \* "day" is the day page. "trash" is the trash list
  told         \* requireEditableDay has thrown 「ゴミ箱の日です。先に戻してください」

vars == <<when, beforeStart, stored, trashed, condition, condEver, rows, rowsEver, place, told>>

When == {"future", "today", "past"}
Cond == {"none", "set"}
Place == {"day", "trash"}

Live == stored /\ ~trashed

Kind ==
  IF when = "future" THEN "unrecorded"
  ELSE IF Live THEN "live"
  ELSE IF beforeStart THEN "beforeRegistration"
  ELSE IF when = "today" THEN "todayEmpty"
  ELSE "rest"

TypeOK ==
  /\ when \in When
  /\ beforeStart \in BOOLEAN
  /\ stored \in BOOLEAN
  /\ trashed \in BOOLEAN
  /\ condition \in Cond
  /\ condEver \in BOOLEAN
  /\ rows \in BOOLEAN
  /\ rowsEver \in BOOLEAN
  /\ place \in Place
  /\ told \in BOOLEAN
  /\ trashed => stored
  /\ condition = "set" => stored
  /\ rows => stored
  /\ told => trashed
  /\ beforeStart => when = "past"
  /\ when = "future" => ~stored
  /\ ~stored => ~trashed /\ condition = "none" /\ ~rows /\ ~told

Init ==
  /\ place = "day"
  /\ told = FALSE
  /\ stored = FALSE
  /\ trashed = FALSE
  /\ condition = "none"
  /\ condEver = FALSE
  /\ rows = FALSE
  /\ rowsEver = FALSE
  /\ \/ /\ when = "future"
        /\ beforeStart = FALSE
     \/ /\ when = "today"
        /\ beforeStart = FALSE
     \/ /\ when = "past"
        /\ beforeStart \in BOOLEAN

\* The clock moves todayJst forward one step. A past date stays past.
Midnight ==
  /\ \/ /\ when = "future"
        /\ when' = "today"
     \/ /\ when = "today"
        /\ when' = "past"
  /\ UNCHANGED <<beforeStart, stored, trashed, condition, condEver, rows, rowsEver, place, told>>

\* setMemo with a non-empty memo creates the day when none exists.
\* An empty memo does not create a day, and a memo on an existing day
\* changes no variable in this model (convex/services/days/setMemo.ts).
WriteMemo ==
  /\ place = "day"
  /\ ~trashed
  /\ when \in {"today", "past"}
  /\ ~stored
  /\ stored' = TRUE
  /\ UNCHANGED <<when, beforeStart, trashed, condition, condEver, rows, rowsEver, place, told>>

\* rows.add. requireEditableDay, then requireLiveDay, then insert the row
\* (convex/services/rows/add.ts, convex/services/days/requireLiveDay.ts).
WriteRecord ==
  /\ place = "day"
  /\ ~trashed
  /\ when \in {"today", "past"}
  /\ ~rows
  /\ stored' = TRUE
  /\ rows' = TRUE
  /\ rowsEver' = TRUE
  /\ UNCHANGED <<when, beforeStart, trashed, condition, condEver, place, told>>

\* setCondition. requireLiveDay creates a missing day, then the patch sets condition
\* and leaves rows alone (convex/services/days/setCondition.ts).
PickCondition ==
  /\ place = "day"
  /\ ~trashed
  /\ when \in {"today", "past"}
  /\ condition = "none"
  /\ stored' = TRUE
  /\ condition' = "set"
  /\ condEver' = TRUE
  /\ UNCHANGED <<when, beforeStart, trashed, rows, rowsEver, place, told>>

\* removeDay sets deletedAt on whatever document exists, including one dated
\* before service start. It does not clear condition or rows
\* (convex/services/trash/removeDay.ts). The button is on the day page.
TrashDay ==
  /\ place = "day"
  /\ stored
  /\ ~trashed
  /\ trashed' = TRUE
  /\ UNCHANGED <<when, beforeStart, stored, condition, condEver, rows, rowsEver, place, told>>

\* requireEditableDay throws when deletedAt is set. The page kind stays
\* (convex/services/days/requireEditableDay.ts).
TryEdit ==
  /\ place = "day"
  /\ trashed
  /\ ~told
  /\ told' = TRUE
  /\ UNCHANGED <<when, beforeStart, stored, trashed, condition, condEver, rows, rowsEver, place>>

\* The trash list is a different screen. Opening it does not change the document.
OpenTrash ==
  /\ place = "day"
  /\ trashed
  /\ place' = "trash"
  /\ UNCHANGED <<when, beforeStart, stored, trashed, condition, condEver, rows, rowsEver, told>>

\* Closing the trash list returns to this date's day page.
CloseTrash ==
  /\ place = "trash"
  /\ place' = "day"
  /\ UNCHANGED <<when, beforeStart, stored, trashed, condition, condEver, rows, rowsEver, told>>

\* restoreDay patches deletedAt off and no other field. The screen stays the
\* trash list (src/features/trash/components/trash-page.tsx).
Restore ==
  /\ place = "trash"
  /\ trashed
  /\ trashed' = FALSE
  /\ told' = FALSE
  /\ UNCHANGED <<when, beforeStart, stored, condition, condEver, rows, rowsEver, place>>

Next ==
  \/ Midnight
  \/ WriteMemo
  \/ WriteRecord
  \/ PickCondition
  \/ TrashDay
  \/ TryEdit
  \/ OpenTrash
  \/ CloseTrash
  \/ Restore

Spec == Init /\ [][Next]_vars

\* A trashed day still open on the day page is not classified as an empty
\* today or a rest day. The trash list is outside this, because that screen
\* lists the day as trash. The edit toast does not change the kind.
TrashDayIsObvious ==
  ~trashed \/ place = "trash" \/ Kind \notin {"todayEmpty", "rest"}

\* Once setCondition has stored a 調子, later steps in this model still have it
\* on the same document. Restore only clears deletedAt.
ConditionSurvives == condEver => condition = "set" /\ stored

\* Once a row has been added, later steps in this model still have it on the
\* same document. setCondition, setMemo, removeDay, and restoreDay do not
\* delete rows.
RowsSurvive == rowsEver => rows /\ stored

====
