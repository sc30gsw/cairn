---- MODULE OneTimer ----
\* Two rows on one live day. clock means timerStartedAt is set.
\* status is the row's status. A clock is only legal on 進行中.
\*
\* start, resumeTimer, and reopen each call stopRunningTimer first, which
\* clears every other row's timerStartedAt and leaves that row's status alone
\* (convex/services/rows/start.ts, resumeTimer.ts, reopen.ts,
\* stopRunningTimer.ts).
\* stopTimer and autoStopTimers clear the clock and leave status at 進行中
\* (stopTimer.ts, autoStopTimers.ts).
\* confirm, skip, and unstart clear that row's clock (confirm.ts, skip.ts,
\* unstart.ts). unconfirm and unskip do not start a clock.

EXTENDS Integers, FiniteSets

VARIABLES status, clock

Rows == {"a", "b"}
Statuses == {"pending", "ongoing", "confirmed", "skipped"}

vars == <<status, clock>>

\* pending = 未着手, ongoing = 進行中, confirmed = 確定, skipped = スキップ

TypeOK ==
  /\ status \in [Rows -> Statuses]
  /\ clock \in [Rows -> BOOLEAN]
  /\ \A r \in Rows: clock[r] => status[r] = "ongoing"

AtMostOneClock == Cardinality({r \in Rows: clock[r]}) <= 1

Init ==
  /\ status = [r \in Rows |-> "pending"]
  /\ clock = [r \in Rows |-> FALSE]

\* The caller's clock turns on. Every other clock turns off. Status of the
\* others stays whatever stopRunningTimer left (it does not change status).
OnlySelf(self) == [r \in Rows |-> r = self]

Start(self) ==
  /\ status[self] = "pending"
  /\ status' = [status EXCEPT ![self] = "ongoing"]
  /\ clock' = OnlySelf(self)

Resume(self) ==
  /\ status[self] = "ongoing"
  /\ ~clock[self]
  /\ UNCHANGED status
  /\ clock' = OnlySelf(self)

Reopen(self) ==
  /\ status[self] = "confirmed"
  /\ status' = [status EXCEPT ![self] = "ongoing"]
  /\ clock' = OnlySelf(self)

Stop(self) ==
  /\ clock[self]
  /\ UNCHANGED status
  /\ clock' = [clock EXCEPT ![self] = FALSE]

AutoStop(self) ==
  /\ clock[self]
  /\ UNCHANGED status
  /\ clock' = [clock EXCEPT ![self] = FALSE]

Confirm(self) ==
  /\ status[self] # "confirmed" \/ clock[self]
  /\ status' = [status EXCEPT ![self] = "confirmed"]
  /\ clock' = [clock EXCEPT ![self] = FALSE]

Skip(self) ==
  /\ status[self] # "skipped" \/ clock[self]
  /\ status' = [status EXCEPT ![self] = "skipped"]
  /\ clock' = [clock EXCEPT ![self] = FALSE]

Unstart(self) ==
  /\ status[self] = "ongoing"
  /\ status' = [status EXCEPT ![self] = "pending"]
  /\ clock' = [clock EXCEPT ![self] = FALSE]

Unskip(self) ==
  /\ status[self] = "skipped"
  /\ status' = [status EXCEPT ![self] = "pending"]
  /\ UNCHANGED clock

Unconfirm(self) ==
  /\ status[self] = "confirmed"
  /\ status' = [status EXCEPT ![self] = "pending"]
  /\ UNCHANGED clock

Next ==
  \E self \in Rows:
    \/ Start(self)
    \/ Resume(self)
    \/ Reopen(self)
    \/ Stop(self)
    \/ AutoStop(self)
    \/ Confirm(self)
    \/ Skip(self)
    \/ Unstart(self)
    \/ Unskip(self)
    \/ Unconfirm(self)

Spec == Init /\ [][Next]_vars

====
