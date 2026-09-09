# Limitations of the recursive-getter fix

Each file isolates one shape. They are self-contained, dependency-free, and share [`lib.ts`](lib.ts) — a miniature schema library whose shape permits either a schema or a callback returning one, the way Drizzle and TypeORM declare theirs.

```
./run.sh <baseline-tsc> <candidate-tsc>
```

Measured against [`jakebailey/TypeScript@e707147a48`](https://github.com/jakebailey/TypeScript/tree/fix-recursive-getter-resolution) with a baseline built from its merge-base `10404f71a8`:

| fixture | baseline | candidate |
| --- | --- | --- |
| [`00-works-getter`](00-works-getter.ts) | 2 | **0** |
| [`01-works-mutual`](01-works-mutual.ts) | 4 | **0** |
| [`02-limit-overload`](02-limit-overload.ts) | 2 | 2 |
| [`03-limit-callback-property`](03-limit-callback-property.ts) | 2 | 2 |
| [`04-workaround-annotated-callback`](04-workaround-annotated-callback.ts) | 0 | 0 |
| [`05-limit-spread`](05-limit-spread.ts) | 2 | 2 |
| [`06-limit-direct-callback-argument`](06-limit-direct-callback-argument.ts) | 1 | 1 |
| [`07-limit-context-sensitive-sibling`](07-limit-context-sensitive-sibling.ts) | 2 | 2 |

Counts are `TS7022` + `TS7023` ("implicitly has type `any`"). Zero means the recursion resolved.

The `reveal` line at the bottom of each fixture errors on purpose: assigning to `never` makes the compiler print the resolved type in the error message. That is how to tell a genuine resolution from a collapse to `any` — **an error count alone cannot**, because under `noErrorTruncation` the printer renders a recursive type's cycle point as `any` too.

`02` and `03` are the two that matter most for the wider ecosystem. Each is byte-for-byte `00` with a single change: one extra overload, or `get x() {...}` written as `x: () => ...`.

See [`../LIMITATIONS.md`](../LIMITATIONS.md) for the full write-up, including the `TS2589` cases that are out of scope and a proposed generalization with its measured cost.
