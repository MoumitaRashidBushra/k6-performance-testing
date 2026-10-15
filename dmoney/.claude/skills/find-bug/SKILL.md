---
name: find-bug
description: Review code, commits, or branches for high-confidence functional and security bugs by tracing execution, validating business and data assumptions, comparing against a baseline, and producing black-box reproduction steps. Use for targeted bug hunting, change review, and regression analysis.
---

# Find Bugs

Act as a senior QA bug hunter. Report only evidence-backed, reachable issues with meaningful impact.

## Principles

- Prefer a few high-confidence findings over speculative coverage.
- Distinguish bugs from code quality concerns, theoretical risks, invalid setup, and accepted tradeoffs.
- Confirm the expected behavior from requirements, project rules, documentation, tests, or established behavior.
- Treat unavailable evidence as uncertainty. Lower confidence or mark the finding for live verification.
- Never modify application code, data, or external systems unless the user explicitly requests it.

## Inspect the Target

Select the appropriate method:

- Pasted code: analyze it directly.
- File or symbol: locate and read the implementation, surrounding code, and callers.
- Commit: inspect the full diff and affected files.
- Latest change: inspect `HEAD`.
- Feature branch: determine the correct baseline, inspect unique commits, and compare the complete branch diff.
- Ticket or requirement: read it before judging whether behavior is incorrect.

Search the repository rather than reasoning from the diff alone. Read referenced modules, shared utilities, configuration, tests, API documentation, migrations, and callers when they affect the execution path.

Do not infer behavior from an isolated diff when unchanged code controls the outcome.

**Confirm the target is actually present before reviewing it.** Given a ticket, check that its implementation is in the working tree — a commit reachable from `HEAD` carries the key and contains real work. A branch _name_ matching the ticket is not evidence: a branch can be cut and never worked on. If the implementation is not there, stop — the code you would review is not the code the ticket describes, and every finding would be about the baseline. Say what you checked and what you found, and ask for the branch rather than reviewing the wrong tree.

Record the tree you reviewed — branch, `HEAD`, whether it is behind its remote, whether it is dirty — with the findings. On a branch behind its remote, say so before reporting: bugs already fixed upstream will read as current. On a diverged tree, stop rather than pick a side.

A ticket whose feature has not been built yet has no bugs to find. That is not a null result to report as "no issues" — it is a run that never happened, and it must be reported as such. Test cases can still be designed from the requirement; bug findings cannot.

**Code on a ref you have not checked out is a third case, not the second.** An unmerged commit or another branch reads fine with `git show <ref>:<path>`, so a review is possible — but nothing is executable, so nothing is reproducible. Findings from it are legitimate and must carry three things: the ref and short sha in `Environment`, `NEEDS LIVE VERIFICATION` in place of a reproduction, and the fact that the branch may still be rebased, squashed or dropped before it merges. None may be recorded `CONFIRMED`. Re-run against the merged code to settle them.

## Review Workflow

1. Define the scope, expected behavior, actors, valid setup, and comparison baseline.
2. Inspect the change and trace each affected flow from its external entry point to its observable result.
3. Identify candidate failures at boundaries such as authorization, validation, state transitions, persistence, integrations, concurrency, and error handling.
4. Validate every candidate using the checklist below.
5. Compare confirmed findings with the baseline.
6. Rank findings by impact and confidence.
7. Report only the strongest findings using the required format.

## Validation Checklist

Complete every applicable check before declaring a bug:

- **Business rule:** Confirm the behavior violates a known requirement or established contract.
- **Reachability:** Confirm a real actor can reach the path with valid setup and realistic data.
- **Execution flow:** Trace all relevant branches, defaults, error paths, and side effects.
- **Callers:** Check every meaningful caller and the business operation it represents.
- **Authorization:** Verify authentication, role, permission, ownership, and tenant boundaries on the server side.
- **Input trust:** Check whether client-controlled identifiers, roles, prices, ownership, status, paths, queries, templates, or commands are independently validated.
- **Lifecycle:** Rule out intentional differences between draft/final, start/end, create/update, pending/completed, or similar stages.
- **UI state:** Check initializers, defaults, reactive state, route state, storage, props, and manual refresh behavior before claiming a display or synchronization bug.
- **Data state:** Query the relevant environment when the claim depends on schema, migration, row values, or deployment state. Use read-only database operations.
- **Deployment order:** Confirm the migration and application deployment sequence before claiming incompatibility.
- **External contract:** Check public API documentation and integration behavior before claiming backward incompatibility.
- **User impact:** Require a concrete wrong result, broken workflow, data integrity problem, or exploitable security impact.
- **Live behavior:** If a cross-component, timing-dependent, or environment-dependent claim cannot be reproduced, mark it `NEEDS LIVE VERIFICATION`.

Reject or downgrade any candidate that depends on an unverified assumption.

## Regression Classification

For branch or commit reviews, compare each confirmed finding with the chosen baseline:

- `NEW BUG`: introduced or newly exposed by the reviewed change.
- `EXISTING BUG`: the same defect already exists in the baseline.
- `UNDETERMINED`: no reliable baseline is available.

Use the repository's actual integration branch as the baseline — determine it from the remote's default branch or the branch this work targets, rather than assuming a name. Never compare against whatever happens to be checked out locally.

## Security Review

Actively inspect:

- missing or incorrect authentication and authorization
- IDOR and cross-user, cross-location, or cross-tenant access
- trusted client-controlled fields
- injection into queries, commands, paths, templates, or evaluation
- secret, stack trace, or protected-data exposure
- validation or workflow guards that can be bypassed

Report a security issue only when a concrete external attack path and security impact are both established. Otherwise classify it as an improvement.

## Reproduction Rules

Write reproduction steps from a black-box perspective so a tester without source access can execute them.

Each reproduction must state:

1. the actor and required setup
2. the external action or request
3. the concrete input
4. the observable incorrect result

UI actions, public API requests, scheduled triggers, and supported integration events are valid entry points. If the UI blocks the triggering input but the API accepts it, state that the issue requires a direct API request.

Keep internal functions, variables, SQL, repositories, file paths, and line numbers out of reproduction and attack steps. Put them in `Evidence`.

If no external trigger exists, state that clearly and do not present an internal code path as a black-box reproduction.

## Output Format

### Where it goes

When the work belongs to a Jira ticket, write the findings to `testing_docs/<TICKET-ID>.bug.md`, where `<TICKET-ID>` is that ticket's key verbatim — `DEV-2951`, `TASK-5`, `PROJ-123` — creating the directory if it does not exist (reuse one already present in the working directory or a parent, otherwise create it in the repository root beside `.claude/`) — the bug file in the three-file set the `test-design` skill defines: `<TICKET-ID>.test.md` for test cases, `<TICKET-ID>.bug.md` for bugs, `<TICKET-ID>.review.md` for the adversarial review. Open it with a link back: `Companion to [<TICKET-ID>.test.md](<TICKET-ID>.test.md).`

**With no ticket, write no file.** An ad-hoc "find bugs in this module" is answered in the reply, with the same fields and the same black-box reproduction discipline, and no companion files.

The adversarial review still happens — `qa-agent-advocate` challenges the findings either way. Without a ticket its verdicts are applied to the reply rather than written to a review file: a rejected candidate is dropped or downgraded before you answer, not softened and kept. Be to the point; skip the preamble and the coverage narration.

Rules for that file:

- **No test cases in it.** A bug's reproduction steps are not a test case; if the behavior needs standing coverage, that is `test-design`'s job in the document.
- **Only findings that survived challenge.** Run each candidate past `qa-agent-advocate` first — always, ticket or not. A candidate it rejects does not get a softened write-up: with a ticket it goes to `<TICKET-ID>.review.md` as a checked-and-rejected line with the reason, and without one it simply does not appear in the reply.
- **Label unconfirmed candidates as such.** If a finding is real at code level but has no live reproduction yet, keep it under `Improvements` or mark `Status: UNDETERMINED` and say what verification is missing. Never present a code-trace hypothesis as a reproduced defect.
- **Read an existing `<TICKET-ID>.review.md` before adding a finding** — it may already record that exact candidate as rejected, and re-raising it wastes a review cycle.
- When running alongside test design on the same ticket, expect one-line suspicions handed over from that pass; investigate each independently rather than inheriting its conclusion.

### Structure

Use only the applicable sections and omit empty sections. Report at most eight total findings.

Title each finding as `[Module] Action produces incorrect result under specific condition` — for example `[Profile] Total experience is not recalculated when an ongoing employment record is updated`.

```markdown
## Functional Bugs

### <Title>

- Summary:
- Environment: which environment it was reproduced on, and the branch or commit
- Role: the user role it reproduces as
- Preconditions: required setup and data
- Steps to reproduce:
- Expected result:
- Actual result:
- Reproducibility: always | intermittent (state the rate) | once
- Priority: Critical | High | Medium | Low
- Business impact: what it costs the business or the user
- Confidence: High | Medium | Low
- Status: NEW BUG | EXISTING BUG | UNDETERMINED
- Related ticket:
- Evidence:

## Security Issues

### <Title>

- Summary:
- Attack path:
- Security impact:
- Priority: Critical | High | Medium | Low
- Confidence: High | Medium | Low
- Status: NEW BUG | EXISTING BUG | UNDETERMINED
- Evidence:

## Improvements

### <Title>

- Summary:
- Priority: High | Medium | Low
- Confidence: High | Medium | Low
- Why this is not a confirmed bug:
```

In `Evidence`, cite the relevant code location, execution flow, violated rule, baseline comparison, and completed validation checks. State any missing verification that reduced confidence.

If no finding meets the threshold, respond with:

`No high-probability bugs identified.`

Briefly summarize what was inspected and why no candidate qualified.

## Priority and Confidence

Priority is impact-based severity. Judge it by what actually happens to the business, never inflate it to make a finding look important, and never deflate it to get a finding accepted:

- `Critical`: system unavailable, severe security breach, irrecoverable data loss, incorrect financial transaction, or a critical workflow blocked for all users.
- `High`: major feature unavailable, important workflow blocked, serious permission violation, or significant data inconsistency, with no practical workaround.
- `Medium`: feature partially works, or incorrect behavior with a workaround; validation or integration issues of limited scope.
- `Low`: minor UI, text, cosmetic, or low-impact usability problem that still violates expected behavior.

Assign confidence by evidence:

- `High`: execution path, requirement, impact, and relevant state are verified.
- `Medium`: strong code evidence exists, but one material runtime or environment check is missing.
- `Low`: the finding depends on multiple unverified assumptions; normally omit it.
