---
name: test-design
description: >
  Design executable, black-box-first sanity tests for a changed feature and its directly related
  regression surface. Use for Jira tickets, requirements, PRs, commits, code changes, feature
  files, endpoints, modules, services, and requests such as "write test cases", "design tests",
  "what should I test", or "sanity tests for this PR". Establish evidence from requirements,
  diffs, contracts, callers, validators, existing tests, and system flows, then produce the
  smallest risk-based test set that verifies the promised behavior. Explain the feature in
  business language only. Route suspected defects to `find-bug`; do not perform open-ended
  bug hunting.
---

# Test Design

Act as a senior QA engineer designing **sanity tests**.

The deliverable is **test cases**, not analysis. Sanity testing covers:

- the changed feature (first priority);
- materially different changed outcomes;
- critical affected validation and authorization;
- edge cases at confirmed boundaries;
- directly related features and business flows that could regress;
- enough behavior to decide whether broader testing can begin.

Treat sanity as focused regression, not only happy-path testing.

Do not investigate defects, and do not report them in the document — bug findings are `find-bug`'s output, not this skill's.

When you notice a likely defect, hand it off and keep designing:

1. Note it in one factual sentence with an evidence reference.
2. Continue designing tests — including a test that would expose it, when the behavior is in scope.
3. Pass the note to `find-bug` to investigate independently. That skill writes its confirmed findings to `testing_docs/<TICKET-ID>.bug.md`, challenged by `qa-agent-advocate` before anything is called a defect.

The document links to that file; it never restates its contents. A suspicion that `find-bug` cannot confirm belongs in neither file's findings — it stays in the review record as a checked-and-rejected line.

**This hand-off is unconditional.** No mode, no reduced-evidence situation and no "only test cases were asked for" narrows it. Where the code cannot be executed, the note carries that constraint and goes to `find-bug` anyway; where no bug file is being written, the note goes to the review record's bug-candidate section with the argument on both sides, and the output says it is there. What is never acceptable is an observation left in prose while the bug-candidate section reads "None raised" — that is how a real finding disappears.

## Non-Negotiable Evidence Rules

Never invent endpoints, methods, statuses, payloads, roles, permissions, fields, limits, messages, storage behavior, integrations, UI controls, notifications, side effects, performance targets, concurrency, retries, or existing behavior.

Classify material information as:

- **Confirmed** — directly supported by a requirement, contract, code, schema, configuration, test, or tool result.
- **Inferred** — strongly implied by confirmed evidence but not explicit.
- **Unknown** — missing, conflicting, unavailable, or unverified.

Rules:

- Base expected results on confirmed evidence.
- Never claim a source was inspected unless the tool returned its content. An empty result is not proof of absence.
- Every case gets a specific citation in the review file's evidence map — `Jira AC-2`, `src/routes/member.ts:42-68`, `OpenAPI: POST /members`, `tests/member-upload.spec.ts`. Never `based on code`. The citation lives there, not in the document, but a case with no citation is not finished.
- Do not block valid partial coverage. Produce the confirmed tests, mark the rest, move on.

### Three files, one question each

| File                                          | Answers                                 | Owner                                                |
| --------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `testing_docs/<TICKET-ID>.test.md` (Part D)   | What are the test cases?                | this skill                                           |
| `testing_docs/<TICKET-ID>.bug.md`             | What are the bugs?                      | `find-bug`, challenged by `qa-agent-advocate`        |
| `testing_docs/<TICKET-ID>.review.md` (Part E) | What did the adversarial review decide? | `qa-agent-advocate`, evidence supplied by this skill |

The document carries test cases only — no Evidence Gaps section, no Assumptions section, no impact matrix, no bug findings, no review commentary. It opens with link lines to the other two, and each of those links back.

Keep the boundary strict in both directions: a bug write-up never appears in the document, and a test case never appears in the bug file.

Nothing is dropped — it is routed. An unknown that would change how a tester reads a case still appears inline in that case, written into the bullet it affects rather than as a field:

- A case resting on an inference — state the inference in one clause on the affected Precondition or Expected Result bullet, so the tester knows that bullet is derived rather than specified.
- An essential fact that is missing or conflicting — write `TBD — not established by available evidence` on the exact Precondition, Test Data, or Expected Result bullet it blocks. Never replace it with an invented value.
- Conflicting sources — do not pick silently. Design only the case whose expected behavior is established, and note the conflict in one clause on that case's bullet.
- An unknown that blocks coverage but belongs to no single case — one line under Coverage Summary as not covered, with the reason.

Keep these inline notes to one clause. Full reasoning, sources checked, and confidence belong in Part E, not in the document.

There is no confirmed-versus-provisional field on a case. `Status` on a test case means what the tester recorded after executing it — pass, fail, blocked — and that is theirs to fill in, not something the design asserts in advance. Design-time confidence lives in the review file.

# Part A — Gather Inputs (internal — not in the document)

Part A exists to make Part B and C accurate. **None of it goes into the document.** No business-logic essay, no code-change narrative, no flow-by-flow trace. Deep explanation belongs to `analyze-requirement`, `explain-code`, and `find-bug`. Inside the document, analysis reaches the reader only through the short business-language summary in Part D §1. What is worth preserving for review goes to Part E instead.

## A1. Calibrate effort

- **No runtime behavior** — comments, formatting, proven behavior-preserving rename. State no tests are needed, cite the diff, stop.
- **Mechanical / no logic** — visible string, enum, constant, or config value with no new branching. Design the one or two cases needed to observe it.
- **Logic / contract / data / auth** — changed branch, validator, schema, endpoint, state, side effect, authorization, or old-versus-new behavior. Run the full workflow.

When uncertain, use the heavier tier. Record the tier in Part D §1.

## A2. Determine scope

Default to **Sanity**: the changed feature and its distinct changed outcomes; directly related flows sharing the changed contract, state, data, component, side effect, or adjacent journey; affected critical validation and authorization; the highest-risk compatibility path.

When a change creates an account, user, tenant, or organization, do not stop at record creation — cover login, effective role and permission scope, first-user behavior, and tenant isolation.

**Focused regression** (broader sibling flows, integration and config variants, compatibility combinations) and **full regression** (cross-module, role, platform, failure, non-functional) only when explicitly requested. Do not silently expand sanity.

## A3. Source-of-truth order

1. approved requirement and acceptance criteria;
2. externally visible contract, feature file, product documentation, event contract, UI specification;
3. implementation and diff;
4. existing automated and manual tests;
5. callers, schemas, models, migrations, validators, configuration, fixtures, seed data;
6. PR or commit description;
7. explicitly labelled inference.

The ticket defines intent but may be incomplete or wrong. Validate it against contracts, authorization rules, existing behavior, and implementation. On conflict: do not choose silently — record it in the review file, and design only tests whose expected behavior is established.

Deployed state is not repository state. Migration history, filenames, commit titles, and symbol names are not behavior evidence — query the live DB or read the installed library source when a test hinges on it.

## A4. Inspect the change

Retrieve the ticket when an id is given. Work from the complete branch, commit, or PR diff — not a fragment of it. Read the full relevant file. Locate symbols by searching the repository, then read their implementation and the branches around them.

Identify confirmed changes to entry points, validation, schema, state, authorization, branches, defaults, side effects, error handling, serialization, ordering, filtering, retries, configuration, and compatibility.

Do not treat unchanged code as changed unless the diff alters how it executes.

**When the change is not in the working tree.** Establish which of two situations applies before bounding anything, because they permit different work.

**Readable elsewhere.** The implementation exists as an unmerged commit or on another ref, and `git show <ref>:<path>` reads it without checking anything out. This is not a limit on evidence: A4, A5, A7 and A9 all run normally, and white-box cases are available. What is limited is execution — nothing runs in this tree. So label every code-derived fact with the ref and short sha, say plainly that it is not confirmed to ship (an unmerged branch can be rebased, squashed or dropped), and mark the cases as pending the merge rather than ready to run. Establish what the change needs in order to run at all — a dependency version it bumps, a migration it adds — and write each as a stated precondition rather than leaving the tester to discover it.

**Does not exist.** No commit anywhere implements it. The requirement is the primary source of truth (A3), and cases written from it before the build are the most useful ones a tester can have. Here the bounding applies:

- A4, A5, A7 and A9 produce nothing. Say so once rather than speculating about a diff you never read.
- No white-box cases and no coverage claim about the change — both are derived from implementation, and neither can be honest here.
- Every expected result traces to the requirement. Where the requirement is silent, the case carries `TBD — not established by the requirement`; it does not assume a behavior the system might happen to have.
- No case claims a suspected defect, and the `Any Issue?` field is omitted rather than answered — it points at a bug file, and a bug pass needs code. Eight fields per case, with one header note saying why the field is absent. It is added when the implementation lands and the bug pass runs.
- The document states at the top that it was written before the implementation was available, so a later failure is read as a possibly-wrong expectation rather than a defect.

**Never borrow the second situation's bounding while using the first situation's evidence.** A document that omits `Any Issue?`, skips white-box coverage and calls itself requirement-derived, while asserting result codes, refusal reasons, ordering rules or filter logic the requirement never states, has read the code and is concealing that it did. The test is simple: take the most specific claims in the document and ask whether the ticket states them. If not, the first situation applies, and its labelling is required instead.

Either way, revise the document — do not rewrite it — once the implementation lands, and fill in what A4 onward then establishes.

## A5. Trace callers → regression surface

Mandatory when the change touches a shared function, service, utility, connector, factory, schema, repository, event, or model. This is where regression coverage comes from; skipping it means guessing.

Grep repo-wide for the changed symbol: exported usage, routes, services, dependency bindings, event producers and consumers, scheduled jobs, config registrations, tests, fixtures. Internal callers count — a delete route reusing a list-query method is a caller.

- Read every caller when manageable or materially different.
- For widely shared components, group callers by business journey, entry point, role, contract, artifact, side effect, and observable outcome; inspect every group plus one representative each.
- Always inspect callers named by the requirement, diff, failing test, or public contract.
- Stop when further callers repeat an established contract and risk.
- Never claim all callers were reviewed when only representatives were.

A flow qualifies as **related** only when confirmed evidence shows it calls the changed component; shares changed schema, data, state, event, queue, contract, authorization, or ownership; sits immediately before or after the change in the same journey; consumes a changed output or side effect; or is materially affected by an old-versus-new difference. Same page, module, service, or product area is not a qualification.

## A6. Establish real boundaries (edge-case source)

Derive inputs and exact boundaries only from validators, schemas, configuration, database constraints, protocols, contracts, parsers, transformations, fixtures, and seed data. Never invent sizes, timeouts, counts, formats, status codes, or messages.

Confirmed boundary material includes: required versus optional fields; allowed and rejected values; empty, null, or malformed input; values below, at, and above a confirmed limit; duplicate identifiers or filenames; encoding, Unicode, spaces, special characters; multiple artifacts in one request; content-versus-representation mismatch.

When behavior was removed, migrated, replaced, or rewritten, compare defaults, null handling, parameters, serialization, ordering, filtering, retries, errors, side effects, and configuration. Do not invent legacy behavior when history is unavailable.

## A7. Read existing tests

Read relevant system, API, integration, UI, unit, fixture, builder, and manual-regression coverage. Determine setup, terminology, established assertions, duplicate coverage, and gaps the change creates. Do not assume an existing test still covers the behavior — inspect its path and assertions.

## A8. Executability filter

Keep system tests runnable through at least one supported path: UI, tester-accessible API, scheduled task, supported event, observable integration, approved database or storage verification, or an existing harness.

Exclude by default: artificial permission denial used only to force an internal exception; direct factory or connector assertions dressed as system tests; failures needing unsupported hooks; arbitrary concurrency or stress without confirmed risk; infrastructure corruption; duplicates exercising the same contract, branch, and outcome.

## A9. Internal impact matrix

Build it to expose gaps, caller groups, and duplicate coverage. It never enters the document; carry it into Part E when it helps review.

| Flow / artifact | Entry point | Changed behavior | Input/state variants | Observable outcome | Validation/auth | Related regression | Existing coverage | Evidence strength |
| --------------- | ----------- | ---------------- | -------------------- | ------------------ | --------------- | ------------------ | ----------------- | ----------------- |

# Part B — Select Coverage

## B1. Coverage order

1. primary changed business flow (feature test — highest priority);
2. materially different changed branches or variants;
3. affected critical validation and authorization;
4. edge cases at confirmed boundaries (A6);
5. directly related caller and sibling-flow regression;
6. confirmed old-versus-new compatibility risk;
7. white-box coverage only when system behavior cannot expose a material risk.

For newly created identities, authorization coverage must verify login, effective access, first-user behavior, and tenant isolation — not only record creation.

## B2. Categories to consider

A prompt for what to think about, **not** a list to produce cases from. Walk it once, take what the change actually touches, and let B3's inclusion rule and B6's stopping rule decide what survives. A category with no confirmed exposure in this change contributes nothing.

- **Functional** — happy path; alternate valid flows; required and optional fields; boundaries; invalid, empty, null and duplicate values; special characters and long input; unsupported formats; state transitions; cancel, retry and repeated submission; refresh and back-navigation; idempotency.
- **Permission** — authorized and unauthorized roles; missing or expired authentication; cross-user, cross-tenant and cross-location access; direct API access without the UI permission; privilege escalation.
- **Data** — correct create, update and delete; no unintended modification; consistency; audit trail and timestamps; duplicate prevention; transaction rollback; visibility after refresh or re-login.
- **API** — payload, response body, status code, headers; authentication and authorization; schema validation; error contract; invalid method, invalid id, missing resource; duplicate request; timeout and retry.
- **UI** — visibility and enablement; disabled, loading, empty, error and success states; field-level validation messages; responsive, keyboard and accessibility basics when required.
- **Integration** — UI to backend; backend to database; third-party behavior; webhooks; queues and events; background jobs; notifications; file storage; caching.
- **Regression** — shared components and services; existing records, users and roles; related workflows; search, filtering, reporting, import and export; authentication; previously fixed defects.
- **Non-functional** — performance, concurrency, security, reliability, recovery, logging, observability, compatibility, large-data behavior. Only on confirmed evidence of risk, per B5.

A passing happy path does not mean the feature is covered. An untouched category is not a gap.

## B3. Inclusion rule

Include a test only when it covers at least one: acceptance criterion; changed outcome-producing branch; critical business flow; distinct artifact or journey; affected authorization, ownership, tenant, or data-exposure rule; confirmed validation boundary; directly related caller regression; confirmed compatibility difference; or a justified internal risk not observable through system tests.

Never add tests to hit a number.

Before adding a "blocked without X" case, check whether another case already proves X is what grants access — the converse is not new coverage.

## B4. Priority

- **High** — acceptance criteria, primary or release-blocking flow, authorization or sensitive data, high-impact caller, confirmed compatibility risk, or failure causing loss, corruption, duplication, or wrong external behavior.
- **Medium** — meaningful secondary variation, less-used related flow, recoverable integration path, confirmed non-critical boundary, limited compatibility variation.

No Low-priority cases in sanity scope.

## B5. Conditional coverage

**Security** — only when the change materially affects authentication, authorization, ownership, tenant filtering, sensitive data, security-sensitive input, file or content handling, secrets, tokens, signatures, or access URLs.

**Performance** — only when evidence shows material risk: changed loop placement, cardinality, payload size, pagination, filtering, sorting, indexing, batching, caching, storage or network behavior, or an explicit latency, throughput, timeout, or capacity expectation. Never invent targets.

**White-box** — only when the changed component is primarily an internal algorithm or library; a material branch is unreachable or unobservable through supported system paths; a system test cannot isolate a high-risk internal contract; or the unit behavior is itself an established contract. Each white-box case states `Why system coverage is insufficient: [specific reason]`. When a supported caller exists, still include at least one system or integration contract test.

## B6. Stopping rule

Stop when every affected acceptance criterion, every materially different changed outcome, critical validation and authorization, each distinct related caller group, and every confirmed compatibility and boundary risk has coverage — and no remaining case adds a new material contract, branch, artifact, role, or observable outcome.

Do not add cases that vary only cosmetic data while exercising the same behavior.

# Part C — Write Test Cases

## C1. System behavior first

Test observable behavior through an API response, UI state, persisted state, event, stored object, notification, downstream integration, or scheduled-job result. Mark such a case `(system)` on its Type line; the rarer internal case is `(whitebox)`.

Do not mention internal methods, classes, command objects, mocks, or dispatch details in system steps or expected results.

## C2. Title contract

Write titles a non-technical stakeholder can read. Pattern:

`Verify that [business artifact or outcome] [observable result] when [user or system action]`

Examples:

- `Verify that the payment invoice is available to the member after a paid member is added`
- `Verify that the agreement PDF is shown to the receiver when acceptance is required`
- `Verify that the locker-opened webhook is sent when an authorized user opens the locker`

Keep technical precision in the Preconditions, Test Data and Steps — the title is the one line a non-engineer reads.

Name a technical term in the title only when it is part of the requirement or public contract and externally verifiable, or when it names a config artifact the tester actually edits to set up the test (for example a form JSON schema). Bar terms for mechanisms the user never touches (handshake, nonce, callback, IdP, auto-provisioning, claim names).

Avoid: internal method, class, connector, or factory names; `works correctly`, `behaves properly`, `full lifecycle`, `retains contract`; titles centred on artificial setup; combining success and failure branches; generic artifact wording when business journeys differ; oversized titles that cram every branch into a parenthetical.

### Consolidate same-action variants

When cases share the same entry point, action, branch type, and observable contract, write one case and list the variants under **Expected Result**.

Do this:

```text
Test Title: Verify that the eSIM checkbox correctly reflects and persists its saved state
Expected Result:
- when checked and saved, the value is stored as isChecked=1
- when unchecked and saved, the value is stored as isChecked=0
- after a page refresh, the checkbox shows the last value that was saved
```

Not this:

```text
1. Verify that checking the checkbox stores isChecked=1
2. Verify that unchecking the checkbox stores isChecked=0
3. Verify that the value persists after a page refresh
```

Split cases when the entry point, business flow, branch, or failure mode differs. A validation rejection stays separate from a success case. When one branch is headlined in the title, the other branches stay documented as Expected Result bullets with their exact conditions cited.

Apply this rule before the stopping rule and the quick list.

## C3. Case order

Order cases by business flow group, and within each group: happy path, then that flow's negative and rejection cases, then the next group. Cross-cutting cases (authorization, tenant isolation, admin management, payload integrity) go last.

When the ticket itself enumerates multiple distinct bugs or requirements in sequence, follow the ticket's order — its item 1 cases first, then item 2 — not the order evidence was discovered.

Renumbering or renaming cases invalidates every in-document `TC-XX` cross-reference and the quick list. Re-derive them in the same pass.

## C4. System test format

```markdown
### TC-001

**Test Title:** Verify that [business outcome] when [user/system action]
**Type:** Functional / Negative / Security / Performance — (system)
**Priority:** High / Medium
**Any Issue?:** No

**Preconditions:**

- [confirmed role, data, configuration, or integration]
- [use `TBD — not established by available evidence` for an essential unknown]

**Test Data:**

- [concrete values supported by the requirement, schema, validator, or fixture]

**Steps:**

1. [perform the business action through a supported entry point]
2. [perform only the additional action needed to observe the outcome]

**Expected Result:**

- [externally observable business result]
- [list same-action variants here instead of creating duplicate cases]
```

Nine fields, no more. Specifically **not** on a case: no `Status` (the tester fills that in after execution), no `Coverage Reason`, no `Evidence Basis`, no severity, no confidence. Why the case exists and what it was derived from lives in the review file's evidence map.

`Any Issue?` has three possible values, and they are not interchangeable:

- **`No`** — a bug pass ran against this case's behavior and found nothing.
- **`Yes — [<TICKET-ID>.bug.md](<TICKET-ID>.bug.md)`** — a bug pass ran and suspects a defect here. Nothing else on that line — no summary of the defect.
- **`N/A — bug hunt not yet run`** — the implementation exists, but this document was produced on a test-cases-only ask and no bug pass has run against it yet. Distinct from `No`: `No` claims the behavior was checked and is clean, `N/A` claims nothing was checked. Every case gets this value, uniformly, until a bug pass actually runs — do not guess `No` for cases that look safe.

**One exception, where the field is dropped rather than set to any of the three:** when the document was written with no implementation available at all (see A4), `Any Issue?` is omitted entirely and cases carry eight fields. That is a different situation from the deferred-bug-hunt one above — there the code exists and a bug pass is simply pending; here there is no code for a bug pass to run against yet, so the field would promise something that cannot exist. A header note states which situation applies, once.

When a deferred bug pass later runs, revise every case's `N/A` line to `No` or `Yes — [...]` in the same pass that writes the bug file — an `N/A` line left standing after a bug pass ran misreports what happened exactly as a false `No` would.

Number cases `TC-001` upward in a single sequence across the whole document, system and white-box together. Include exact statuses, messages, values, destinations, and side effects only when confirmed. Do not assert implementation calls.

## C5. White-box test format

Same fields, with the Type marked `(whitebox)` and one extra line justifying it:

```markdown
### TC-024

**Test Title:** Verify that [internal contract] when [confirmed condition]
**Type:** Functional / Negative — (whitebox)
**Priority:** High / Medium
**Any Issue?:** No
**Why system coverage is insufficient:** [specific reason]

**Preconditions:**

- [confirmed mock, stub, configuration, or object state]

**Test Data:**

- [inputs supported by code or contract]

**Steps:**

1. [call the target contract with the confirmed input]
2. [capture its result, exception, state change, or collaborator call]

**Expected Result:**

- [confirmed return value, exception, state, or call parameters]
```

## C6. Top Test Cases — black-box quick list

Add only when requested or clearly useful. Always the final section. Contains only cases already designed as `(system)`.

- Order by the same flow grouping as C3, High before Medium within a group.
- No forced count. Merge overlapping cases. Never pad or trim to a round number.
- Externally observable wording only: no internal names, field names, response codes, database details, payload shape, TC-number cross-references, or evidence references.
- One line per case: `Verify that [observable action] [observable result].`

# Part D — The Document

When a Jira ticket was given, write this to `testing_docs/<TICKET-ID>.test.md`, where `<TICKET-ID>` is that ticket's key verbatim — `DEV-2951`, `TASK-5`, `PROJ-123`, whatever project it belongs to. No fixed prefix; never rewrite or invent a key.

**With no ticket, write no file.** Deliver the same sections in the reply instead, and skip §1 Feature Summary unless the feature summary is itself what was asked for — an ad-hoc "write test cases for this" wants the cases, not a preamble. If no `testing_docs/` directory exists, create it — reuse one already present in the working directory or a parent, otherwise create it in the repository root beside `.claude/`. Never skip writing the file because the directory is missing. Organized test cases, nothing else.

**Exactly these seven sections, in this order, every time — no more, no fewer:** §1 Feature Summary, §2 Acceptance Criteria, §3 Basic Test, §4 System Behavior Tests, §5 White-box Tests, §6 Coverage Summary, §7 Top Test Cases. All seven are structural, not optional — a section with nothing to say still appears, with its defined empty-state text (`No additional whitebox tests are justified.` for §5, `Nothing material left uncovered` for §6, and so on), never a missing header. What is optional is _content_ within a section, never the section itself. No eighth section, no ad-hoc heading, and nothing at all — no revision note, no advocate-revision paragraph, no find-bug pass summary, no standing precondition banner — between the title's link lines and `## 1. Feature Summary`. Anything that isn't one of these seven sections' own content belongs in `<TICKET-ID>.review.md`, not in this document.

**The whole document is non-technical.** A tester and a product owner both have to be able to work from it. That means no file names, no function, class, method or computed-property names, no table or column names, no SQL, no code snippets, no config keys, no line numbers, and no framework terminology — anywhere, including white-box cases, which are expressed through an endpoint rather than by calling internals. What stays is what a tester actually uses: endpoint paths, API result codes, on-screen labels, and concrete test-data values. Every code-level citation belongs in the review file.

Directly under the title, add the link lines and nothing more:

```text
> Bugs found alongside these tests: [<TICKET-ID>.bug.md](<TICKET-ID>.bug.md)
> Evidence, assumptions and adversarial review: [<TICKET-ID>.review.md](<TICKET-ID>.review.md) — read before revising these cases.
```

Omit the first line when `find-bug` confirmed nothing for this ticket.

## 1. Feature Summary

Plain business language, readable by a non-technical stakeholder. No code paths, class names, method names, file names, or internal mechanics — those live in the review file.

- **What this feature does for the user:** one short, plain sentence — the kind you'd say out loud to someone non-technical, in the simplest words that are still accurate. No jargon, no internal terminology, no compound clauses stacking multiple conditions. If it takes two sentences to qualify, that is a sign it belongs in "What changed" instead — this line states the one core thing the feature is for.
- **What changed:** what a user or support person can now do, see, or no longer see
- **Who is affected:** roles, actors, or customer types
- **Business flows touched:** business names only, for example `Paid-member invoice upload`, not `saveFile flow`
- **Related flows that could break:** name each and say in one clause why it is connected
- **Change tier:** no-behavior / mechanical / logic
- **Intent source:** ticket / requirement / contract / inferred from code
- **Scope:** Sanity / Focused regression / Full regression

Keep this section short. It frames the tests; it does not explain the implementation.

## 2. Acceptance Criteria

What must be true for this ticket to be accepted, as a numbered `AC-n` list a stakeholder can approve line by line. Derive them from the ticket; write them to the standard in the `analyze-requirement` skill — observable, testable, unambiguous, business-worded, and traceable to what the requirement actually says.

Two situations:

- **The ticket already states acceptance criteria** — restate them as `AC-n`, in the ticket's own terms, and say they came from the ticket. Do not silently reword a criterion into something easier to test; if one is untestable as written, keep it and note what makes it so.
- **The ticket states none** — derive them from what it asks for, and say they were derived rather than given. This is the common case for a task-style ticket that lists work items instead of outcomes.

Never invent a criterion for behavior the requirement does not claim, and never turn a task into a criterion — "add a dropdown" is work, "the agent can choose one of four session types and the choice is stored" is a criterion. A criterion you cannot derive is a gap: say so here in one line rather than filling it.

These are what the test cases are measured against. Every criterion should end up covered by at least one case, and the Coverage Summary maps them; a criterion with no case is a hole, and a case that maps to no criterion needs a reason to exist.

## 3. Basic Test — verify the feature works end to end

One walkthrough a tester runs **first**, before any `TC-`, to confirm the feature is basically alive. If this fails, the individual cases are not worth starting; the tester reports this instead.

It is a full pass over what the ticket delivers, not a fragment and not a copy of `TC-001`. `TC-001` proves one specific expected result; this proves the feature is reachable, wired, and returns something sane from end to end through the interface a real user touches.

**Black-box only, through the real UI wherever the feature is reachable from one.** For this project that means **sharebox-webadmin first**: a Laravel + Vue app, so the screens live under `resources/assets/js/components/`, with labels in `resources/lang/en/`. Establish the UI path on evidence before writing a step — read the component, trace its `api.js` (or equivalent) call to the actual sharebox-api route, and confirm it reaches _this ticket's_ endpoint. A component whose name matches the feature is not proof that it calls the new code.

Write it with enough detail that someone who has never seen the feature can follow it:

- **Environment preconditions** — what must be true before step 1: services running, queues up, dependency versions installed, migrations applied, seed data present. Anything that would make the walkthrough silently show nothing goes here, with how to satisfy it. A tester who hits an uninstalled dependency and reads it as a defect is a failure of this section.
- **Login and role** — which environment, which account, and what permission the account needs.
- **Navigation** — the actual route or menu path to the screen, with the real on-screen labels quoted from the components and language files. Never paraphrase a label, never invent one.
- **Numbered steps**, each an action a person performs, each with the observable result they should see on screen before moving on.
- **What proves it passed** — the concrete end state, in business terms.
- **Fixture setup** may be a precondition, including a seeded database row where no supported path creates it. It is never a _step_ — steps stay black-box.

**When the feature is not reachable from webadmin at all**, say so in the first line of the section rather than building a plausible-looking screen around it. Machine-to-machine surfaces — queue messages, device endpoints, service-to-service calls — often have no admin UI, and inventing one wastes a tester's afternoon. Then give both halves honestly: what webadmin _can_ still verify (usually the shared logic the change routes through, which is the related-regression surface), and a plain-language pointer for the new surface itself — that it currently has no tester-facing path and needs an engineer to exercise it directly, what outcome to ask that engineer to confirm, and nothing more specific than that. Substituting a different endpoint that merely looks similar is not acceptable, and neither is naming the file, command, or tool that would do it — that citation belongs in the review file, same as every other code-level fact.

**This section is bound by the same non-technical rule as the rest of the document, with no exception for "there's no other way to say it."** No file names, no function/class/component/computed-property names, no test-runner or library names, no shell commands, no code snippets. Only what a tester actually sees and does: routes, on-screen labels quoted verbatim, buttons, observable results — and, when nothing is tester-reachable, the plain-language handoff above. Every trace you did to find the real path — which component, which call, which file confirmed the absence of a UI — is a review-file citation, not a document sentence.

Assign no `TC-` ids here. This section is the basic path; the cases are the coverage.

## 4. System Behavior Tests

`(system)` cases, numbered `TC-001` upward and ordered per C3, in two labelled groups:

- **4a. New behavior** — the feature tests: what this change introduces or alters. A failure here is a defect in the new work.
- **4b. Related regression** — the sanity tests: existing behavior the change touches or routes around, verified to still work. A failure here is a regression.

Keep the `TC-` numbering continuous across both groups. Where a change introduces nothing new (a pure refactor or config change), 4a may be empty — say so rather than padding it. Where nothing existing is affected, omit 4b.

The split tells a tester which kind of bug they just found, and tells a reviewer whether the change broke something it never meant to touch.

## 5. White-box Tests

Only justified `(whitebox)` cases, continuing the same `TC-` sequence. Otherwise: `No additional whitebox tests are justified.`

## 6. Coverage Summary

Each `AC-n` and the case ids covering it — state plainly any criterion with no case; changed branches covered; related caller groups covered; validation and authorization covered; edge cases and compatibility risks covered; duplicates merged.

End with a short **Not covered** list: each area left untested and why — duplicate of an existing case, unsupported through any tester-accessible path, out of sanity scope, or blocked by an unestablished fact. Write `Nothing material left uncovered` when empty.

## 7. Top Test Cases — black-box quick list

Only when requested or clearly useful, always last.

### No bug section

The document never writes up a defect. When a case exists because a defect is suspected there, add one clause to that case — `a defect is suspected here; see <TICKET-ID>.bug.md` — and nothing else. No summary, no severity, no root cause, no evidence trail; those live in the bug file, and the argument for and against lives in the review file.

The header link line is the document's only global signal that candidates exist. Omit that line when there are none.

# Part E — The Review Record

Write this to `testing_docs/<TICKET-ID>.review.md`, in the same directory as the document — **only when a Jira ticket was given.**

With no ticket there is no review file. The adversarial review itself still happens: `qa-agent-advocate` reviews the cases, and its verdicts are applied to what you deliver rather than recorded — a case it rejects is removed, a caveat it demands is added. Nothing below gets written anywhere in that case; it exists so the reviewer has something to challenge, not as a deliverable in its own right. It is the evidence package `qa-agent-advocate` reviews against, and afterwards the record of what that review decided. Never merge any of it into the document.

Two rules that make the file worth keeping:

- **Read it first when revising an existing test set.** If a `.review.md` already exists for the ticket, read it before changing any case — it names findings already rejected and corrections made deliberately, so a later pass does not re-raise them or quietly undo them.
- **Update it in the same pass as the document.** A case renamed, renumbered, added, or dropped without a matching line here leaves the next reviewer working from a stale record.

Open it with a link back: `Internal companion to [<TICKET-ID>.test.md](<TICKET-ID>.test.md).`

Keep it terse and factual — a reviewer's checklist, not prose.

## E1. Case evidence map

One row per `TC-` id in the document, so every case remains traceable without carrying a citation line for the tester to skip over. Keep it in document order and keep it complete — a case absent from this table is unfinished, and a row whose id no longer exists in the document is stale.

| Case   | Covers                                                                                                   | Evidence                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| TC-001 | [acceptance criterion / changed branch / authorization / edge case / related regression / compatibility] | [specific ticket section, contract, file:line, caller, validator, or existing test] |

## E2. Evidence Gaps / Conflicts

For each material item: the missing or conflicting fact; every source actually checked; which sources disagreed and how; the impact on test design; and whether a case was included with an inline caveat, narrowed, or omitted. Write `None identified` when empty.

## E3. Assumptions

Each unavoidable inference: the assumption, the confirmed evidence it rests on, confidence, the affected `TC-XX` IDs, and what observation would disprove it. Do not restate confirmed facts.

## E4. Caller-trace record

The searches actually run, the callers found, how they were grouped, which were read in full versus sampled as representatives, and which were deliberately not read and why. State plainly if only representatives were reviewed.

## E5. Impact matrix

The A9 matrix, materially affected rows only.

## E6. Deliberate exclusions

Cases considered and dropped, with the reason — duplicate of an existing case's mechanism, not executable through any supported path, out of sanity scope, or cosmetic variant of a covered behavior. This is what an adversarial reviewer is most likely to challenge, so name each one.

## E7. Bug candidates — the why-bug / why-not-bug argument

The adversarial record for every suspected defect, whether it ended up in `<TICKET-ID>.bug.md` or not. This is where the disagreement is written down; the bug file carries only what survived it.

One block per candidate:

- **Claim** — the defect in one sentence, with its evidence citation.
- **Case for** — the traced path, requirement, or contract it violates. State what was actually verified versus read.
- **Case against** — the strongest good-faith reading in which this is _not_ a defect: intended behavior, a deliberate configuration, a downstream guard, a severity that does not reach user-visible harm, or an established pattern in this codebase. Write this even when the finding looks obvious; a candidate with no counter-argument recorded has not been challenged.
- **What would settle it** — the single observation that decides it: a live reproduction, a DB reading, a business answer, a library source check.
- **Verdict** — `Bug` (written up in the bug file) / `Not a bug` (with which side of the argument won) / `Open` (blocked on the observation above).
- **Decided by** — `find-bug`, `qa-agent-advocate`, or the business, and when.

A `Not a bug` verdict stays in this file permanently. It is the record that stops a later pass re-deriving the same trace and re-filing it. Never delete a rejected candidate; append the verdict.

Write `None raised` when empty.

## E8. Review outcome

Filled in from the `qa-agent-advocate` pass, appended to rather than overwritten on later passes so the history stays readable. Record per pass:

- what the reviewer independently re-derived or re-verified, and how;
- findings **rejected**, each with the reason — this is the section a later pass must not re-litigate;
- findings **confirmed**, and the correction applied to the document;
- citation, test-data, or expected-result drift found and fixed;
- cases added, dropped, reordered or renamed as a result;
- reviewer confidence and what the deductions were.

Write `Not yet reviewed` when the design has not been through an adversarial pass — never leave the section absent, since its absence reads as "reviewed and clean".

# Final Quality Gate

Before returning, confirm:

- change tier, scope, and effort match the evidence;
- Part A analysis stayed out of the document — no business-logic essay, code narrative, or impact matrix in Part D;
- §1 Feature Summary is business language a non-technical reader can follow;
- §3 Basic Test is present, is a full end-to-end pass rather than a restatement of `TC-001`, names the real UI path and labels it was traced to — or states plainly that no UI reaches the feature and gives the real alternative path — and lists every environment precondition that would otherwise make the walkthrough silently show nothing;
- every inference, unknown, and source conflict affecting a case is flagged inline on the bullet it affects — a one-clause note, or `TBD — not established by available evidence`;
- anything material left untested appears under Coverage Summary's Not covered list with a reason;
- Part E was written to `testing_docs/<TICKET-ID>.review.md` with the full gaps, assumptions, caller-trace record, matrix, dropped cases, bug-candidate arguments and review outcome, and none of it leaked into the document;
- an existing `.review.md` was read before revising any case, and updated in the same pass as the document;
- the document carries the link lines, and both companion files link back;
- the document contains no bug write-up, no finding and no severity — only test cases and their coverage;
- callers were grepped repo-wide when the change is shared, and caller-coverage claims are accurate;
- every related flow has a confirmed relationship to the change;
- every case carries the nine fields and no others — no Status, no Coverage Reason, no Evidence Basis, no severity — or eight, with `Any Issue?` omitted, when no implementation was available; `Any Issue?` reads `No`/`Yes — [...]` when a bug pass ran, `N/A — bug hunt not yet run` uniformly when it hasn't (implementation exists, deferred), never a guessed `No`;
- every case has a specific citation in the review file's evidence map, and the map covers every `TC-` id in the document;
- every system test is executable through a supported path;
- every white-box test explains why system coverage is insufficient;
- edge cases come from real validators, schemas, or constraints — nothing invented;
- security and performance coverage appears only for confirmed change-related risk;
- new identities get end-to-end authorization and tenant-isolation coverage;
- same-action variants and mechanism-level duplicates are consolidated;
- case order follows C3, and every `TC-XX` cross-reference and the quick list match the final numbering;
- every suspected defect went to `find-bug` instead of into the document, and each one's fate is recorded in E7;
- coverage stops at the smallest set exercising every material risk.

# Core Principle

Design the smallest evidence-backed set of feature and directly related regression tests that reveals whether the promised behavior works. Analysis is fuel, not deliverable. Understand first, trace only material impact, keep unknowns explicit, preserve black-box executability, never manufacture certainty.
