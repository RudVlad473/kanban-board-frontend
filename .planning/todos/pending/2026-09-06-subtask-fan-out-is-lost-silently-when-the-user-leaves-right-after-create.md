---
created: 2026-09-06T00:00:00.000Z
title: The subtask fan-out is lost silently when the user reloads or navigates right after creating a task
area: tasks
severity: minor
files:
  - src/features/tasks/hooks/use-create-task.ts
  - src/features/tasks/components/task-card/task-card.tsx
  - e2e/tasks-create.e2e.spec.ts
---

## Problem

Creating a task with subtasks issues two sequential writes: the task itself, then — only once that
resolves — a fan-out of its subtasks (`createSubtasks`, fired-and-forgotten per D-07). Quick task
`260905-tz5` made the `0 of N subtasks` caption optimistic, staging placeholder rows in the create
mutation's own `onMutate`. The caption therefore paints before the task-create request has even
returned, and roughly 400ms before the fan-out request is issued at all.

Measured on this box, three consecutive runs against the real nonprod backend:

```
1893  POST /boards/<id>                  ← task create, in flight
1930  "0 of 2 subtasks" visible          ← optimistic, nothing sent for the subtasks yet
2338  page reloaded                      ← fan-out request never issued
2396  post-reload caption count = 0      ← subtasks do not exist
```

So there is a ~400ms+ window in which the card asserts subtasks that no server has heard of. A user
who reloads or navigates inside it loses them with no toast and no other signal — the fan-out's only
failure reporting is `raiseSubtaskFailureToast`, which cannot fire on a page that is gone.

This is a consequence of what tz5 was deliberately asked to do, not a coding mistake. What changed
is the honesty of the signal: before tz5 the caption's *absence* meant "not landed yet", and its
appearance was a genuine settle indicator. That is why `tasks-create.e2e.spec.ts` had no explicit
wait before its reload — the caption was the wait. CI went red on exactly this
(run 33990646989, 3/3 retries) and the spec now awaits the fan-out's own response instead.

## Why it is filed rather than fixed

Closing the window is a design decision against D-07's "keep whatever fan-out lands regardless of
when the caller stopped watching", not a patch. Any fix trades against that rule:

- surface pending-ness on the card (a distinct caption or affordance until the fan-out lands),
- hold the fan-out's completion in state the card reflects, so optimism is visibly provisional,
- block unload / warn while a fan-out is in flight,
- or accept the window explicitly and record that acceptance.

Pick one deliberately. The e2e spec is now correct either way — it proves the optimistic paint and
the persistence separately.

## Verification

Reproduce by delaying only the fan-out request (`page.route` matching the typed subtask titles) and
reloading immediately after the caption appears: the post-reload caption is absent, deterministically.
