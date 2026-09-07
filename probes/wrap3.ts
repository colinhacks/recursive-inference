// As wrap.ts, but with Zod's real outer layer: a three-parameter $ZodType whose first two args are
// passed as the vestigial `any, any`, with the real types carried only by the third.
interface Internals<out O = unknown, out I = unknown> { out: O; in: I }
interface Schema<O = unknown, I = unknown, Int extends Internals<O, I> = Internals<O, I>> { _zod: Int }
type Out<T> = T extends { _zod: { out: any } } ? T["_zod"]["out"] : unknown;

interface StrInternals extends Internals<string, string> {}
interface StrSchema extends Schema<any, any, StrInternals> {}
declare function str(): StrSchema;

interface ArrInternals<T extends Schema> extends Internals<Out<T>[], Out<T>[]> {}
interface ArrSchema<T extends Schema = Schema> extends Schema<any, any, ArrInternals<T>> {}
declare function arr<T extends Schema>(el: T): ArrSchema<T>;

type Shape = Readonly<{ [k: string]: Schema }>;
interface ObjInternals<S extends Shape> extends Internals<{ -readonly [k in keyof S]: Out<S[k]> }, { -readonly [k in keyof S]: Out<S[k]> }> {}
interface ObjSchema<S extends Shape = Shape> extends Schema<any, any, ObjInternals<S>> {}
declare function obj<S extends Shape>(shape: S): ObjSchema<S>;

const A = obj({ title: str(), get kids(): ArrSchema<typeof A> { return arr(A); } });
declare const a: Out<typeof A>;
export const pa: 1 = a;
