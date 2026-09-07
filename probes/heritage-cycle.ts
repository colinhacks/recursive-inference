interface Internals<O> { output: O }
interface Base<O = unknown, I extends Internals<O> = Internals<O>> { _zod: I }
interface Derived<T extends Internals<unknown>> extends Base<T["output"], T> {}

interface StrInternals extends Internals<string> {}
interface Str extends Derived<StrInternals> {}

interface ArrInternals<T extends Base> extends Internals<T["_zod"]["output"][]> {}
interface UniInternals<T extends readonly Base[]> extends Internals<T[number]["_zod"]["output"]> {}

// A: lazy form (what zod ships) -- internals in the argument
interface ArrLazy<T extends Base> extends Base<any, ArrInternals<T>> {}
interface UniLazy<T extends readonly Base[]> extends Base<any, UniInternals<T>> {}
interface JsonLazy extends UniLazy<[Str, ArrLazy<JsonLazy>]> {}
declare const a: JsonLazy["_zod"]["output"];

// B: derived form -- output computed in the heritage type argument
interface ArrDer<T extends Base> extends Derived<ArrInternals<T>> {}
interface UniDer<T extends readonly Base[]> extends Derived<UniInternals<T>> {}
interface JsonDer extends UniDer<[Str, ArrDer<JsonDer>]> {}
declare const b: JsonDer["_zod"]["output"];
