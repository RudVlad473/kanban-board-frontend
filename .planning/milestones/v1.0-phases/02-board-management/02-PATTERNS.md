# Phase 2: Board Management - Pattern Map

**Mapped:** 2026-08-20
**Files analyzed:** ~30 (prerequisite PC-01..05 relocations + BOARD-01..06 new files)
**Analogs found:** 26 / 30

## File Classification

### Prerequisite cleanup (PC-01..05)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/core/theme/theme.ts` (new) | config/model | pure | `src/lib/core/routing/routes.ts` (`ROUTE` const pattern) | role-match (enum-like const, `as const` + derived type) |
| `src/lib/core/cookies/cookie-registry.ts` (new) | config | pure | `src/lib/core/routing/routes.ts` | role-match |
| `src/lib/server/cookies/theme-cookie.ts` (replaces `lib/server/theme.ts`) | service (cookie I/O) | file/cookie I/O | `src/lib/server/theme.ts` (itself, being relocated + factory-namespaced) | exact (relocate + reshape into factory, matching `createSessionService`) |
| `src/lib/server/cookies/upstream-cookie.ts` (replaces `lib/server/session-cookie.ts`) | service (cookie I/O) | file/cookie I/O | `src/lib/server/session-cookie.ts` (itself) + `src/lib/server/session.ts`'s `createSessionService` factory shape | exact |
| `src/lib/server/session.ts` (modified: import `COOKIE.SESSION`) | service | cookie I/O | itself | exact (minimal edit) |
| `src/features/auth/actions/sign-in.ts`, `sign-up.ts`, `sign-out.ts` (split from `actions.ts`) | server action | request-response | `src/features/auth/actions.ts` (itself, being split) | exact |
| `src/features/theme/actions/update-theme.ts` (split from `actions.ts`) | server action | request-response | `src/features/theme/actions.ts` (itself) | exact |

### Board management (BOARD-01..06)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/api/boards/route.ts` (GET list, POST create) | route (BFF Route Handler) | request-response | No Route Handler exists in-repo (deleted in 01-33) — closest surviving analog: `src/features/theme/actions.ts` (`updateThemeAction`'s `verifySession()` + `externalApi` call shape) | role-match (transport differs: Route Handler vs Server Action) |
| `app/api/boards/[boardId]/route.ts` (PUT rename, DELETE) | route | CRUD | `src/features/theme/actions.ts` | role-match |
| `app/api/boards/[boardId]/full/route.ts` (GET) | route | request-response | `src/features/theme/actions.ts` | role-match |
| `app/api/boards/[boardId]/columns/route.ts` (POST) | route | request-response | `src/features/theme/actions.ts` | role-match |
| `src/features/boards/api/boards-client.ts` | service (client fetch wrapper) | request-response | `src/features/theme/hooks/use-theme-preference.ts` (client-side fetch/mutation pattern, though it calls a Server Action not `fetch`) | partial-match |
| `src/features/boards/hooks/use-boards.ts` | hook | CRUD (read) | pattern given directly in 02-RESEARCH.md Pattern 2 (`useQuery` + `fetch`) — no closer in-repo TanStack Query hook exists yet (this is the first) | no analog (first TanStack Query hook in repo) |
| `src/features/boards/hooks/use-board-full.ts` | hook | CRUD (read) | same as `use-boards.ts` | no analog |
| `src/features/boards/hooks/use-create-board.ts` | hook | CRUD (create, multi-step) | 02-RESEARCH.md Code Examples → Client-Orchestrated Create; auth's `signUpAction`/`signInAction` for the "validate → call → branch success/fail" shape | partial-match |
| `src/features/boards/hooks/use-update-board.ts` | hook | CRUD (update, optimistic) | 02-RESEARCH.md Pattern 3 (fully worked `onMutate`/`onError` example) | exact (research-authored, no in-repo optimistic-mutation precedent yet) |
| `src/features/boards/hooks/use-delete-board.ts` | hook | CRUD (delete, non-optimistic) | `src/features/auth/components/sign-out-button.tsx` (fire mutation → redirect shape, non-optimistic) | partial-match |
| `src/features/boards/components/board-card.tsx` | component | display + action trigger | `src/components/ui/dropdown/dropdown.tsx` (consumer usage) + `app/(dashboard)/layout.tsx` (header row layout) | partial-match |
| `src/features/boards/components/add-board-modal.tsx` | component | form/request-response | `src/features/auth/components/sign-up-form.tsx` (RHF + Zod + TextField pattern) + `src/components/ui/modal/modal.tsx` (Modal composition) | role-match (RHF form) + exact (Modal usage) |
| `src/features/boards/components/edit-board-modal.tsx` | component | form/request-response | `src/features/auth/components/sign-up-form.tsx` + `src/components/ui/modal/modal.tsx` | role-match / exact |
| `src/features/boards/components/delete-board-confirm.tsx` | component | request-response (confirm) | `src/components/ui/modal/modal.tsx` (Modal.Root/Content/Title/Description/Footer) | exact (composition target) |
| `src/features/boards/model.ts` | utility (pure) | transform | `src/features/auth/model.ts` (pure helper module, e.g. `resolveDisplayName`) | exact |
| `src/features/boards/types.ts` | model/type | — | `src/lib/server/session.ts` (`SessionPayload`/`SessionRecord` type + guard pattern) | role-match |
| `src/components/layout/sidebar.tsx` | component | UI state | `app/(dashboard)/layout.tsx` (header composition, `useState` styling conventions) | partial-match |
| `src/components/ui/toast/toast.tsx` (new primitive) | component (UI primitive) | UI state | `src/components/ui/modal/modal.tsx` (Base UI wrapper composition pattern: Root/Trigger/Content sub-components, `cn`, `ClassNameProp`) | role-match |
| `app/(dashboard)/boards/page.tsx` (filled in) | page (Server Component) | request-response / redirect | `app/(dashboard)/layout.tsx` (`verifySession()` + `redirect()` shape) | role-match |
| `app/(dashboard)/boards/[boardId]/page.tsx` (filled in) | page (Server Component) | request-response / redirect | `app/(dashboard)/layout.tsx` | role-match |

## Pattern Assignments

### `app/api/boards/route.ts` (route, request-response) — and every other `app/api/boards/**/route.ts`

**Analog:** `src/features/theme/actions.ts` (`updateThemeAction`) — same `verifySession()` → validate → `externalApi` call → map-error shape, only the transport differs (Route Handler vs Server Action). 02-RESEARCH.md's own Pattern 1 already gives a full worked Route Handler example built directly from this analog; reuse it verbatim as the template.

**Auth/session-derivation pattern** (`src/features/theme/actions.ts:30-51`):
```typescript
export const updateThemeAction = async (theme: Theme): Promise<UpdateThemeResult> => {
    const record = await verifySession();
    if (!record) {
        return { status: "error" };
    }
    const parsed = themeSchema.safeParse(theme);
    if (!parsed.success) {
        return { status: "error" };
    }
    const { error } = await externalApi.PUT("/users/me/theme", {
        params: { query: { userId: record.id } },
        body: { theme: parsed.data },
    });
    ...
```

**Route Handler shape** (02-RESEARCH.md Pattern 1, already fully worked for `GET`/`POST /boards`):
```typescript
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

export const GET = async () => {
    const record = await verifySession();
    if (!record) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }
    const { data, error } = await externalApi.GET("/boards", {
        params: { query: { userId: record.id } },
    });
    if (error !== undefined) {
        return NextResponse.json({ message: "Failed to load boards" }, { status: 502 });
    }
    return NextResponse.json(data);
};
```

**Critical rule (V4 Access Control):** `userId` is NEVER read from the request — always `record.id` from `verifySession()`. Never accept a client-supplied `userId` even though the OpenAPI contract names it as a query param.

**`externalApi` import boundary:** `externalApi` (from `src/lib/server/server-client.ts`) carries `import "server-only"` — confine its usage to `app/api/boards/**/route.ts` files only. `src/features/boards/api/boards-client.ts` (the client fetch wrapper) must NEVER import from `src/lib/server/`.

---

### `src/features/boards/hooks/use-boards.ts` (hook, CRUD-read)

**No in-repo TanStack Query analog exists** — this is the first data-fetching hook in the codebase (confirmed: `@tanstack/react-query` is installed per package.json but has zero existing `useQuery`/`useMutation` call sites). Use 02-RESEARCH.md's own fully-worked Pattern 2 verbatim:
```typescript
import { useQuery } from "@tanstack/react-query";
import type { Board } from "@/features/boards/types";

const fetchBoards = async (): Promise<Board[]> => {
    const response = await fetch("/api/boards");
    if (!response.ok) {
        throw new Error("Failed to load boards");
    }
    return response.json() as Promise<Board[]>;
};

export const useBoards = () =>
    useQuery({ queryKey: ["boards"], queryFn: fetchBoards });
```

---

### `src/features/boards/hooks/use-update-board.ts` (hook, CRUD-optimistic)

**No in-repo optimistic-mutation analog** (D-15 explicitly establishes this as the project's first `onMutate`/`onError` precedent). Use 02-RESEARCH.md Pattern 3 verbatim — snapshot in `onMutate`, apply optimistically, restore in `onError`, invalidate in `onSettled`. **Do not omit the required `version` field** (Pitfall 1) — `UpdateBoardRequestDTO` requires it; the mutation input type must carry the board's current `version` from the `useBoards()` cache entry being renamed.

```typescript
type UpdateBoardInput = { boardId: string; name: string; version: number };
// onMutate: snapshot queryClient.getQueryData<Board[]>(["boards"]), then setQueryData optimistically
// onError: restore snapshot from context
// onSettled: invalidateQueries(["boards"])
```

---

### `src/features/boards/components/add-board-modal.tsx` / `edit-board-modal.tsx` (component, form/request-response)

**Analog (form structure):** `src/features/auth/components/sign-up-form.tsx` — RHF + `zodResolver` + `TextField` composition, `mode: "onTouched"`, error-message merge precedence (client RHF error takes priority over server error for the same field).

**Analog (modal composition):** `src/components/ui/modal/modal.tsx` — `Modal.Root`/`Modal.Trigger`/`Modal.Content`/`Modal.Title`/`Modal.Description`/`Modal.Footer`/`Modal.Close`. Note Modal has no `isLoading` prop of its own — pass `isDismissableOnBackdropClick={!isLoading}` and guard `onOpenChange` to ignore close requests while submitting (documented directly in `modal.tsx:39-46`).

**Dynamic column-name row list (add-board-modal only):** use `useFieldArray` — 02-RESEARCH.md's Code Examples section gives the full worked schema:
```typescript
const { control, handleSubmit } = useForm<CreateBoardInput>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { name: "", columns: [{ name: "" }, { name: "" }, { name: "" }] },
});
const { fields, append, remove } = useFieldArray({ control, name: "columns" });
```

**Field error pattern** (`sign-up-form.tsx:132-141`):
```typescript
const emailErrorMessage =
    errors.email?.message ?? (state.status === "error" ? state.fieldErrors?.email : undefined);
```

---

### `src/features/boards/components/delete-board-confirm.tsx` (component, confirm modal)

**Analog:** `src/components/ui/modal/modal.tsx` composition, with `Modal.Footer`'s right-aligned button-row pattern (`modal.tsx:139-148`) holding "Delete Board" (`Button variant="destructive"`) / "Keep Board" (`Button variant="secondary"`) per UI-SPEC's copy contract. No RHF needed — this is a pure confirm/cancel action pair, not a form.

---

### `src/components/layout/sidebar.tsx` (component, UI state)

**Analog:** `app/(dashboard)/layout.tsx` for the header/flex composition conventions (`flex items-center justify-between`, token-driven `className`s) and DEFAULTS.md C-009's already-locked decision: plain `useState` for collapsed/expanded, no persistence, no state library.

**Kebab menu composition on each `BoardCard` row — Common Pitfall 3 (critical):** `Dropdown` wraps Base UI `Select` (a "pick one value" component), not a menu. Compose the trigger from `Dropdown.Trigger` + `IconButton` (icon-only, fixed "⋮" glyph via `render`, never `Select.Value`), and reset the underlying `Select` value after each action fires so nothing renders as "selected" between openings.

**Dropdown primitive reference** (`src/components/ui/dropdown/dropdown.tsx`):
```typescript
export const Dropdown = { Root, Trigger, Content, Item };
// Root: <Select.Root disabled={isDisabled || isLoading}>
// Item: <Select.Item value={value} disabled={isDisabled}>
```

---

### `src/components/ui/toast/toast.tsx` (new primitive)

**Analog:** `src/components/ui/modal/modal.tsx`'s Base UI wrapper-composition shape — a compound object of sub-components (`Root`/`Trigger`/`Content`/...), each a thin wrapper over the Base UI part with `cn()`-merged Tailwind classes and `ClassNameProp`. Apply the same pattern to `Toast.Provider`/`Toast.Viewport`/`Toast.Root` per Base UI's documented API (02-RESEARCH.md's Don't Hand-Roll table, `useToastManager()` for imperative `add()`/`close()`).

```typescript
import { Toast } from "@base-ui/react/toast";
const toastManager = Toast.createToastManager();
toastManager.add({ title: "Couldn't rename board", description: "Try again." });
```

Panel styling: reuse `Modal.Content`'s `bg-bg-surface`/`shadow-lg`/`rounded-lg` treatment (UI-SPEC Interaction Notes → Toast placement/behavior) — no new visual tokens needed.

---

### `app/(dashboard)/boards/page.tsx` / `[boardId]/page.tsx` (page, Server Component)

**Analog:** `app/(dashboard)/layout.tsx` — `const record = await verifySession(); if (!record) { redirect(ROUTE.SIGN_IN); }` shape. For D-08/D-10/D-11's auto-select/empty-state redirect logic, 02-RESEARCH.md's Open Question 3 leaves Server Component `redirect()` vs. client-side `useEffect` to plan-time judgment — the Server Component path is more consistent with this existing layout precedent.

```typescript
// app/(dashboard)/layout.tsx:16-21 pattern
const identity = await verifySession();
if (!identity) {
    redirect(ROUTE.SIGN_IN);
}
```

---

### Prerequisite PC-03: `src/lib/server/cookies/theme-cookie.ts` / `upstream-cookie.ts` (factory-namespaced relocation)

**Analog for the factory shape:** `src/lib/server/session.ts`'s `createSessionService(secret)` — returns `{ create, verify, verifyToken, destroy }`. Apply the same factory-object shape to `themeCookie` (`{ read, write }`) and `upstreamCookie` (`{ extract, toHeader }`), replacing the current flat function exports in `theme.ts`/`session-cookie.ts`.

**Current flat exports being relocated** (`src/lib/server/theme.ts:35-58`):
```typescript
export const readThemeCookie = async (): Promise<Theme | null> => { ... };
export const writeThemeCookie = async (theme: Theme): Promise<void> => { ... };
```
becomes `themeCookie.read()` / `themeCookie.write(theme)`.

**Current flat exports being relocated** (`src/lib/server/session-cookie.ts:18-43`):
```typescript
export const extractUpstreamSessionId = (response: Response): string | null => { ... };
export const toUpstreamCookieHeader = (jsessionId: string): string => `${UPSTREAM_SESSION_COOKIE_NAME}=${jsessionId}`;
```
becomes `upstreamCookie.extract(response)` / `upstreamCookie.toHeader(jsessionId)`.

---

### Prerequisite PC-04: `src/features/auth/actions/{sign-in,sign-up,sign-out}.ts` (split from flat `actions.ts`)

**Analog:** the existing flat `src/features/auth/actions.ts` itself — each exported action (`signInAction`, `signUpAction`, `signOutAction`) becomes its own file, each retaining its own `"use server"` directive and the `no-restricted-syntax` eslint-disable comment for `useActionState`'s positional-argument contract (`actions.ts:47`). `action-state.ts` stays at the feature root (shared type, not an action).

---

## Shared Patterns

### `userId` server-derivation (never client-supplied)
**Source:** `src/features/theme/actions.ts:31-34`, `src/lib/server/dal.ts:19`
**Apply to:** every `app/api/boards/**/route.ts` handler
```typescript
const record = await verifySession();
if (!record) { /* 401 */ }
// always: params: { query: { userId: record.id } }
```

### `externalApi` server-only boundary
**Source:** `src/lib/server/server-client.ts:1,45` (`import "server-only"`)
**Apply to:** all Route Handlers — `externalApi` must never be imported by `src/features/boards/api/boards-client.ts` or any client component.

### Optimistic mutation lifecycle (onMutate/onError/onSettled)
**Source:** 02-RESEARCH.md Pattern 3 (ADR tech/0002-mandated, no in-repo precedent yet — this phase establishes it)
**Apply to:** `use-update-board.ts` now; every future column/task/subtask mutation (Phases 3-4) follows the same shape.

### Modal composition (Root/Trigger/Content/Title/Description/Footer/Close)
**Source:** `src/components/ui/modal/modal.tsx:156`
**Apply to:** `add-board-modal.tsx`, `edit-board-modal.tsx`, `delete-board-confirm.tsx`

### RHF + Zod form pattern (mode: "onTouched", zodResolver, TextField)
**Source:** `src/features/auth/components/sign-up-form.tsx:71-79, 132-141`
**Apply to:** `add-board-modal.tsx` (+ `useFieldArray` for column rows), `edit-board-modal.tsx`

### `ProblemDetail`/`PROBLEM_CODE` error parsing (if board errors match the shape)
**Source:** `src/lib/core/api-contract/problem-detail.ts:9-81`
**Apply to:** Route Handler error-mapping — verify at Wave 0 (per 02-RESEARCH.md Open Question 2) whether board 4xx/5xx bodies actually match this shape before reusing `parseProblemDetail` verbatim; otherwise define a board-specific fallback in the Route Handler.

### Route/path constants (`ROUTE` enum-like const)
**Source:** `src/lib/core/routing/routes.ts:16-23`
**Apply to:** any new board-detail path helper (mirrors the existing `boardDetail(boardId)` helper already present at `routes.ts:31`, reusable as-is for BOARD-03/04/05 navigation).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/features/boards/hooks/use-boards.ts`, `use-board-full.ts` | hook | CRUD-read | First TanStack Query hooks in the codebase — no existing `useQuery` call site anywhere; must follow 02-RESEARCH.md's own worked example instead of an in-repo analog. |
| `src/features/boards/hooks/use-create-board.ts` | hook | multi-step CRUD | No existing client-orchestrated multi-request mutation exists in-repo; follow 02-RESEARCH.md's Code Examples section (client-orchestrated create) and the architecture diagram's sequencing rules directly. |
| `app/api/boards/**/route.ts` (all four) | route | request-response | No live Route Handler exists in this codebase — the only precedent (`app/api/auth/signin/route.ts`) was deleted in plan 01-33. Built from `updateThemeAction`'s pattern relocated into Route Handler form, not copied from an existing Route Handler file. |

## Metadata

**Analog search scope:** `src/lib/server/`, `src/lib/core/`, `src/features/{auth,theme}/`, `src/components/ui/{modal,dropdown,text-field,button,icon-button}/`, `app/(dashboard)/`
**Files scanned:** 18 read in full this session (theme.ts, session.ts, session-cookie.ts, theme/actions.ts, use-theme-preference.ts, auth/actions.ts, dal.ts, server-client.ts, sign-up-form.tsx, sign-out-button.tsx, modal.tsx, dropdown.tsx, text-field.tsx (partial), problem-detail.ts, routes.ts, layout.tsx, boards/page.tsx)
**Pattern extraction date:** 2026-08-20
