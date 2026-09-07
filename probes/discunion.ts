type Prettify<T> = { [K in keyof T]: T[K] } & {};

interface Internals<out O = unknown, out I = unknown> {
  version: string;
  output: O;
  input: I;
}
type InferOut<T> = T extends { _zod: { output: infer O } } ? O : unknown;
type InferIn<T> = T extends { _zod: { input: infer I } } ? I : unknown;
interface StandardProps<In, Out> {
  version: 1;
  vendor: string;
  types?: { input: In; output: Out } | undefined;
}

interface Base<O = unknown, I = unknown, T extends Internals<O, I> = Internals<O, I>> {
  _zod: T;
  "~standard": StandardProps<InferIn<this>, InferOut<this>>;
  optional(): Opt<this>;
}

type Shape = Readonly<{ [k: string]: Base }>;

type OptionalInKeys<S extends Shape> = {
  [K in keyof S]: S[K]["_zod"] extends { optin: "optional" } ? K : never;
}[keyof S];
type RequiredInKeys<S extends Shape> = Exclude<keyof S, OptionalInKeys<S>>;
type InferObjInput<S extends Shape> = Prettify<
  { [K in RequiredInKeys<S>]: S[K]["_zod"]["input"] } & { [K in OptionalInKeys<S>]?: S[K]["_zod"]["input"] }
>;

interface ObjInternals<S extends Shape> extends Internals {
  input: InferObjInput<S>;
  output: Prettify<{ [K in keyof S]: S[K]["_zod"]["output"] }>;
  propValues: Record<string, unknown>;
}
interface Obj<S extends Shape = Shape> extends Base<any, any, ObjInternals<S>> {}

interface OptInternals<T extends Base> extends Internals {
  input: T["_zod"]["input"] | undefined;
  output: T["_zod"]["output"] | undefined;
  optin: "optional";
  optout: "optional";
}
interface Opt<T extends Base = Base> extends Base<any, any, OptInternals<T>> {}

interface DiscriminableInternals<O = unknown, I = unknown> extends Internals<O, I> {
  propValues: Record<string, unknown>;
}
interface Discriminable<O = unknown, I = unknown> extends Base<O, I, DiscriminableInternals<O, I>> {}

interface DUInternals<Opts extends readonly Base[]> extends Internals {
  input: Opts[number]["_zod"]["input"];
  output: Opts[number]["_zod"]["output"];
  propValues: Record<string, unknown>;
}
interface DU<Opts extends readonly Base[] = readonly Base[], D extends string = string>
  extends Base<any, any, DUInternals<Opts>> {}

interface Lit<V extends string> extends Base<any, any, Internals<V, V>> {}

declare function object<S extends Shape>(shape: S): Obj<S>;
declare function literal<const V extends string>(v: V): Lit<V>;
declare function optional<T extends Base>(inner: T): Opt<T>;
declare function discriminatedUnion<Types extends [Discriminable, ...Discriminable[]], D extends string>(
  disc: D,
  options: Types
): DU<Types, D>;

const variantA = object({
  kind: literal("a"),
  get child() {
    return tree.optional();
  },
});
const variantB = object({
  kind: literal("b"),
  get sibling() {
    return tree.optional();
  },
});
const tree = discriminatedUnion("kind", [variantA, variantB]);

type _Tree = { kind: "a"; child?: _Tree | undefined } | { kind: "b"; sibling?: _Tree | undefined };
declare function assignable<A>(): <B extends A>() => void;
assignable<_Tree>()<typeof tree._zod.input>();
assignable<typeof tree._zod.input>()<_Tree>();
