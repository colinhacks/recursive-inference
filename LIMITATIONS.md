# Recursive getter inference: what the current approach does and does not cover

Measured against [`jakebailey/TypeScript@e707147a48`](https://github.com/jakebailey/TypeScript/tree/fix-recursive-getter-resolution) (branch `fix-recursive-getter-resolution`), with a control built from its exact merge-base `10404f71a8`. Every number below comes from binaries built from clean trees on 2026-09-09. Counts are `TS7022` + `TS7023` ("implicitly has type any") unless stated otherwise.

## Status: which of these are fixable

Three of these limitations have since been fixed and the fixes compose on one branch ([`colinhacks/TypeScript@combined`](https://github.com/colinhacks/TypeScript/tree/combined), built on Jake's tip). One is inherent. The rest are unattempted or out of reach by construction.

| limitation | status | branch |
| --- | --- | --- |
| 1 — any second overload disables the fix | **inherent, not fixable** | — |
| 2 — a callback property gets nothing | **fixed** | [`attempt-callback`](https://github.com/colinhacks/TypeScript/tree/attempt-callback) |
| 3 — a spread in the recursive literal | **fixed** | [`attempt-spread`](https://github.com/colinhacks/TypeScript/tree/attempt-spread) |
| 4 — the getter is itself the inference site | inherent | — |
| 5 — a context-sensitive sibling in the same call | unattempted | — |
| 6 — a callback passed directly as an argument | **fixed** | [`attempt-argument`](https://github.com/colinhacks/TypeScript/tree/attempt-argument) |
| 7 — declaration emit still elides the recursion | inherent to `.d.ts` | — |

On the composed branch, fixtures 03, 05 and 06 all go to 0. The Zod corpus stays at 22 with an identical error set, conformance is clean (exit 0, 0 baselines moved), and planted errors at depths 1 through 5 are all rejected — on real Zod, not only the micro-library. Limitation 1 is pinned as inherent by a regression test: removing the single-candidate gate resolves the wrong overload and reports a diagnostic from a rejected candidate.

### A generalization that looked right and was wrong

The limitation 6 fix gates on a call initializer. Limitation 2 is the same shape with an arrow initializer, so relaxing the gate to accept arrows appears to unify them — and it passes the fixtures, the Zod corpus, the soundness repros, the overload discriminator and planted errors at depth.

Full conformance rejects it: 40 baselines move, all contextual typing. The concrete damage is that `f2({ foo: s => s.hmm })` stops reporting an error, because deferring the property's typing destroys the contextual type that gives `s` its `string`.

**Deferring the typing of a function-valued property breaks contextual typing across the language. Deferring only its constraint check does not.** That is why these two limitations need two mechanisms despite looking like one shape.

## What it does

When TypeScript infers a type argument it checks the inferred type against the type parameter's constraint straight away. For a recursive schema that check forces a getter whose type is the thing being inferred, so it cycles and collapses to `any`.

The fix looks ahead. If the inferred type contains an object literal carrying a get-accessor, it skips the constraint check, returns the inferred type, and revalidates the constraint in full later against the final selected signature. Deferral only applies when a call has a single candidate signature, so no discarded overload can emit a diagnostic.

**On Zod with all 296 loose-constraint workarounds removed:** 189 errors become 22, and the 22 are entirely environmental (`TS2591` 10, `TS6133` 6, `TS6196` 5, `TS2304` 1) and appear identically on the control. Nothing in the annotation-demand family remains, no `TS2615`, no `TS2344`. Conformance is clean: exit 0, 63 packages, no baseline movement. Runtime is unaffected — 5,027 tests pass with zero assertion failures.

## The one shape that works

A getter, inside an object literal, passed directly to a **single-signature** generic function as a naked type parameter.

```ts
const Category = object({
  name: string(),
  get subcategories() { return array(Category); },
});
// control: 2 errors. fix: 0. resolves to { name: string; readonly subcategories: ...[]; }
```

Mutual recursion in the same shape works too:

```ts
const User = object({ name: string(), get posts() { return array(Post); } });
const Post = object({ title: string(), get author() { return User; } });
// control: 4 errors. fix: 0.
```

Everything below is outside that shape.

---

## Limitation 1 — any second overload disables the fix

**The largest ecosystem limitation.** Deferral is gated on a call having exactly one candidate signature. Add a second overload and the gate closes.

```ts
declare function object<S extends Shape>(shape: S): Schema<...>;
declare function object<S extends Shape>(name: string, shape: S): Schema<...>;   // this line is the whole problem

const Category = object({
  name: string(),
  get subcategories() { return array(Category); },
});
```

| | control | fix |
| --- | --- | --- |
| single signature | 2 | **0** |
| same code, one extra overload | 2 | **2** |

**The gate is load-bearing. Removing it is unsound.** Deferral is gated on `len(s.candidates) == 1` in `chooseOverload`. Removing that gate does make the overloaded fixture resolve, Zod's corpus stays at 22, and full conformance stays clean — but conformance does not cover the case that matters:

```ts
declare function object<S extends Record<string, Schema<any>>>(shape: S): { tag: "strict" };
declare function object<S extends Record<string, unknown>>(shape: S): { tag: "loose" };

const tree = object({ get bad() { return 42; } });
const which: "loose" = tree.tag;   // { bad: number } is not a Record<string, Schema<any>>
```

Stock TypeScript and the fix both select `"loose"` correctly. With the gate removed, `"strict"` is selected and an error is reported from a candidate that should have been rejected — exactly the failure RyanCavanaugh identified in the original pull request.

The existing rejected-overload tests disambiguate their signatures with a string-literal argument, so the constraint is never the deciding factor there and they do not catch this. A regression test pinning it is on [`colinhacks/TypeScript@recursive-getter-limits`](https://github.com/colinhacks/TypeScript/tree/recursive-getter-limits).

Overloaded callable interfaces behave the same way. This is not an edge case in the ecosystem: a builder with an optional-config or optional-name overload is a very common API shape, and every one of them gets nothing from the fix. Zod is on the right side of this only because `z.object` has a single signature.

## Limitation 2 — a callback property gets nothing; only get-accessors are recognized

**Fixed** on [`attempt-callback`](https://github.com/colinhacks/TypeScript/tree/attempt-callback) (68 lines in `inference.go`): a function-valued property whose un-annotated body names a declaration still being resolved is treated like a getter for the constraint check only. Its contextual typing is untouched, which is what keeps the fix sound. Fixture 03 goes 2 → 0.

The look-ahead tests one thing: does this object literal have a property flagged as a get-accessor. A property holding a function is invisible to it, even though it expresses the identical idea — a body whose type is computed later.

Same library, same recursion, same meaning. Only the syntax differs:

```ts
// WORKS under the fix
const Category = object({
  name: string(),
  get subcategories() { return array(Category); },
});

// FAILS, on both compilers
const Category = object({
  name: string(),
  subcategories: () => array(Category),
});
```

| | control | fix |
| --- | --- | --- |
| getter form | 2 | **0** — resolves to `{ name: string; readonly subcategories: ...[]; }` |
| callback form | 2 | **2** — resolves to `any` |
| callback with a hand-written return type | 0 | 0 |

The third row is the workaround users pay today, and it is exactly what Drizzle documents: `references((): AnyPgColumn => employees.id)`. Libraries that use a callback for forward references — Drizzle, TypeORM, TanStack-style builders — are unaffected by the fix and keep paying that tax at every call site.

## Limitation 3 — a spread in the recursive literal

**Fixed** on [`attempt-spread`](https://github.com/colinhacks/TypeScript/tree/attempt-spread) (~40 lines): the spread copy of a getter resolves lazily instead of forcing it. Fixture 05 goes 2 → 0. One residual hole needs both an inline object-literal spread and a getter overriding a same-named property from it; hoisting the source or using distinct names works.

```ts
const base = z.object({ id: z.string() });
const Node = z.object({
  ...base.shape,
  get children() { return z.array(Node); },
});
```

| | control | fix |
| --- | --- | --- |
| minimal repro | 4 | **4** |
| against real Zod | fails | **fails** |

**Not a regression** — this is broken on shipped Zod today as well, with the workarounds still in place, collapsing to `any` there too. Neither the workarounds nor the fix reach it. It matters because spreading is the pattern Zod's own docs recommend for extending a schema, so combining extension with recursion stays impossible.

## Limitation 4 — the getter is itself the inference site

When the getter *is* the property being inferred for, rather than sitting inside a literal that is inferred as a whole:

```ts
define({ name: "x", get fields() { return ...; } })   // fails: 2 on control, 2 on the fix
```

## Limitation 5 — a context-sensitive sibling in the same call

**Unattempted, and orthogonal to the other fixes.** Measured on the composed branch, the recursive member fails here in all three forms — a getter, a `lazy(...)` call property, and a callback property — and a named function expression fails the same way. Annotating the sibling's parameter fixes all three. So this is a property of the call's argument list, not of how the recursive member is written: context-sensitive arguments are inferred in a second pass and the deferral does not survive it.

An un-annotated callback elsewhere in the same call partially defeats it.

```ts
object(shape, (code) => {})       // partial: 4 on control, 2 on the fix
object(shape, (code: number) => {})  // annotating the parameter restores it
```

An un-annotated method sitting beside the getter inside the same literal behaves the same way. `defineComponent({ props, setup(p) {} })` is this shape. A chained `.refine((v) => ...)` *after* the call is fine.

## Limitation 6 — a callback passed directly as an argument

**Fixed** on [`attempt-argument`](https://github.com/colinhacks/TypeScript/tree/attempt-argument) (75 lines): a call-initialized property whose callback names a declaration under resolution is typed lazily through its own symbol, as an accessor already is. Fixture 06 goes 3 errors → 1 (the deliberate reveal). This is the `z.lazy` shape, so the documented Zod idiom now infers. The bare `const Self = lazy(() => Self)` is still out of reach — there is no position between the variable and the callback where a lazy type can live.

The look-ahead walks the properties of object literals. A callback passed as the whole argument is never examined.

```ts
const Category = object({
  name: string(),
  subcategories: lazy(() => array(Category)),   // control 1, fix 1
});
```

This is why `z.lazy` gets no benefit and cannot be deprecated. An un-annotated `z.lazy(() => Self)` still fails under the fix, and three internal Zod callers construct a lazy node as a value where a getter is not possible.

## Limitation 7 — declaration emit still elides the recursion

Under both compilers, declaration emit writes `Out</*elided*/ any>` at each recursive point, with no error. Pre-existing and not a regression, but it means a library shipping `.d.ts` files loses the recursive type at the package boundary regardless.

---

## Out of scope: the `TS2589` family

Two open Zod issues from lo1tuma are about type-level recursion hitting the instantiation depth limiter, which is a different subsystem from constraint deferral. The fix helps only where deferral incidentally avoids the instantiation work that would have tripped the limiter.

| repro | control | fix |
| --- | --- | --- |
| [#6015](https://github.com/colinhacks/zod/issues/6015) `type Field = ZodObject<{ [k: string]: Field }>` | `TS2589` | **clean** |
| [#6015](https://github.com/colinhacks/zod/issues/6015) `type Field = ZodString \| ZodObject<{ [k: string]: Field }>` | `TS2589` | **clean** |
| [#6015](https://github.com/colinhacks/zod/issues/6015) `type Field = ZodUnion<[ZodString, Field]>` | `TS2589` | `TS2589` |
| [#4611](https://github.com/colinhacks/zod/issues/4611) `type Foo = $ZodPipe<Bar, $ZodTransform>` | `TS2589` | `TS2589` |
| [#4611](https://github.com/colinhacks/zod/issues/4611) control `type Foo2 = $ZodArray<Bar2>` | `TS2589` on the workaround-free branch | **clean** |

Two of the four reported cases are fixed, including the one lo1tuma calls the realistic case, and that holds on shipped Zod as well as on the workaround-free branch. The `ZodUnion` and `$ZodPipe` forms are untouched, so #6015 cannot be closed on the strength of this. Modifying the deferral is not a route to them.

---

## A generalization worth considering

The boundary between limitation 2 and the working case is syntactic, not semantic. `get x() { ... }` and `x: () => ...` both mean "a body whose type is computed later", and nothing about the underlying cycle differs. The look-ahead enumerates `SymbolFlagsGetAccessor` and nothing else, so it sees one and not the other.

The generalization: recognize a deferred position by **whether its body references the declaration currently under inference** — the actual cycle — rather than by which syntax form it uses. That would cover getters, callback properties, methods, and eventually a directly-passed callback argument.

**This was prototyped, and the naive version is not sufficient.** Widening the predicate to accept any un-annotated function-expression property resolves the callback case correctly — the implicit-any errors disappear and the type resolves to `{ name: string; subcategories: ...[]; }` — and leaves Zod's corpus unchanged at 22. But it moves two conformance baselines:

| baseline | change |
| --- | --- |
| `contextualTypesNegatedTypeLikeConstraintInGenericMappedType2` | `(_: any) => string` becomes `(_: any) => "fail"`; the literal is no longer widened |
| `wrappedAndRecursiveConstraints4` | `TS2345` becomes `TS2344`, and the result type becomes the unconstrained argument type |

The second is the significant one: the call's result is computed from an argument that fails its constraint. The error is still reported, but the resulting type is wrong.

The obvious guard — defer only a callback whose type is still unresolved — makes conformance clean again **and removes the benefit with it**, returning the callback case to failing. So that guard is not the answer. What separates the recursive case from those two baselines is precisely whether the callback body references the declaration being inferred, and that test is the part that would need writing.

**The narrowness of the getter-only predicate is load-bearing**, not conservatism. Any generalization has to carry a real cycle test.

---

## Reproducing

```bash
git clone https://github.com/microsoft/TypeScript.git ts && cd ts
git remote add jakebailey https://github.com/jakebailey/TypeScript.git && git fetch jakebailey
git worktree add --detach ../ts-fix   e707147a48
git worktree add --detach ../ts-base  10404f71a8    # the merge-base
(cd ../ts-fix/tsc  && go build -o /tmp/fix-tsc  ./cmd/tsc)
(cd ../ts-base/tsc && go build -o /tmp/base-tsc ./cmd/tsc)
```

Then compile any fixture with each binary: `/tmp/fix-tsc --noEmit --ignoreConfig --strict <file>.ts`.

### Three traps that produced wrong answers in this investigation

- **`tsgo` refuses to type-check when a tsconfig is present and files are named on the command line** (`TS5112`) and returns zero errors, so a broken command looks like a clean pass. Use `-p <tsconfig>`, or `--ignoreConfig` with explicit flags, and confirm the command can report an error before trusting any zero.
- **Never judge a result from an error count alone.** Under `noErrorTruncation` the printer renders a recursive type's cycle point as `any`, textually identical to a genuine `any[]`. Prove resolution with a strict equality assertion and with planted errors at depth, not with a printed type.
- **A glob like `src/**/*.ts` sweeps in scratch files.** Two byte-identical compilers once reported 490 and 724 errors purely because probe files were on disk. Confirm the loaded file count before quoting a number.
