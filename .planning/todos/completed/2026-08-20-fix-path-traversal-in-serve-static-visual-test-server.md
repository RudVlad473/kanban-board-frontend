---
created: 2026-08-20T00:00:00.000Z
title: Fix path traversal in scripts/serve-static.mjs (Playwright visual webServer)
area: tooling
severity: minor
files:
  - scripts/serve-static.mjs
---

## Problem

Flagged by Phase 01's code review (WR-01, `.planning/phases/01-foundation-auth-preferences/01-REVIEW.md`).
`scripts/serve-static.mjs:31` builds file paths via
`path.join(root, decodeURIComponent(pathname))` with no containment check — a request path
containing `../` can escape `root` and read arbitrary files on the machine running the server.

Exposure is low: this server only runs locally/in CI as the Playwright `visual` project's
webServer for Storybook's static build, never deployed or exposed to untrusted traffic. Still a
real bug worth closing.

## Solution

Resolve the joined path and verify it stays within `root` before serving (e.g. compare
`path.resolve(root, safePath)` against `path.resolve(root)` with a trailing separator, refuse
with 403/404 on escape) — the standard static-file-server containment check.
