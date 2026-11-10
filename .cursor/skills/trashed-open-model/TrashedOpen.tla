---- MODULE TrashedOpen ----
\* One date that already has a day document, and whether opening it or
\* materializing its plan writes onto that document while deletedAt is set.
\*
\* openDay returns before any write when getDayByDate finds deletedAt
\* (convex/services/days/openDay.ts).
\* materializePlanEventsForDate returns before inserting rows in the same case
\* (convex/services/plan/openDate.ts).
\* A due review is one with reviewRowId unset and dueJst on or before the date
\* (convex/services/reviews/placeDueReviews.ts dueUnplacedFlags).
\* A pending plan is an item event whose materializedRowId is unset
\* (pendingPlanMaterializations). Title-only events never become rows, so they
\* are plan = "none" here.

VARIABLES
  trashed,             \* the day's deletedAt is set
  review,              \* "none" | "due" | "placed"
  plan,                \* "none" | "pending" | "materialized"
  placedWhileTrashed   \* a write from Open or Materialize happened while trashed

vars == <<trashed, review, plan, placedWhileTrashed>>

Review == {"none", "due", "placed"}
Plan == {"none", "pending", "materialized"}

TypeOK ==
  /\ trashed \in BOOLEAN
  /\ review \in Review
  /\ plan \in Plan
  /\ placedWhileTrashed \in BOOLEAN
  /\ review = "placed" => review \in Review
  /\ plan = "materialized" => plan \in Plan

Init ==
  /\ trashed = FALSE
  /\ placedWhileTrashed = FALSE
  /\ \/ /\ review = "due" /\ plan = "pending"
     \/ /\ review = "due" /\ plan = "none"
     \/ /\ review = "none" /\ plan = "pending"
     \/ /\ review = "none" /\ plan = "none"

\* removeDay sets deletedAt and does not clear reviews or plan events
\* (convex/services/trash/removeDay.ts).
Trash ==
  /\ ~trashed
  /\ trashed' = TRUE
  /\ UNCHANGED <<review, plan, placedWhileTrashed>>

\* openDay. The trashed branch writes nothing. The live branch places a due
\* review and materializes a pending item plan in one call.
Open ==
  /\ ~trashed
  /\ review = "due" \/ plan = "pending"
  /\ review' = IF review = "due" THEN "placed" ELSE review
  /\ plan' = IF plan = "pending" THEN "materialized" ELSE plan
  /\ UNCHANGED <<trashed, placedWhileTrashed>>

\* materializePlanEventsForDate. Item plans only. It does not place reviews.
Materialize ==
  /\ ~trashed
  /\ plan = "pending"
  /\ plan' = "materialized"
  /\ UNCHANGED <<trashed, review, placedWhileTrashed>>

\* restoreDay clears deletedAt only (convex/services/trash/restoreDay.ts).
Restore ==
  /\ trashed
  /\ trashed' = FALSE
  /\ UNCHANGED <<review, plan, placedWhileTrashed>>

Next ==
  \/ Trash
  \/ Open
  \/ Materialize
  \/ Restore

Spec == Init /\ [][Next]_vars

\* Neither entry point attaches a review row or a plan row while deletedAt is set.
NothingPlacedInTrash == ~placedWhileTrashed

====
