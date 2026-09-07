// Does a deferred Out<T> survive UNION formation but not ARRAY formation, when threaded through an
// interface heritage clause? Mirrors $ZodOptionalInternals (works) vs $ZodArrayInternals (breaks).
interface Internals<out O = unknown> { out: O }
interface Schema { _zod: Internals }
type Out<T extends Schema> = T["_zod"]["out"];

interface StrInternals extends Internals<string> {}
interface StrSchema extends Schema { _zod: StrInternals }
declare function str(): StrSchema;

// ---- ARRAY wrapper: Out<T>[]
interface ArrInternals<T extends Schema> extends Internals<Out<T>[]> {}
interface ArrSchema<T extends Schema = Schema> extends Schema { _zod: ArrInternals<T> }
declare function arr<T extends Schema>(el: T): ArrSchema<T>;

// ---- UNION wrapper: Out<T> | undefined
interface OptInternals<T extends Schema> extends Internals<Out<T> | undefined> {}
interface OptSchema<T extends Schema = Schema> extends Schema { _zod: OptInternals<T> }
declare function opt<T extends Schema>(el: T): OptSchema<T>;

type Shape = Readonly<{ [k: string]: Schema }>;
interface ObjInternals<S extends Shape> extends Internals<{ -readonly [k in keyof S]: Out<S[k]> }> {}
interface ObjSchema<S extends Shape = Shape> extends Schema { _zod: ObjInternals<S> }
declare function obj<S extends Shape>(shape: S): ObjSchema<S>;

// A: recursion through the ARRAY wrapper
const A = obj({ title: str(), get kids(): ArrSchema<typeof A> { return arr(A); } });
declare const a: Out<typeof A>;
export const pa: 1 = a;

// B: recursion through the UNION wrapper
const B = obj({ title: str(), get kid(): OptSchema<typeof B> { return opt(B); } });
declare const b: Out<typeof B>;
export const pb: 1 = b;
