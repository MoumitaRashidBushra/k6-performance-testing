Use the qa-agent to complete the following task:

$ARGUMENTS

## Why qa-agent stops mid-task

qa-agent only has `Read`, `Bash`, and MCP tools — no `AskUserQuestion`, no `Agent`. It cannot ask you a question or spawn another agent itself. So when it ends its turn with a `## Test data needed` block, or questions about environment, logins, or which record to use, that is expected, not a failure. Two things become your job instead of its:

## Job 1: Relay its questions

Put them to the user with `AskUserQuestion`, batched into one round.

### Special case: "where is the ticket's code?"

qa-agent asks this on any ticket whose implementation is not reachable from `HEAD` — whatever was requested, test cases included, since a doc written against unmerged code inherits its expectations from a branch that can still change. Relay all four options; the user picks:

| Answer                | What you do                                                                                                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| already on the branch | re-invoke for the full run — it re-verifies rather than trusting the answer                                                                                                                                                                                                                              |
| will switch           | **do not re-invoke.** Report that it is waiting and end the turn — for good, not until a timer expires. The user switches whenever ready and asks again themselves, as a fresh `/qa-agent` run. Never switch the branch for them either — the git guardrail covers checkout, and it's their working tree |
| read it where it is   | re-invoke for unmerged-code mode — full code-derived design from `git show <ref>`, every code-derived fact labelled with the ref, nothing marked executable                                                                                                                                              |
| treat it as not built | re-invoke for tests-first mode — `<KEY>.test.md` + `<KEY>.review.md`, no bug file                                                                                                                                                                                                                        |

Both reduced modes are designed outcomes, not partial failures: do not ask for a bug file that was deliberately not written, and do not treat `Any Issue?` as a format violation whatever it reads — omitted when there's no code to hunt in, `N/A — bug hunt not yet run` on every case when there's code but no bug pass ran yet (the normal state right after a test-case-only run — see Job 4), `No`/`Yes — [...]` once one has. Where qa-agent already named candidate records it found in the database, offer its suggestion as the first option rather than asking open-ended. Never invent a value on the user's behalf, and never supply a password it did not ask for.

## Job 2: Re-invoke with the answers

Re-invoke qa-agent with the answers so it can verify each value against the database and finish the work it said was blocked. Keep whatever it already delivered — the answers unblock the remainder, they do not restart the task.

## Job 3: Spawn the adversarial review

qa-agent cannot do this itself. When it produced test cases, acceptance criteria, or bug findings, launch `qa-agent-advocate` in the matching mode — `Test Case Review Mode` or `Bug Review Mode` — and do not present its output as confirmed until that review has run. qa-agent ends with a handoff line naming the mode it needs. Skip the review only for an explanation, a root-cause analysis, or a general answer.

## Job 4: Offer the bug hunt as a separate step, don't bundle it

A plain "write test cases" ask no longer runs `find-bug` automatically — qa-agent produces `<KEY>.test.md` + `<KEY>.review.md` only, every case's `Any Issue?` line reading `N/A — bug hunt not yet run`, and its final line reads something like `Bug hunt not run — this was a test-case-only request. Want me to run find-bug on <KEY> now? (yes/no)`. When you see that line:

1. Deliver the reviewed test cases to the user first — the advocate's Test Case Review Mode pass has already run on them per Job 3, so they're presentable now, not blocked on anything else. The uniform `N/A` on every case is expected, not a gap — say so if the user hasn't seen the format before.
2. Ask the bug-hunt question yourself with `AskUserQuestion` (yes / no), in the same turn.
3. **Yes** — re-invoke qa-agent with an explicit bug-hunting task for that ticket (e.g. "find bugs in <KEY>"). It re-reads the `<KEY>.test.md`/`<KEY>.review.md` it already wrote rather than redoing Step 4/5 from scratch, runs `find-bug`, then **rewrites `<KEY>.test.md` in full** to flip every `N/A` line to `No` or `Yes — [<KEY>.bug.md](<KEY>.bug.md)`, writes `<KEY>.bug.md`, and appends to `<KEY>.review.md`. Once it finishes, run Job 3 again — spawn `qa-agent-advocate` in `Bug Review Mode` — before presenting any finding as confirmed, and check the advocate confirms the `N/A`→`No`/`Yes` rewrite is complete and consistent (no stray `N/A` left after a pass ran, no case's cases/steps/data altered in the rewrite).
4. **No** — stop here. Don't run `find-bug`, don't spawn a Bug Review Mode pass, and don't ask again later on your own initiative. `<KEY>.test.md` keeps its `N/A` lines exactly as delivered. The user can trigger it whenever they want, in a fresh message ("find bugs in <KEY>", `/qa-agent find bugs in <KEY>") — treat that like any other qa-agent task, not a continuation you need to remember.

This split is the point: it's what keeps a plain test-case request from silently paying for a bug pass and two stacked advocate reviews before anything comes back. Don't re-bundle it by pre-emptively asking for a bug hunt on a request that only asked for test cases.
