// As wrap.ts, but with Zod's real outer layer: a three-parameter $ZodType whose first two args are
// passed as the vestigial `any, any`, with the real types carried only by the third.
interface Internals<out O = unknown, out I = unknown> { out: O; in: I }
interface StandardProps<In, Out> { version: 1; vendor: string; types?: { input: In; output: Out } | undefined; validate: (v: unknown) => Out }
interface Schema<O = unknown, I = unknown, Int extends Internals<O, I> = Internals<O, I>> {
  _zod: Int;
  "~standard": StandardProps<In2<this>, Out<this>>;
}
type In2<T> = T extends { _zod: { in: any } } ? T["_zod"]["in"] : unknown;
type Out<T> = T extends { _zod: { out: any } } ? T["_zod"]["out"] : unknown;

interface StrInternals extends Internals<string, string> {}
interface StrSchema extends Schema<any, any, StrInternals> {}
declare function str(): StrSchema;

interface ArrInternals<T extends Schema> extends Internals<Out<T>[], Out<T>[]> {}
interface ArrSchema<T extends Schema = Schema> extends Schema<any, any, ArrInternals<T>> {}
declare function arr<T extends Schema>(el: T): ArrSchema<T>;

// classic's shape: _Schema<Int> indexes the internals for the outer args, and the public interface
// inherits from BOTH that and the core interface.
interface _Schema<Int extends Internals = Internals> extends Schema<Int["out"], Int["in"], Int> {}
interface CArrSchema<T extends Schema = Schema> extends _Schema<ArrInternals<T>>, ArrSchema<T> { element: T }
declare function carr<T extends Schema>(el: T): CArrSchema<T>;

type Shape = Readonly<{ [k: string]: Schema }>;
type Prettify<T> = { [K in keyof T]: T[K] } & {};
type OptionalOutSchema = { _zod: { optout: "optional" } };
type InferObjOut<T extends Shape, Extra extends Record<string, unknown>> = Prettify<
        { -readonly [k in keyof T as T[k] extends OptionalOutSchema ? never : k]: T[k]["_zod"]["out"] } & {
          -readonly [k in keyof T as T[k] extends OptionalOutSchema ? k : never]?: T[k]["_zod"]["out"]
        } & Extra
      >;
interface ObjInternals<S extends Shape> extends Internals<InferObjOut<S, {}>, InferObjOut<S, {}>> {}
interface ObjSchema<S extends Shape = Shape> extends Schema<any, any, ObjInternals<S>> {}
declare function obj<S extends Shape>(shape: S): ObjSchema<S>;

const A = obj({ title: str(), get kids(): CArrSchema<typeof A> { return carr(A); } });
declare const a: Out<typeof A>;
export const pa: 1 = a;
