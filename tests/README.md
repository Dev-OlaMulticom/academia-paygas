# Tests

This directory contains lightweight smoke tests for the parts of the system
that previously had no coverage: shared CASL constants, JWT fallback chain,
and encryption.

## Run

```bash
pnpm test
```

Internally this invokes `tsx --test tests/*.test.ts` so TypeScript source
files are transpiled on the fly — no build step required.

## Why node:test (and not Jest/Vitest)

The repo declared no test framework so far. Adding Vitest/Jest would expand
`package.json` and `node_modules` for a handful of smoke tests. Node 22+
ships a stable built-in test runner, and `tsx` (already in devDependencies)
handles TypeScript transpilation. Total runtime ≈ 0 dependencies added.

## Structure

| File | What it covers |
|------|----------------|
| `casl-shared.test.ts` | Verifies `shared/casl/actions.ts` is consistent. This is the foundation that prevents client/server permission drift. |
| `jwt-fallback.test.ts` | Verifies the `JWT_SECRET` fallback chain in `server/middleware/auth.ts`. |
| `encryption.test.ts` | Verifies the deterministic-key behavior and round-trip via the encryption middleware. |

Add a new test file → it gets picked up automatically by `tsx --test tests/*.test.ts`.
