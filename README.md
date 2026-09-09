# Recursive inference fixture

Two versions of the same miniature schema library, cut down from [Zod](https://github.com/colinhacks/zod). They declare the same five recursive schemas and differ only in how the library's types are written.

| | on `main` | with [microsoft/TypeScript#64172](https://github.com/microsoft/TypeScript/pull/64172) |
| --- | --- | --- |
| [`idiomatic.ts`](idiomatic.ts) — written the obvious way | 11 errors | 0 |
| [`shipped.ts`](shipped.ts) — written the way Zod ships | 0 | 0 |

```
npx tsc --noEmit -p tsconfig.json
```

11 errors, all of them in `idiomatic.ts`. Same result on TypeScript 7 (`7.0.0-dev.20260707.2`), on `tsc` 5.9.3 and on 5.5.4, so this is not new and not specific to the Go port.

## Limitations

[`limitations/`](limitations/) isolates each shape the fix does and does not cover, one file per case, with a runner that prints both compilers side by side. [`LIMITATIONS.md`](LIMITATIONS.md) is the full write-up.

The two that matter most for other libraries: **any second overload on the builder disables the fix**, and **a callback property gets nothing where a getter works** — which is the shape Drizzle and TypeORM use for forward references.

## The difference

A schema library expresses a self-referential schema with a getter, because the type is not nameable before it exists:

```ts
const category = object({
  name: string(),
  get subcategories() {
    return array(category);
  },
});
```

`idiomatic.ts` threads the output and input types as ordinary type parameters, constrains against the real base interface, and reads them back with an indexed access:

```ts
export interface $ZodType<out O = unknown, out I = unknown> {
  _zod: $ZodTypeInternals<O, I>;
}
export type output<T extends $ZodType> = T["_zod"]["output"];
export interface $ZodArray<T extends $ZodType = $ZodType> extends $ZodType<output<T>[], input<T>[]> {}
```

That does not survive inference through the getter. Every recursive declaration collapses to `any` and the compiler asks for an annotation the author cannot write, because the annotation is the type being inferred:

```
error TS7022: 'Category' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.
error TS7023: 'subcategories' implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions.
```

`shipped.ts` is the same library with the workarounds Zod uses. The constraint is replaced by a structural type that discards the parameters, and the indexed access becomes a conditional that defers:

```ts
export type SomeType = { _zod: _$ZodTypeInternals };
export type output<T> = T extends { _zod: { output: any } } ? T["_zod"]["output"] : unknown;
export interface $ZodArray<T extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodArrayInternals<T>;
}
```

It compiles. The cost is that the library stops describing its own types: constraints no longer say what a schema is, so misuse is caught later or not at all, and every read of an output type goes through a conditional. Zod carries that substitution at 296 sites.

## probes/

Reductions of the shapes that trigger the failure — heritage threading, indexed access, wrapper chains, discriminated unions, mutual recursion. Several are deliberately broken alternative formulations kept for comparison, so they report unrelated errors on any compiler. Count `TS7022`, `TS7023` and `TS2502` rather than the total:

```
npx tsc --noEmit -p probes/tsconfig.json | grep -cE 'error TS(7022|7023|2502)'
```

76 on TypeScript 7 and 0 with the PR. `tsc` 5.9.3 reports 77, the extra one unrelated to the getter case.
