// A homomorphic mapped type over a recursive property whose type is computed through an interface
// HERITAGE CLAUSE collapses to `unknown`. Declare the same computed type as a direct member instead
// and it resolves; drop the mapped type and it resolves.
interface Internals<out O = unknown> { out: O }
interface Schema { _zod: Internals }
type Out<T extends Schema> = T["_zod"]["out"];
type Prettify<T> = { [K in keyof T]: T[K] } & {};

interface StrInternals extends Internals<string> {}
interface StrSchema extends Schema { _zod: StrInternals }
declare function str(): StrSchema;

interface ArrInternals<T extends Schema> extends Internals<Out<T>[]> {}
interface ArrSchema<T extends Schema = Schema> extends Schema { _zod: ArrInternals<T> }
declare function arr<T extends Schema>(el: T): ArrSchema<T>;

type Shape = Readonly<{ [k: string]: Schema }>;
type OptionalOut = { _zod: { optout: "optional" } };
type InferObjOut<T extends Shape> = Prettify<
  { -readonly [k in keyof T as T[k] extends OptionalOut ? never : k]: Out<T[k]> } & {
    -readonly [k in keyof T as T[k] extends OptionalOut ? k : never]?: Out<T[k]>
  }
>;
interface ObjInternals<S extends Shape> extends Internals<InferObjOut<S>> {}
interface ObjSchema<S extends Shape = Shape> extends Schema { _zod: ObjInternals<S> }
declare function obj<S extends Shape>(shape: S): ObjSchema<S>;

const A = obj({ title: str(), get kids(): ArrSchema<typeof A> { return arr(A); } });
declare const a: Out<typeof A>;
export const p: 1 = a;
