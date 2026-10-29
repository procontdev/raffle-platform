# Agent Development Guide

## Mandatory reading before changes
1. README.md
2. docs/ARCHITECTURE.md
3. docs/MVP-SCOPE.md
4. docs/DATABASE.md
5. The current Prisma schema

## Architecture rules
- Keep the MVP as a modular monolith.
- Never hardcode FAM rules into `packages/raffle-engine`.
- `packages/raffle-engine` must remain pure: no NestJS, Prisma, filesystem, HTTP or OBS imports.
- Preserve organization isolation on tenant-owned data.
- Do not grant DDL permissions to the runtime application user.
- Do not introduce dependencies or features outside MVP scope without explicit approval.
- Never use `Math.random()` for winner selection.
- No destructive deletes for validated/auditable raffle data once those domains are implemented.

## Working protocol
Before coding:
- Inspect the relevant modules and tests.
- State the intended file changes.

After coding:
- Run lint/tests/build for affected workspaces.
- Report every modified file.
- Report commands and results.
- Do not commit unless explicitly instructed.
